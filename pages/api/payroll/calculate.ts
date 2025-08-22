import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'

// Constantes para cálculos de nómina
const SALARIO_MINIMO = 11903.13 // Salario mínimo en Honduras
const TOLERANCIA_TARDANZA = 15 // Minutos de tolerancia para tardanza

// Constantes actualizadas para Honduras 2025
const HONDURAS_2025_CONSTANTS = {
  SALARIO_MINIMO: 11903.13,
  IHSS_TECHO: 11903.13,        // Techo IHSS 2025 (EM + IVM)
  IHSS_PORCENTAJE_EMPLEADO: 0.05,  // 5% total (2.5% EM + 2.5% IVM)
  ISR_EXENCION_ANUAL: 40000,   // Deducción médica anual L 40,000
  ISR_BRACKETS_ANUAL: [        // Tabla ANUAL 2025 (SAR)
    { limit: 40000, rate: 0.00, base: 0 },                    // Exento hasta L 40,000
    { limit: 217493.16, rate: 0.15, base: 0 },                // 15%
    { limit: 494224.40, rate: 0.20, base: 26623.97 },         // 20%
    { limit: Infinity, rate: 0.25, base: 81947.97 }           // 25%
  ]
}

interface PlanillaItem {
  id: string
  name: string
  bank: string
  bank_account: string
  department: string
  monthly_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  total_earnings: number
  IHSS: number
  RAP: number
  ISR: number
  total_deductions: number
  total: number
  notes_on_ingress: string
  notes_on_deductions: string
}

// Cálculo de ISR según tabla ANUAL de Honduras 2025
function calcularISR(salarioBase: number): number {
  // Convertir salario mensual a anual
  const salarioAnual = salarioBase * 12
  
  // Aplicar deducción médica anual de L 40,000
  const baseImponible = salarioAnual - HONDURAS_2025_CONSTANTS.ISR_EXENCION_ANUAL
  
  if (baseImponible <= 0) return 0
  
  // Calcular ISR anual usando tabla progresiva
  for (const bracket of HONDURAS_2025_CONSTANTS.ISR_BRACKETS_ANUAL) {
    if (baseImponible <= bracket.limit) {
      const isrAnual = bracket.base + (baseImponible - (bracket.base > 0 ? bracket.limit : 0)) * bracket.rate
      return isrAnual / 12 // Convertir a mensual
    }
  }
  
  return 0
}

function calcularIHSS(salarioBase: number): number {
  // IHSS: 5% del empleado (2.5% EM + 2.5% IVM) con techo L 11,903.13
  const ihssBase = Math.min(salarioBase, HONDURAS_2025_CONSTANTS.IHSS_TECHO)
  return ihssBase * HONDURAS_2025_CONSTANTS.IHSS_PORCENTAJE_EMPLEADO
}

function calcularRAP(salarioBase: number): number {
  // RAP: 1.5% sobre el excedente del salario mínimo
  return Math.max(0, salarioBase - HONDURAS_2025_CONSTANTS.SALARIO_MINIMO) * 0.015
}

