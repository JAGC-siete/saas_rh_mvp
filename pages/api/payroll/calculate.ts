import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getHondurasTimestamp, nowInHonduras } from '../../../lib/timezone'
import { requirePlanAndQuota, incrementUsage, getBillingErrorCode } from '../../../lib/billing/enforce'
import { auditPayrollGenerated } from '../../../lib/audit'
import { 
  getTaxBracketsForYear, 
  calculateISR, 
  calculateIHSS, 
  calculateRAP 
} from '../../../lib/tax/honduras-tax'
import { getBiweeklyPeriodDates, getMonthlyPeriodDates } from '../../../lib/payroll/period-dates'
import { calculatePeriodBaseSalary, normalizeFrequency } from '../../../lib/payroll/calculate-period-base-salary'
import { calculateSeptimoDia } from '../../../lib/payroll/septimo-dia'
import { HONDURAS_LABOR_FACTOR } from '../../../lib/payroll/constants'

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
  total_hours_worked?: number
  pay_type?: 'fixed' | 'hourly'
  septimo_dia?: number
}

// Función para calcular tardanzas basada en horario de Paragon
function calcularTardanzas(registros: any[]): number {
  let tardanzas = 0
  const horaEntrada = 8 // 8:00 AM
  const TOLERANCIA_TARDANZA = 15 // Minutos de tolerancia
  
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
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess
    const { supabase, companyId, role, user, userProfile } = await requireCompanyAccess(req, res)
    
    // Verificar roles específicos para generar nómina
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar nómina'
      })
    }

    // Validar que companyId esté presente
    if (!companyId) {
      return res.status(400).json({ 
        error: 'Perfil de usuario incompleto',
        message: 'No se pudo obtener la información de la empresa'
      })
    }

    console.log('Usuario autenticado para nómina:', { 
      userId: user.id, 
      role: role,
      companyId: companyId 
    })

    try {
      await requirePlanAndQuota(supabase, companyId, 'generate_payroll')
    } catch (error: any) {
      const statusCode = getBillingErrorCode(error.message)
      return res.status(statusCode).json({ 
        error: error.message,
        code: error.message
      })
    }

    const { periodo, quincena, tipoCalculo, tipo } = req.body || {}
    
    // Validaciones
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
    const currentDate = nowInHonduras()
    const periodDate = new Date(year, month - 1, 1)
    
    if (periodDate > currentDate) {
      return res.status(400).json({ 
        error: 'Período inválido',
        message: 'No se puede generar nómina para períodos futuros'
      })
    }

    // Obtener constantes fiscales para el año del período
    const taxConstants = await getTaxBracketsForYear(year)

    // Configuración 3 capas: company_payroll_configs (Capa 2) > labor_laws (Capa 1)
    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('metadata, payment_frequency, quincena_config')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()
    
    const payrollMetadata = payrollConfig?.metadata || {}
    const quincenaConfig = payrollConfig?.quincena_config || {}
    const metaCutDates = payrollMetadata?.payment_cut_dates || {}
    
    // payment_frequency: nueva columna (Capa 2) o metadata legacy o default mensual
    const pfRaw = payrollConfig?.payment_frequency || payrollMetadata.payment_frequency || 'mensual'
    const paymentFrequency = pfRaw === 'quincenal' ? 'biweekly' : pfRaw === 'semanal' ? 'weekly' : 'monthly'
    const frequencyForCalc = normalizeFrequency(pfRaw)
    const hasCustomQuincena = !!(quincenaConfig.first_start != null || quincenaConfig.first_end != null || 
      quincenaConfig.second_start != null || quincenaConfig.second_end != null)
    const biweeklyType = metaCutDates.biweekly_type === 'custom' || hasCustomQuincena ? 'custom' : 'standard'
    const paymentCutDates = {
      biweekly_type: biweeklyType,
      biweekly_first_start: quincenaConfig.first_start ?? metaCutDates.biweekly_first_start ?? 1,
      biweekly_first_end: quincenaConfig.first_end ?? metaCutDates.biweekly_first_end ?? 15,
      biweekly_second_start: quincenaConfig.second_start ?? metaCutDates.biweekly_second_start ?? 16,
      biweekly_second_end: quincenaConfig.second_end ?? metaCutDates.biweekly_second_end ?? 30,
      monthly_type: metaCutDates.monthly_type || 'standard',
      monthly_start: metaCutDates.monthly_start ?? 1,
      monthly_end: metaCutDates.monthly_end ?? 30
    }
    const legalDeductions = payrollMetadata.legal_deductions || {
      ihss: true,
      rap: true,
      isr: true,
      infop: false
    }
    const currency = payrollMetadata.currency || 'HNL'
    // Semanal: 'proportional' = por días reales (days_worked/diasPeriodo); 'fixed' = monto fijo (mensual/4)
    const semanalProration = payrollMetadata.semanal_proration || 'proportional'
    
    // Calcular fechas del período según configuración
    const ultimoDia = new Date(year, month, 0).getDate()
    let fechaInicio: string
    let fechaFin: string
    let diasPeriodo: number
    
    if (paymentFrequency === 'monthly') {
      // Nómina mensual (soporta offset: 28-27)
      const monthlyType = paymentCutDates?.monthly_type || 'standard'
      const ms = paymentCutDates?.monthly_start ?? 1
      const me = paymentCutDates?.monthly_end ?? 30
      if (monthlyType === 'custom' && ms && me) {
        const result = getMonthlyPeriodDates(year, month, ms, me)
        fechaInicio = result.fechaInicio
        fechaFin = result.fechaFin
        diasPeriodo = result.diasPeriodo
      } else {
        // Standard: del 1 al último día del mes
        fechaInicio = `${periodo}-01`
        fechaFin = `${periodo}-${ultimoDia}`
        diasPeriodo = ultimoDia
      }
    } else {
      // Nómina quincenal (biweekly)
      const biweeklyTypeVal = paymentCutDates?.biweekly_type || 'standard'
      if (biweeklyTypeVal === 'custom' && paymentCutDates?.biweekly_first_start != null && paymentCutDates?.biweekly_first_end != null && 
          paymentCutDates?.biweekly_second_start != null && paymentCutDates?.biweekly_second_end != null) {
        const result = getBiweeklyPeriodDates(year, month, quincena as 1 | 2, paymentCutDates)
        fechaInicio = result.fechaInicio
        fechaFin = result.fechaFin
        diasPeriodo = result.diasPeriodo
      } else {
        // Standard: 1-15 y 16-último día
        if (quincena === 1) {
          fechaInicio = `${periodo}-01`
          fechaFin = `${periodo}-15`
          diasPeriodo = 15
        } else {
          fechaInicio = `${periodo}-16`
          fechaFin = `${periodo}-${ultimoDia}`
          diasPeriodo = ultimoDia - 15
        }
      }
    }
    
    // IMPORTANTE: Las deducciones se aplican SOLO UNA VEZ al mes (en Q2) o siempre en mensual
    // Q1 (biweekly): solo salario bruto proporcional por días trabajados
    // Q2 (biweekly) o mensual: salario bruto proporcional + deducciones mensuales completas
    // tipo: CON=completas, 2PAGOS=mitad (repartidas en 2 pagos), SIN=ninguna
    const aplicarDeducciones = (paymentFrequency === 'monthly' || quincena === 2) && tipo !== 'SIN'
    const tipoDeduccion = (tipo === '2PAGOS' ? '2PAGOS' : tipo === 'SIN' ? 'SIN' : 'CON') as 'CON' | 'SIN' | '2PAGOS'

    console.log('Generando nómina:', {
      periodo,
      quincena,
      fechaInicio,
      fechaFin,
      aplicarDeducciones,
      tipoCalculo,
      tipoDeduccion
    })

    // Obtener empleados activos (incluir pay_type para cálculo hourly)
    let employeesQuery = supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status, department_id, pay_type')
      .eq('status', 'active')
      .order('name')

    if (companyId) {
      employeesQuery = employeesQuery.eq('company_id', companyId)
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
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select('id, employee_id, date, check_in, check_out, status')
      .gte('date', fechaInicio)
      .lte('date', fechaFin)

    if (attError) {
      console.error('Error obteniendo registros de asistencia:', attError)
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    // Obtener cálculos de horas (total_hours, normal_hours, overtime por tipo)
    const recordIds = (attendanceRecords || []).map((r: any) => r.id).filter(Boolean)
    let hoursCalculations: Record<string, { total_hours: number; normal_hours: number; overtime_diurno: number; overtime_nocturno: number; overtime_feriado: number }> = {}
    if (recordIds.length > 0) {
      const { data: ahcResults } = await supabase
        .from('attendance_hours_calculation')
        .select('attendance_record_id, total_hours, normal_hours, overtime_diurno_hours, overtime_nocturno_hours, overtime_feriado_hours')
        .in('attendance_record_id', recordIds)
      if (ahcResults) {
        const recordToEmp = Object.fromEntries((attendanceRecords || []).map((r: any) => [r.id, r.employee_id]))
        for (const ahc of ahcResults) {
          const empId = recordToEmp[ahc.attendance_record_id]
          if (empId) {
            if (!hoursCalculations[empId]) hoursCalculations[empId] = { total_hours: 0, normal_hours: 0, overtime_diurno: 0, overtime_nocturno: 0, overtime_feriado: 0 }
            hoursCalculations[empId].total_hours += Number(ahc.total_hours || 0)
            const total = Number(ahc.total_hours || 0)
            const ot = Number(ahc.overtime_diurno_hours || 0) + Number(ahc.overtime_nocturno_hours || 0) + Number(ahc.overtime_feriado_hours || 0)
            hoursCalculations[empId].normal_hours += Number(ahc.normal_hours ?? Math.max(0, total - ot))
            hoursCalculations[empId].overtime_diurno += Number(ahc.overtime_diurno_hours || 0)
            hoursCalculations[empId].overtime_nocturno += Number(ahc.overtime_nocturno_hours || 0)
            hoursCalculations[empId].overtime_feriado += Number(ahc.overtime_feriado_hours || 0)
          }
        }
      }
    }

    // Filtrar empleados según criterio de asistencia
    let empleadosParaNomina = employees
    
    if (tipoCalculo === 'con_asistencia') {
      empleadosParaNomina = employees.filter((emp: any) =>
        attendanceRecords.some((record: any) => 
          record.employee_id === emp.id && 
          record.check_in && 
          record.check_out &&
          record.status !== 'absent')
      )
    } else {
      empleadosParaNomina = employees.filter((emp: any) =>
        attendanceRecords.some((record: any) => 
          record.employee_id === emp.id && 
          record.check_in && 
          record.check_out)
      )
    }

    if (empleadosParaNomina.length === 0) {
      return res.status(400).json({ 
        error: 'No hay empleados con asistencia',
        message: 'No se encontraron empleados con asistencia completa para el período seleccionado'
      })
    }

    console.log(`Procesando nómina para ${empleadosParaNomina.length} empleados`)

    // Calcular planilla con CÁLCULOS 3 CAPAS
    const planilla: PlanillaItem[] = empleadosParaNomina.map((emp: any) => {
      const registros = attendanceRecords.filter((record: any) => 
        record.employee_id === emp.id && 
        record.check_in && 
        record.check_out)
      
      const days_worked = registros.length
      const days_absent = diasPeriodo - days_worked
      const late_days = calcularTardanzas(registros)
      
      const base_salary = Number(emp.base_salary) || 0
      const payType = emp.pay_type ?? 'fixed'
      // base_salary siempre mensual. Tarifa horaria = base_salary / 240.
      const hourlyRate = base_salary / HONDURAS_LABOR_FACTOR

      // Horas extras desde attendance_hours_calculation (Capa 3) si existen
      const overtime = hoursCalculations[emp.id] || { total_hours: 0, normal_hours: 0, overtime_diurno: 0, overtime_nocturno: 0, overtime_feriado: 0 }
      const overtimePay =
        overtime.overtime_diurno * hourlyRate * 1.25 +   // +25%
        overtime.overtime_nocturno * hourlyRate * 1.50 + // +50%
        overtime.overtime_feriado * hourlyRate * 1.75   // +75%

      // CALCULAR SALARIO SEGÚN payment_frequency y pay_type (helper unificado)
      // Hourly: salario_bruto = base_salary (tarifa/hora) * hours_worked
      // Fixed: periodBase (mensual/2 o /4) * (days_worked/diasPeriodo)
      let total_earnings = 0
      let septimoDia = 0
      if (payType === 'hourly') {
        const hoursWorked = overtime.total_hours || 0
        total_earnings = calculatePeriodBaseSalary(
          { base_salary, pay_type: 'hourly' },
          frequencyForCalc,
          { hoursWorked }
        )
        // Séptimo Día (Art. 338-340): 1 día descanso por cada 6 trabajados. Solo horas ordinarias.
        const otSum = (overtime.overtime_diurno || 0) + (overtime.overtime_nocturno || 0) + (overtime.overtime_feriado || 0)
        const ordinaryHours = overtime.normal_hours ?? Math.max(0, (overtime.total_hours || 0) - otSum)
        septimoDia = calculateSeptimoDia({
          hourlyRate: base_salary / HONDURAS_LABOR_FACTOR,
          ordinaryHours,
          daysWorked: days_worked,
          totalHours: overtime.total_hours || 0,
          semanalProration: semanalProration
        })
        total_earnings += septimoDia
      } else {
        const periodBase = calculatePeriodBaseSalary(
          { base_salary, pay_type: 'fixed' },
          frequencyForCalc
        )
        // Semanal: validar si monto fijo (fixed) o días reales (proportional)
        const useProportional = frequencyForCalc !== 'semanal' || semanalProration === 'proportional'
        total_earnings = useProportional && diasPeriodo > 0
          ? periodBase * (days_worked / diasPeriodo)
          : periodBase
      }
      total_earnings += overtimePay
      
      let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0
      let notes_on_ingress = ''
      let notes_on_deductions = ''

      // APLICAR DEDUCCIONES según configuración y legal_deductions
      if (aplicarDeducciones) {
        // base_salary siempre mensual; usarlo directo como base para deducciones.
        const baseParaDeducciones = base_salary
        const factor2Pagos = tipoDeduccion === '2PAGOS' ? 0.5 : 1

        // CÁLCULOS CON TABLA FISCAL DEL AÑO CORRESPONDIENTE
        if (legalDeductions.ihss) {
          IHSS = calculateIHSS(baseParaDeducciones, taxConstants) * factor2Pagos
        }
        if (legalDeductions.rap) {
          RAP = calculateRAP(baseParaDeducciones, taxConstants) * factor2Pagos
        }
        if (legalDeductions.isr) {
          ISR = calculateISR(baseParaDeducciones, taxConstants.isr_brackets) * factor2Pagos
        }
        
        total_deductions = IHSS + RAP + ISR
        total = total_earnings - total_deductions
        
        const deduccionesAplicadas = []
        if (legalDeductions.ihss) deduccionesAplicadas.push(`IHSS L.${IHSS.toFixed(2)}`)
        if (legalDeductions.rap) deduccionesAplicadas.push(`RAP L.${RAP.toFixed(2)}`)
        if (legalDeductions.isr) deduccionesAplicadas.push(`ISR L.${ISR.toFixed(2)}`)
        
        notes_on_deductions = tipoDeduccion === '2PAGOS'
          ? `Deducciones en dos pagos (mitad): ${deduccionesAplicadas.join(', ')}`
          : `Deducciones mensuales completas: ${deduccionesAplicadas.join(', ')}`
      } else {
        // Q1 (biweekly): solo salario proporcional, sin deducciones
        total = total_earnings
        notes_on_deductions = 'Primera quincena: solo salario proporcional (deducciones se aplican en Q2)'
      }

      // Notas automáticas
      if (days_worked < diasPeriodo) {
        notes_on_ingress = `Faltaron ${days_absent} días de asistencia completa.`
      }
      
      if (late_days > 0) {
        notes_on_ingress += ` ${late_days} días con tardanza.`
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
        notes_on_deductions,
        total_hours_worked: payType === 'hourly' ? overtime.total_hours : undefined,
        pay_type: payType,
        septimo_dia: septimoDia > 0 ? septimoDia : undefined
      }
    })

    // Guardar en payroll_records
    const payrollRecords = planilla.map((item: PlanillaItem) => ({
      employee_id: empleadosParaNomina.find((e: any) => e.dni === item.id)?.id,
      period_start: fechaInicio,
      period_end: fechaFin,
      period_type: frequencyForCalc === 'mensual' ? 'monthly' : frequencyForCalc === 'semanal' ? 'weekly' : 'biweekly',
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
      seventh_day_pay: item.septimo_dia ?? 0,
      metadata: {
        tax_year: year,
        ...(item.pay_type === 'hourly' && item.total_hours_worked != null && { total_hours_worked: item.total_hours_worked }),
        ...(item.septimo_dia != null && item.septimo_dia > 0 && { septimo_dia: item.septimo_dia })
      },
      generated_by: user.id || 'system',
      generated_at: getHondurasTimestamp()
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

    console.log(`Nómina generada exitosamente para ${planilla.length} empleados`)

    // Increment usage meter
    try {
      await incrementUsage(supabase, companyId, 'generate_payroll')
    } catch (error) {
      console.warn('Failed to increment usage meter:', error)
      // Don't fail the request if usage tracking fails
    }

    // Log audit event
    try {
      await auditPayrollGenerated(supabase, user.id, companyId, periodo)
    } catch (error) {
      console.warn('Failed to log audit event:', error)
      // Don't fail the request if audit fails
    }

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
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 