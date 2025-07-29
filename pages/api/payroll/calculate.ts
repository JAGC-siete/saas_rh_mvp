import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

const SALARIO_MINIMO = 11903.13
const IHSS_FIJO = 595.16
const RAP_PORCENTAJE = 0.015

function calcularISR(salarioBase: number): number {
  // Simulación: ISR = 0 para la mayoría, puedes ajustar aquí
  return 0;
}

function calcularIHSS(salarioBase: number): number {
  return salarioBase > SALARIO_MINIMO ? IHSS_FIJO : salarioBase * 0.05;
}

function calcularRAP(salarioBase: number): number {
  return Math.max(0, salarioBase - SALARIO_MINIMO) * RAP_PORCENTAJE;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validar autenticación
    const supabase = createClient(req, res)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verificar permisos del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['company_admin', 'hr_manager', 'super_admin'].includes(userProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { periodo, quincena, incluirDeducciones } = req.body
    if (!periodo || !quincena) {
      return res.status(400).json({ error: 'Periodo y quincena son requeridos' })
    }
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }
    const [year, month] = periodo.split('-').map(Number)
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = quincena === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`
    // El admin puede forzar deducciones en cualquier quincena
    const aplicarDeducciones = !!incluirDeducciones

    // Obtener empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status')
      .eq('status', 'active')
    if (empError) {
      return res.status(500).json({ error: 'Error obteniendo empleados' })
    }

    // Obtener registros de asistencia del período
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select('employee_id, date, check_in, check_out')
      .gte('date', fechaInicio)
      .lte('date', fechaFin)
    if (attError) {
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    // Filtrar empleados con al menos un día de asistencia completa
    const empleadosConAsistencia = employees.filter(emp =>
      attendanceRecords.some(record => record.employee_id === emp.id && record.check_in && record.check_out)
    )

    // Calcular planilla solo para empleados con asistencia
    const planilla = empleadosConAsistencia.map(emp => {
      const registros = attendanceRecords.filter(record => 
        record.employee_id === emp.id && record.check_in && record.check_out
      )
      const days_worked = registros.length
      const base_salary = Number(emp.base_salary) || 0
      const total_earnings = base_salary / 2
      let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0
      let notes_on_ingress = ''
      let notes_on_deductions = ''

      if (aplicarDeducciones) {
        IHSS = calcularIHSS(base_salary)
        RAP = calcularRAP(base_salary)
        ISR = calcularISR(base_salary)
        total_deductions = IHSS + RAP + ISR
        total = total_earnings - total_deductions
      } else {
        total = total_earnings
      }

      // Notas automáticas
      if (days_worked < (quincena === 1 ? 15 : ultimoDia - 15)) {
        notes_on_ingress = `Faltaron ${quincena === 1 ? 15 : ultimoDia - 15 - days_worked} días de asistencia completa.`
      }
      if (IHSS > 1000 || RAP > 1000 || ISR > 1000) {
        notes_on_deductions = 'Deducción atípica, revisar.'
      }

      return {
        name: emp.name,
        id: emp.dni,
        bank: emp.bank_name || '',
        bank_account: emp.bank_account || '',
        monthly_salary: base_salary,
        days_worked,
        total_earnings,
        IHSS: Math.round(IHSS * 100) / 100,
        RAP: Math.round(RAP * 100) / 100,
        ISR: Math.round(ISR * 100) / 100,
        total_deductions: Math.round(total_deductions * 100) / 100,
        total: Math.round(total * 100) / 100,
        notes_on_ingress,
        notes_on_deductions
      }
    })

    // Guardar en payroll_records (solo campos mínimos)
    const payrollRecords = planilla.map(item => ({
      employee_id: empleadosConAsistencia.find(e => e.dni === item.id)?.id,
      period_start: fechaInicio,
      period_end: fechaFin,
      period_type: 'biweekly',
      base_salary: item.monthly_salary,
      gross_salary: item.total_earnings,
      income_tax: item.ISR,
      social_security: item.IHSS,
      professional_tax: item.RAP,
      total_deductions: item.total_deductions,
      net_salary: item.total,
      days_worked: item.days_worked,
      status: 'draft',
      notes_on_ingress: item.notes_on_ingress,
      notes_on_deductions: item.notes_on_deductions
    }))

    const { error: saveError } = await supabase
      .from('payroll_records')
      .upsert(payrollRecords, { 
        onConflict: 'employee_id,period_start,period_end',
        ignoreDuplicates: false 
      })
    if (saveError) {
      return res.status(500).json({ error: 'Error guardando nómina' })
    }

    return res.status(200).json({
      message: 'Nómina calculada exitosamente',
      periodo,
      quincena,
      empleados: planilla.length,
      planilla
    })
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor', message: error.message })
  }
} 