// Función para calcular tardanzas basada en horario de Paragon
function calcularTardanzas(registros: any[]): number {
  let tardanzas = 0
  const horaEntrada = 8 // 8:00 AM
  
  registros.forEach((registro: any) => {
    if (registro.check_in) {
      const horaCheckIn = new Date(registro.check_in).getHours()
      const minutosCheckIn = new Date(registro.check_in).getMinutes()
      const minutosTotales = horaCheckIn * 60 + minutosCheckIn
      const horaEntradaMinutos = horaEntrada * 60
      
      if (minutosTotales > horaEntradaMinutos + TOLERANCIA_TARDANZA) {
        tardanzas++
      }
    }
  })
  
  return tardanzas
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 🔒 AUTENTICACIÓN REQUERIDA CON NUEVO HELPER
    const authResult = await authenticateUser(req, res, ['can_generate_payroll'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    console.log('🔐 Usuario autenticado para nómina:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { periodo, quincena, incluirDeducciones, soloEmpleadosConAsistencia = true } = req.body
    
    // Validaciones mejoradas
    if (!periodo || !quincena) {
      return res.status(400).json({ error: 'Periodo y quincena son requeridos' })
    }
    
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato: YYYY-MM)' })
    }
    
    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    // Validar que no sea un período futuro
    const [year, month] = periodo.split('-').map((n: any) => Number(n))
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
    const fechaInicio = quincena === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`
    
    // El admin puede forzar deducciones en cualquier quincena
    const aplicarDeducciones = !!incluirDeducciones

    console.log('📅 Generando nómina para:', {
      periodo,
      quincena,
      fechaInicio,
      fechaFin,
      aplicarDeducciones,
      soloEmpleadosConAsistencia
    })

    // Obtener empleados activos (sin restricción de empresa)
    let employeesQuery = supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status, department_id')
      .eq('status', 'active')
      .order('name')

    // Si el usuario tiene company_id, filtrar por empresa
    if (userProfile?.company_id) {
      employeesQuery = employeesQuery.eq('company_id', userProfile?.company_id)
    }

    const { data: employees, error: empError } = await employeesQuery

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

    // Obtener registros de asistencia del período
    // Nota: attendance_records no tiene company_id, se filtra por employee_id
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
    
    if (soloEmpleadosConAsistencia) {
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

    console.log(`👥 Procesando nómina para ${empleadosParaNomina.length} empleados`)

    // Calcular planilla
         const planilla: PlanillaItem[] = empleadosParaNomina.map((emp: any) => {
      const registros = attendanceRecords.filter((record: any) => 
        record.employee_id === emp.id && 
        record.check_in && 
        record.check_out)
      
      const days_worked = registros.length
      const days_absent = (quincena === 1 ? 15 : ultimoDia - 15) - days_worked
      const late_days = calcularTardanzas(registros)
      
      const base_salary = Number(emp.base_salary) || 0
      const total_earnings = base_salary / 2 // Salario quincenal
      
      let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0
      let notes_on_ingress = ''
      let notes_on_deductions = ''

      // IMPORTANTE: Las deducciones (IHSS, RAP, ISR) se aplican SOLO en la segunda quincena del mes
      // Primera quincena: solo salario bruto, sin deducciones
      // Segunda quincena: salario bruto - deducciones mensuales
      if (aplicarDeducciones && quincena === 2) {
        // Calcular deducciones mensuales completas
        IHSS = calcularIHSS(base_salary) // Ya es mensual
        RAP = calcularRAP(base_salary)   // Ya es mensual
        ISR = calcularISR(base_salary)   // Ya es mensual
        total_deductions = IHSS + RAP + ISR
        total = total_earnings - total_deductions
        
        notes_on_deductions = `Deducciones aplicadas en Q2: IHSS L.${IHSS.toFixed(2)}, RAP L.${RAP.toFixed(2)}, ISR L.${ISR.toFixed(2)}`
      } else if (quincena === 1) {
        // Primera quincena: sin deducciones
        total = total_earnings
        notes_on_deductions = 'Primera quincena: sin deducciones (se aplican en Q2)'
      } else {
        // Si no se aplican deducciones por configuración
        total = total_earnings
        notes_on_deductions = 'Deducciones no aplicadas por configuración'
      }

      // Notas automáticas mejoradas
      if (days_worked < (quincena === 1 ? 15 : ultimoDia - 15)) {
        notes_on_ingress = `Faltaron ${days_absent} días de asistencia completa.`
      }
      
      if (late_days > 0) {
        notes_on_ingress += ` ${late_days} días con tardanza.`
      }
      
      if (IHSS > 1000 || RAP > 1000 || ISR > 1000) {
        notes_on_deductions = 'Deducción atípica, revisar cálculo.'
      }

      // Validaciones específicas para Paragon
      if (base_salary < SALARIO_MINIMO) {
        notes_on_deductions += ' Salario por debajo del mínimo legal.'
      }

      return {
        id: emp.dni,
        name: emp?.name,
        bank: emp.bank_name || '',
        bank_account: emp.bank_account || '',
        department: emp.department_id || 'Sin Departamento',
        monthly_salary: base_salary,
        days_worked,
        days_absent,
        late_days,
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

    // Guardar en payroll_records
    const payrollRecords = planilla.map((item: PlanillaItem) => ({
      employee_id: empleadosParaNomina.find((e: any) => e.dni === item.id)?.id,
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
      days_absent: item.days_absent,
      late_days: item.late_days,
      status: 'draft',
      notes_on_ingress: item.notes_on_ingress,
      notes_on_deductions: item.notes_on_deductions,
      generated_by: userProfile?.id || 'system',
      generated_at: new Date().toISOString()
    }))

    const { error: saveError } = await supabase
      .from('payroll_records')
      .upsert(payrollRecords, { 
        onConflict: 'employee_id,period_start,period_end',
        ignoreDuplicates: false 
      })
    
    if (saveError) {
      console.error('Error guardando nómina:', saveError)
      return res.status(500).json({ error: 'Error guardando nómina en la base de datos' })
    }

    console.log(`✅ Nómina generada exitosamente para ${planilla.length} empleados`)

    // A partir de ahora, la generación de PDF está aislada en POST /api/payroll/report

    return res.status(200).json({
      message: 'Nómina calculada exitosamente',
      periodo,
      quincena,
      empleados: planilla.length,
      totalBruto: planilla.reduce((sum: number, row: PlanillaItem) => sum + row.total_earnings, 0),
      totalDeducciones: planilla.reduce((sum: number, row: PlanillaItem) => sum + row.total_deductions, 0),
      totalNeto: planilla.reduce((sum: number, row: PlanillaItem) => sum + row.total, 0),
      planilla
    })
  } catch (error) {
    console.error('Error en cálculo de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error instanceof Error ? error instanceof Error ? error.message : 'Error desconocido' : 'Error desconocido' : 'Error desconocido'
    })
  }
} 