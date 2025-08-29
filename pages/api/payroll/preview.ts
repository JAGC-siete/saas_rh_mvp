import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN REQUERIDA
    const authResult = await authenticateUser(req, res, ['can_generate_payroll'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    
    // Ensure userProfile exists
    if (!userProfile || !userProfile.company_id) {
      return res.status(400).json({ 
        error: 'Invalid user profile',
        message: 'User profile or company ID not found'
      })
    }
    
    const supabase = createClient(req, res)

    console.log('Usuario autenticado para preview de nómina:', { 
      userId: user.id, 
      role: userProfile.role,
      companyId: userProfile.company_id 
    })
    
    // DEBUG: Verificar qué company_id está usando
    console.log('🔍 DEBUG - Company ID del usuario:', userProfile.company_id)
    console.log('🔍 DEBUG - UUID esperado de Paragon:', '00000000-0000-0000-0000-000000000001')
    console.log('🔍 DEBUG - ¿Coinciden?', userProfile.company_id === '00000000-0000-0000-0000-000000000001')

    const { year, month, quincena, tipo } = req.body || {}
    
    // Validaciones
    if (!year || !month || !quincena || !tipo) {
      return res.status(400).json({ error: 'year, month, quincena, y tipo son requeridos' })
    }
    
    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    if (!['CON', 'SIN'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido (debe ser CON o SIN)' })
    }

    // Validar que no sea un período futuro
    const currentDate = new Date()
    const periodDate = new Date(year, month - 1, 1)
    
    if (periodDate > currentDate) {
      return res.status(400).json({ 
        error: 'Período inválido',
        message: 'No se puede generar nómina para períodos futuros'
      })
    }

    // Calcular fechas del período
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = quincena === 1 ? `${year}-${month.toString().padStart(2, '0')}-01` : `${year}-${month.toString().padStart(2, '0')}-16`
    const fechaFin = quincena === 1 ? `${year}-${month.toString().padStart(2, '0')}-15` : `${year}-${month.toString().padStart(2, '0')}-${ultimoDia}`

    // Crear o actualizar corrida de planilla
    const { data: runResult, error: runError } = await supabase.rpc('create_or_update_payroll_run', {
      p_company_uuid: userProfile.company_id,
      p_year: year,
      p_month: month,
      p_quincena: quincena,
      p_tipo: tipo,
      p_user_id: user.id
    })

    if (runError) {
      console.error('Error creando corrida de planilla:', runError)
      return res.status(500).json({ error: 'Error creando corrida de planilla' })
    }

    const runId = runResult

    // Obtener empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status, department_id')
      .eq('status', 'active')
      .eq('company_id', userProfile.company_id)
      .order('name')

    if (empError) {
      console.error('Error obteniendo empleados:', empError)
      return res.status(500).json({ error: 'Error obteniendo empleados' })
    }

    if (!employees || employees.length === 0) {
      return res.status(400).json({ 
        error: 'No hay empleados activos',
        message: 'No se encontraron empleados activos para generar la nómina'
      })
    }
    
    // DEBUG: Verificar cuántos empleados se encontraron
    console.log('🔍 DEBUG - Empleados encontrados:', employees.length)
    console.log('🔍 DEBUG - Primeros 3 empleados:', employees.slice(0, 3).map(emp => ({
      name: emp.name,
      status: emp.status
    })))

    // Obtener registros de asistencia del período
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select('employee_id, date, check_in, check_out, status')
      .gte('date', fechaInicio)
      .lte('date', fechaFin)

    if (attError) {
      console.error('Error obteniendo registros de asistencia:', attError)
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    // Filtrar empleados según criterio de asistencia
    let empleadosParaNomina = employees
    
    if (tipo === 'CON') {
      empleadosParaNomina = employees.filter((emp: any) =>
        attendanceRecords.some((record: any) => 
          record.employee_id === emp.id && 
          record.check_in && 
          record.check_out &&
          record.status !== 'absent')
      )
    }

    if (empleadosParaNomina.length === 0) {
      return res.status(400).json({ 
        error: 'No hay empleados con asistencia',
        message: 'No se encontraron empleados con asistencia completa para el período seleccionado'
      })
    }

    console.log(`Procesando preview de nómina para ${empleadosParaNomina.length} empleados`)
    
    // DEBUG: Verificar el filtro de asistencia
    console.log('🔍 DEBUG - Tipo de nómina:', tipo)
    console.log('🔍 DEBUG - Total registros de asistencia:', attendanceRecords.length)
    console.log('🔍 DEBUG - Empleados después del filtro de asistencia:', empleadosParaNomina.length)

    // Calcular planilla con CÁLCULOS CORRECTOS 2025
    const planilla: any[] = []
    
    for (const emp of empleadosParaNomina) {
      const registros = attendanceRecords.filter((record: any) => 
        record.employee_id === emp.id && 
        record.check_in && 
        record.check_out)
      
      // CALCULAR DÍAS TRABAJADOS EN LA QUINCENA ACTUAL
      const diasQuincena = quincena === 1 ? 15 : ultimoDia - 15
      const days_worked = registros.length
      const days_absent = diasQuincena - days_worked
      
      const base_salary = Number(emp.base_salary) || 0
      
      // CALCULAR SALARIO PROPORCIONAL POR DÍAS TRABAJADOS EN LA QUINCENA
      const salarioProporcional = (base_salary / 30) * days_worked
      const total_earnings = salarioProporcional
      
      let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0

      // APLICAR DEDUCCIONES SOLO UNA VEZ AL MES (en Q2)
      if (quincena === 2) {
        // CÁLCULOS CORRECTOS 2025 - DEDUCCIONES MENSUALES COMPLETAS
        IHSS = Math.min(base_salary, 11903.13) * 0.05  // Deducción mensual completa
        RAP = Math.max(0, base_salary - 11903.13) * 0.015    // Deducción mensual completa
        
        // ISR según tabla MENSUAL de Honduras 2025
        if (base_salary > 21457.76) {
          if (base_salary <= 30969.88) {
            ISR = (base_salary - 21457.76) * 0.15
          } else if (base_salary <= 67604.36) {
            ISR = 1428.32 + (base_salary - 30969.88) * 0.20
          } else {
            ISR = 8734.32 + (base_salary - 67604.36) * 0.25
          }
        }
        
        total_deductions = IHSS + RAP + ISR
        total = total_earnings - total_deductions
      } else {
        // Q1: solo salario proporcional, sin deducciones
        total = total_earnings
      }

      // Crear línea de planilla usando la nueva función
      const { data: lineResult, error: lineError } = await supabase.rpc('insert_payroll_line', {
        p_run_id: runId,
        p_company_uuid: userProfile.company_id,
        p_employee_id: emp.id,
        p_calc_hours: days_worked * 8, // 8 horas por día
        p_calc_bruto: total_earnings,
        p_calc_ihss: IHSS,
        p_calc_rap: RAP,
        p_calc_isr: ISR,
        p_calc_neto: total
      })

      if (lineError) {
        console.error(`Error creando línea para empleado ${emp.name}:`, lineError)
        continue
      }

      planilla.push({
        id: emp.dni,
        name: emp?.name,
        bank: emp.bank_name || '',
        bank_account: emp.bank_account || '',
        department: emp.department_id || 'Sin Departamento',
        monthly_salary: base_salary,
        days_worked,
        days_absent,
        total_earnings,
        IHSS: Math.round(IHSS * 100) / 100,
        RAP: Math.round(RAP * 100) / 100,
        ISR: Math.round(ISR * 100) / 100,
        total_deducciones: Math.round(total_deductions * 100) / 100,
        total: Math.round(total * 100) / 100,
        line_id: lineResult
      })
    }

    console.log(`Preview de nómina generado exitosamente para ${planilla.length} empleados`)

    return res.status(200).json({
      message: 'Preview de nómina generado exitosamente',
      run_id: runId,
      year,
      month,
      quincena,
      tipo,
      empleados: planilla.length,
      totalBruto: planilla.reduce((sum: number, row: any) => sum + row.total_earnings, 0),
      totalDeducciones: planilla.reduce((sum: number, row: any) => sum + row.total_deducciones, 0),
      totalNeto: planilla.reduce((sum: number, row: any) => sum + row.total, 0),
      planilla
    })

  } catch (error) {
    console.error('Error en preview de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
