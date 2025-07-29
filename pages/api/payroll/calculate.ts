import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

const SALARIO_MINIMO = 11903.13
const RAP_PORCENTAJE = 0.015

function calcularISR(salarioBase: number): number {
  const ingresoAnual = salarioBase * 12
  const rentaNeta = ingresoAnual - 40000
  if (rentaNeta <= 217493.16) return 0
  if (rentaNeta <= 494224.40) return ((rentaNeta - 217493.16) * 0.15) / 12
  if (rentaNeta <= 771252.37) return (41610.33 + (rentaNeta - 494224.40) * 0.20) / 12
  return (96916.30 + (rentaNeta - 771252.37) * 0.25) / 12
}

function calcularHorasTrabajadas(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diffMs = end.getTime() - start.getTime()
  return Math.max(0, diffMs / (1000 * 60 * 60))
}

function calcularDeducciones(salarioBase: number, aplicarDeducciones: boolean = false) {
  if (!aplicarDeducciones) return { ihss: 0, rap: 0, isr: 0 }
  
  const ihss = Math.min(salarioBase, SALARIO_MINIMO) * 0.05
  const rap = Math.max(0, salarioBase - SALARIO_MINIMO) * RAP_PORCENTAJE
  const isr = calcularISR(salarioBase)
  
  return { ihss, rap, isr }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { periodo, quincena } = req.body
    
    if (!periodo || !quincena) {
      return res.status(400).json({ error: 'Periodo y quincena son requeridos' })
    }
    
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    
    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }

    const supabase = createAdminClient()
    
    // Calcular fechas del período
    const [year, month] = periodo.split('-').map(Number)
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = quincena === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`
    const aplicarDeducciones = quincena === 2

    console.log('📊 Calculando nómina:', { periodo, quincena, fechaInicio, fechaFin })

    // Obtener empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, base_salary, status')
      .eq('status', 'active')

    if (empError) {
      console.error('❌ Error obteniendo empleados:', empError)
      return res.status(500).json({ error: 'Error obteniendo empleados' })
    }

    // Obtener registros de asistencia del período
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', fechaInicio)
      .lte('date', fechaFin)

    if (attError) {
      console.error('❌ Error obteniendo registros de asistencia:', attError)
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    console.log(`📈 Empleados activos: ${employees.length}`)
    console.log(`📈 Registros de asistencia: ${attendanceRecords.length}`)

    // Calcular nómina para cada empleado
    const planilla = employees.map(emp => {
      const registros = attendanceRecords.filter(record => 
        record.employee_id === emp.id
      )

      // Calcular horas trabajadas
      const horas = registros.reduce((sum, record) => {
        const horasDia = calcularHorasTrabajadas(record.check_in, record.check_out)
        return sum + horasDia
      }, 0)

      const dias = registros.length
      const salarioBase = emp.base_salary || 15000
      const salarioHora = salarioBase / 30 / 8
      const salarioQuincenal = salarioHora * horas

      // Calcular deducciones
      const { ihss, rap, isr } = calcularDeducciones(salarioBase, aplicarDeducciones)
      const totalDeducciones = ihss + rap + isr
      const pagoNeto = salarioQuincenal - totalDeducciones

      return {
        employee_id: emp.id,
        nombre: emp.name,
        dni: emp.dni,
        cargo: 'Empleado',
        salarioMensual: salarioBase,
        dias,
        horas,
        salarioQuincenal,
        ihss,
        rap,
        isr,
        deducciones: totalDeducciones,
        neto: pagoNeto
      }
    })

    // Guardar en payroll_records
    const payrollRecords = planilla.map(item => ({
      employee_id: item.employee_id,
      period_start: fechaInicio,
      period_end: fechaFin,
      period_type: 'biweekly',
      base_salary: item.salarioMensual,
      gross_salary: item.salarioQuincenal,
      income_tax: item.isr,
      social_security: item.ihss,
      professional_tax: item.rap,
      total_deductions: item.deducciones,
      net_salary: item.neto,
      days_worked: item.dias,
      status: 'draft'
    }))

    const { error: saveError } = await supabase
      .from('payroll_records')
      .upsert(payrollRecords, { 
        onConflict: 'employee_id,period_start,period_end',
        ignoreDuplicates: false 
      })

    if (saveError) {
      console.error('❌ Error guardando registros de nómina:', saveError)
      return res.status(500).json({ error: 'Error guardando nómina' })
    }

    console.log('✅ Nómina calculada y guardada exitosamente')

    return res.status(200).json({
      message: 'Nómina calculada exitosamente',
      periodo,
      quincena,
      empleados: planilla.length,
      totalNeto: planilla.reduce((sum, emp) => sum + emp.neto, 0),
      planilla
    })

  } catch (error) {
    console.error('❌ Error general en cálculo de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'
    })
  }
} 