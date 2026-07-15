import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { normalizeCountryCode } from '../../../lib/country/supported'
import { statutoryDeductionLabels } from '../../../lib/country/payroll-labels'
import { isPayrollCountryEngineEnabled } from '../../../lib/features/payroll-country-flags'
import { computePayrollEmployeeStatutoryDeductions } from '../../../lib/payroll/statutory-deductions-compute'
import {
  assertNonHndStatutoryConfigParses,
  payrollStatutoryErrorResponse,
  payrollStatutoryYearUnavailable
} from '../../../lib/payroll/statutory-api-guard'
import { getHondurasTimestamp, isPayrollCalendarPeriodInFuture } from '../../../lib/timezone'
import { requirePlanAndQuota, incrementUsage, getBillingErrorCode } from '../../../lib/billing/enforce'
import { auditPayrollGenerated } from '../../../lib/audit'
import { getTaxEngine } from '../../../lib/tax/registry'
import { getIsrForPeriod } from '../../../lib/payroll/isr-ytd'
import {
  resolvePayrollPeriodContext,
  type PreviewPaymentFrequency,
  type PaymentCutDatesInput
} from '../../../lib/payroll/fixed-line-recalc'
import { calculatePeriodBaseSalary, normalizeFrequency } from '../../../lib/payroll/calculate-period-base-salary'
import { calculateSeptimoDia } from '../../../lib/payroll/septimo-dia'
import { HONDURAS_LABOR_FACTOR } from '../../../lib/payroll/constants'
import { resolveEffectivePayType, parseCompanyCalculationMode, isHourBasedPayType } from '../../../lib/payroll/resolve-effective-pay-type'
import {
  hasValidPayrollAttendanceRecords,
  resolveFixedDaysWorkedForPayroll,
  shouldIncludeEmployeeInPayrollPreview,
} from '../../../lib/payroll/payroll-attendance-inclusion'
import {
  resolveCompanyPayOvertime,
  shouldPayOvertimeToEmployee,
  calculateOvertimePayFromAhc
} from '../../../lib/payroll/overtime-pay'
import {
  resolveOrdinaryHoursCap,
  sumAdminFloorPeriodHours,
} from '../../../lib/payroll/admin-floor-hours'
import { parseOrdinaryHoursOverrideInput } from '../../../lib/payroll/ordinary-hours-override'
import { createEmployeeSalaryClient } from '../../../lib/security/employee-data-access'
import { fetchPaidLeaveCreditsByEmployee } from '../../../lib/leave/paid-leave-days'

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
  pay_type?: 'fixed' | 'hourly' | 'admin_floor'
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
    const { supabase, companyId, role, user, userProfile, companyCountryCode, companyTimezone } =
      await requireCompanyAccess(req, res)
    const salaryClient = createEmployeeSalaryClient()
    
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

    const countryCode = normalizeCountryCode(companyCountryCode)
    if (!isPayrollCountryEngineEnabled(countryCode)) {
      return res.status(403).json({
        error: 'Nómina no habilitada para este país',
        message:
          'El motor de nómina para la jurisdicción de la empresa no está activado. Contacte al administrador.',
        code: 'PAYROLL_COUNTRY_DISABLED'
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
    
    const quincenaNum = Number(quincena)
    if (!Number.isInteger(quincenaNum) || quincenaNum < 1) {
      return res.status(400).json({
        error: 'Quincena/semana inválida (entero ≥ 1; con nómina semanal use 1–4)'
      })
    }

    // Validar que no sea un período futuro
    const [year, month] = periodo.split('-').map((n: any) => Number(n))
    const tz = companyTimezone || 'America/Tegucigalpa'
    if (isPayrollCalendarPeriodInFuture(year, month, tz)) {
      return res.status(400).json({ 
        error: 'Período inválido',
        message: 'No se puede generar nómina para períodos futuros'
      })
    }

    const dedLabels = statutoryDeductionLabels(countryCode)
    const yearCtx = await getTaxEngine(countryCode).loadYearContext(year)
    const blocked = payrollStatutoryYearUnavailable(yearCtx, countryCode, year)
    if (!blocked.ok) return res.status(blocked.status).json(blocked.body)
    await assertNonHndStatutoryConfigParses(countryCode, year, supabase)
    const hndTaxConstants = yearCtx.hndTaxConstants ?? undefined

    // Configuración 3 capas: company_payroll_configs (Capa 2) > labor_laws (Capa 1)
    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('metadata, payment_frequency, quincena_config, calculation_mode')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()
    
    const payrollMetadata = payrollConfig?.metadata || {}
    const calculationMode =
      (payrollConfig?.calculation_mode as string) ||
      (payrollMetadata.calculation_mode as string) ||
      'daily'
    const companyCalculationMode = parseCompanyCalculationMode(calculationMode)
    const companyPayOvertime = resolveCompanyPayOvertime(payrollMetadata as Record<string, unknown>)
    const ordinaryHoursCap = resolveOrdinaryHoursCap(
      parseOrdinaryHoursOverrideInput(
        (payrollMetadata as Record<string, unknown>)?.ordinary_hours_override
      )
    )
    const quincenaConfig = payrollConfig?.quincena_config || {}
    const metaCutDates = payrollMetadata?.payment_cut_dates || {}
    
    // payment_frequency: nueva columna (Capa 2) o metadata legacy o default mensual
    const pfRaw = payrollConfig?.payment_frequency || payrollMetadata.payment_frequency || 'mensual'
    const mapPreviewFreq = (v: string): PreviewPaymentFrequency => {
      const x = (v || '').toLowerCase()
      if (x === 'mensual' || x === 'monthly') return 'monthly'
      if (x === 'semanal' || x === 'weekly') return 'weekly'
      if (x === 'quincenal' || x === 'biweekly') return 'biweekly'
      return 'biweekly'
    }
    const previewPaymentFrequency = mapPreviewFreq(pfRaw as string)
    const paymentFrequency =
      pfRaw === 'quincenal' || (pfRaw as string).toLowerCase() === 'biweekly'
        ? 'biweekly'
        : pfRaw === 'semanal' || (pfRaw as string).toLowerCase() === 'weekly'
          ? 'weekly'
          : 'monthly'
    const frequencyForCalc = normalizeFrequency(pfRaw)
    const hasCustomQuincena = !!(quincenaConfig.first_start != null || quincenaConfig.first_end != null || 
      quincenaConfig.second_start != null || quincenaConfig.second_end != null)
    const biweeklyType: 'custom' | 'standard' =
      metaCutDates.biweekly_type === 'custom' || hasCustomQuincena ? 'custom' : 'standard'
    const paymentCutDates: PaymentCutDatesInput = {
      biweekly_type: biweeklyType,
      biweekly_first_start: quincenaConfig.first_start ?? metaCutDates.biweekly_first_start ?? 1,
      biweekly_first_end: quincenaConfig.first_end ?? metaCutDates.biweekly_first_end ?? 15,
      biweekly_second_start: quincenaConfig.second_start ?? metaCutDates.biweekly_second_start ?? 16,
      biweekly_second_end: quincenaConfig.second_end ?? metaCutDates.biweekly_second_end ?? 30,
      monthly_type: metaCutDates.monthly_type === 'custom' ? 'custom' : 'standard',
      monthly_start: metaCutDates.monthly_start ?? 1,
      monthly_end: metaCutDates.monthly_end ?? 30
    }

    if (previewPaymentFrequency === 'weekly') {
      if (![1, 2, 3, 4].includes(quincenaNum)) {
        return res.status(400).json({
          error: 'Semana inválida (debe ser 1, 2, 3 o 4 para nómina semanal)'
        })
      }
    } else if (![1, 2].includes(quincenaNum)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
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

    const { data: companyRow } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single()
    const useIsrProjection = (companyRow?.settings as Record<string, unknown>)?.use_isr_projection === true
    
    // Fechas y días del período: misma lógica que preview / fixed-line-recalc (incl. semanal S1–S4)
    const periodCtx = resolvePayrollPeriodContext(
      year,
      month,
      quincenaNum,
      previewPaymentFrequency,
      paymentCutDates
    )
    const { fechaInicio, fechaFin, diasPeriodo } = periodCtx

    // IMPORTANTE: Deducciones de ley
    // - Mensual: siempre (salvo tipo SIN)
    // - Quincenal: solo segunda quincena (Q2), como antes
    // - Semanal: solo semana 4 (cierre del mes; análogo a Q2; semanas 1–3 solo bruto)
    // tipo: CON=completas, 2PAGOS=mitad, SIN=ninguna
    const aplicarDeducciones =
      (paymentFrequency === 'monthly' ||
        (paymentFrequency === 'biweekly' && quincenaNum === 2) ||
        (paymentFrequency === 'weekly' && quincenaNum === 4)) &&
      tipo !== 'SIN'
    const tipoDeduccion = (tipo === '2PAGOS' ? '2PAGOS' : tipo === 'SIN' ? 'SIN' : 'CON') as 'CON' | 'SIN' | '2PAGOS'

    console.log('Generando nómina:', {
      periodo,
      quincena: quincenaNum,
      previewPaymentFrequency,
      fechaInicio,
      fechaFin,
      diasPeriodo,
      aplicarDeducciones,
      tipoCalculo,
      tipoDeduccion
    })

    // Obtener empleados activos (incluir pay_type para cálculo hourly)
    let employeesQuery = salaryClient
      .from('employees')
      .select('id, name, dni, employee_code, base_salary, bank_name, bank_account, status, department_id, pay_type, attendance_required, pay_overtime')
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
    const ahcHoursByRecordId: Record<string, number> = {}
    if (recordIds.length > 0) {
      const { data: ahcResults } = await supabase
        .from('attendance_hours_calculation')
        .select('attendance_record_id, total_hours, normal_hours, overtime_diurno_hours, overtime_nocturno_hours, overtime_feriado_hours')
        .in('attendance_record_id', recordIds)
      if (ahcResults) {
        const recordToEmp = Object.fromEntries((attendanceRecords || []).map((r: any) => [r.id, r.employee_id]))
        for (const ahc of ahcResults) {
          const empId = recordToEmp[ahc.attendance_record_id]
          const h = Number(ahc.total_hours || 0)
          ahcHoursByRecordId[ahc.attendance_record_id] = h
          if (empId) {
            if (!hoursCalculations[empId]) hoursCalculations[empId] = { total_hours: 0, normal_hours: 0, overtime_diurno: 0, overtime_nocturno: 0, overtime_feriado: 0 }
            hoursCalculations[empId].total_hours += h
            const total = h
            const ot = Number(ahc.overtime_diurno_hours || 0) + Number(ahc.overtime_nocturno_hours || 0) + Number(ahc.overtime_feriado_hours || 0)
            hoursCalculations[empId].normal_hours += Number(ahc.normal_hours ?? Math.max(0, total - ot))
            hoursCalculations[empId].overtime_diurno += Number(ahc.overtime_diurno_hours || 0)
            hoursCalculations[empId].overtime_nocturno += Number(ahc.overtime_nocturno_hours || 0)
            hoursCalculations[empId].overtime_feriado += Number(ahc.overtime_feriado_hours || 0)
          }
        }
      }
    }

    const periodHasAttendanceRecords = (attendanceRecords?.length ?? 0) > 0
    let empleadosParaNomina = employees
    
    if (periodHasAttendanceRecords) {
      empleadosParaNomina = employees.filter((emp: any) => {
        const empRecords = (attendanceRecords || []).filter(
          (record: any) => record.employee_id === emp.id
        )
        const effectivePayType = resolveEffectivePayType(emp.pay_type, companyCalculationMode)
        if (isHourBasedPayType(effectivePayType)) {
          return shouldIncludeEmployeeInPayrollPreview(
            emp.attendance_required,
            effectivePayType,
            hasValidPayrollAttendanceRecords(empRecords),
            periodHasAttendanceRecords
          )
        }
        if (emp.attendance_required === false) return true
        const requiresComplete = empRecords.some((record: any) =>
          record.check_in &&
          record.check_out &&
          (tipoCalculo !== 'con_asistencia' || record.status !== 'absent')
        )
        return requiresComplete
      })
    }

    if (empleadosParaNomina.length === 0) {
      return res.status(400).json({ 
        error: 'No hay empleados con asistencia',
        message: 'No se encontraron empleados con asistencia completa para el período seleccionado'
      })
    }

    console.log(`Procesando nómina para ${empleadosParaNomina.length} empleados`)

    const payrollEmployeeIds = empleadosParaNomina.map((e: any) => e.id)
    let paidLeaveCreditsByEmployee = new Map<string, number>()
    if (payrollEmployeeIds.length > 0 && companyId) {
      try {
        paidLeaveCreditsByEmployee = await fetchPaidLeaveCreditsByEmployee(
          supabase,
          companyId,
          fechaInicio,
          fechaFin,
          payrollEmployeeIds
        )
      } catch (paidLeaveErr) {
        console.error('Error obteniendo créditos de permisos pagados:', paidLeaveErr)
        return res.status(500).json({
          error: 'Error obteniendo permisos pagados para nómina',
          message: paidLeaveErr instanceof Error ? paidLeaveErr.message : String(paidLeaveErr),
        })
      }
    }

    // Calcular planilla con CÁLCULOS 3 CAPAS
    const planilla: PlanillaItem[] = await Promise.all(empleadosParaNomina.map(async (emp: any) => {
      const effectivePayType = resolveEffectivePayType(emp.pay_type, companyCalculationMode)
      const registros = attendanceRecords.filter((record: any) => {
        if (record.employee_id !== emp.id || !record.check_in) return false
        // fixed + admin_floor: check_in enough (floor handles missing checkout)
        if (effectivePayType === 'fixed' || effectivePayType === 'admin_floor') return true
        return Boolean(record.check_out)
      })

      const paidLeaveCredits = paidLeaveCreditsByEmployee.get(emp.id) || 0
      const fixedDays = resolveFixedDaysWorkedForPayroll(
        effectivePayType,
        emp.attendance_required,
        registros.length,
        diasPeriodo,
        paidLeaveCredits
      )
      const days_worked =
        effectivePayType === 'fixed' ? fixedDays.daysWorked : registros.length
      const days_absent = Math.max(0, diasPeriodo - days_worked)
      const late_days = calcularTardanzas(registros)
      
      const base_salary = Number(emp.base_salary) || 0
      // base_salary siempre mensual. Tarifa horaria = base_salary / 240.
      const hourlyRate = base_salary / HONDURAS_LABOR_FACTOR

      // Horas extras desde attendance_hours_calculation (Capa 3) si existen
      const overtime = hoursCalculations[emp.id] || { total_hours: 0, normal_hours: 0, overtime_diurno: 0, overtime_nocturno: 0, overtime_feriado: 0 }
      const overtimePay = calculateOvertimePayFromAhc(
        {
          diurno: Number(overtime.overtime_diurno) || 0,
          nocturno: Number(overtime.overtime_nocturno) || 0,
          feriado: Number(overtime.overtime_feriado) || 0
        },
        hourlyRate
      )

      // CALCULAR SALARIO SEGÚN payment_frequency y pay_type (helper unificado)
      // Hourly: salario_bruto = base_salary (tarifa/hora) * hours_worked
      // Admin floor: piso = tope ordinario/día; HE solo con ambas marcas y > tope
      // Fixed: periodBase (mensual/2 o /4) * (days_worked/diasPeriodo)
      let total_earnings = 0
      let septimoDia = 0
      if (effectivePayType === 'hourly') {
        const otSum =
          (overtime.overtime_diurno || 0) +
          (overtime.overtime_nocturno || 0) +
          (overtime.overtime_feriado || 0)
        const hoursWorked = shouldPayOvertimeToEmployee(
          companyPayOvertime,
          effectivePayType,
          emp.pay_overtime
        )
          ? overtime.total_hours || 0
          : overtime.normal_hours ?? Math.max(0, (overtime.total_hours || 0) - otSum)
        total_earnings = calculatePeriodBaseSalary(
          { base_salary, pay_type: 'hourly' },
          frequencyForCalc,
          { hoursWorked }
        )
        // Séptimo Día (Art. 338-340): 1 día descanso por cada 6 trabajados. Solo horas ordinarias.
        const ordinaryHours = overtime.normal_hours ?? Math.max(0, (overtime.total_hours || 0) - otSum)
        septimoDia = calculateSeptimoDia({
          hourlyRate: base_salary / HONDURAS_LABOR_FACTOR,
          ordinaryHours,
          daysWorked: days_worked,
          totalHours: overtime.total_hours || 0,
          semanalProration: semanalProration
        })
        total_earnings += septimoDia
      } else if (effectivePayType === 'admin_floor') {
        const floor = sumAdminFloorPeriodHours(
          registros.map((r: any) => ({
            check_in: r.check_in,
            check_out: r.check_out,
            total_hours: ahcHoursByRecordId[r.id] ?? 0,
          })),
          ordinaryHoursCap
        )
        const payOt = shouldPayOvertimeToEmployee(
          companyPayOvertime,
          effectivePayType,
          emp.pay_overtime
        )
        const hoursWorked = payOt ? floor.payable : floor.ordinary
        total_earnings = calculatePeriodBaseSalary(
          { base_salary, pay_type: 'admin_floor' },
          frequencyForCalc,
          { hoursWorked }
        )
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
      if (
        (effectivePayType === 'hourly' || effectivePayType === 'fixed') &&
        shouldPayOvertimeToEmployee(companyPayOvertime, effectivePayType, emp.pay_overtime)
      ) {
        total_earnings += overtimePay
      }
      
      let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0
      let notes_on_ingress = ''
      let notes_on_deductions = ''

      // APLICAR DEDUCCIONES según configuración y legal_deductions
      if (aplicarDeducciones) {
        // base_salary siempre mensual; usarlo directo como base para deducciones.
        const baseParaDeducciones = base_salary
        const factor2Pagos = tipoDeduccion === '2PAGOS' ? 0.5 : 1

        const periodIncomeForIsr = isHourBasedPayType(effectivePayType) ? total_earnings : baseParaDeducciones

        const statutory = await computePayrollEmployeeStatutoryDeductions({
          countryCode,
          year,
          baseMonthlySalary: baseParaDeducciones,
          factor2Pagos,
          legalDeductions,
          simpleIsrMonthlyBase: periodIncomeForIsr,
          useIsrProjection: countryCode === 'HND' && useIsrProjection,
          hndTaxConstants,
          runIsrProjection:
            countryCode === 'HND' && useIsrProjection && legalDeductions.isr && hndTaxConstants
              ? () =>
                  getIsrForPeriod({
                    supabase,
                    employeeId: emp.id,
                    companyId,
                    year,
                    month,
                    quincena: quincenaNum,
                    periodIncome: periodIncomeForIsr,
                    taxConstants: hndTaxConstants,
                    factor2Pagos,
                    useProjection: true,
                    ...(paymentFrequency === 'weekly'
                      ? { fractionOfMonthElapsed: quincenaNum / 4 }
                      : {})
                  })
              : undefined,
          supabase
        })

        IHSS = statutory.ihss
        RAP = statutory.rap
        ISR = statutory.isr
        total_deductions = IHSS + RAP + ISR
        total = total_earnings - total_deductions

        const deduccionesAplicadas = []
        if (legalDeductions.ihss) {
          deduccionesAplicadas.push(`${dedLabels.primarySocial} ${currency} ${IHSS.toFixed(2)}`)
        }
        if (legalDeductions.rap && countryCode !== 'GTM') {
          deduccionesAplicadas.push(`${dedLabels.secondarySocial} ${currency} ${RAP.toFixed(2)}`)
        }
        if (legalDeductions.isr) {
          deduccionesAplicadas.push(`${dedLabels.incomeTax} ${currency} ${ISR.toFixed(2)}`)
        }
        
        notes_on_deductions = tipoDeduccion === '2PAGOS'
          ? `Deducciones en dos pagos (mitad): ${deduccionesAplicadas.join(', ')}`
          : `Deducciones mensuales completas: ${deduccionesAplicadas.join(', ')}`
      } else {
        total = total_earnings
        if (tipo === 'SIN') {
          notes_on_deductions = 'Tipo SIN: sin deducciones de ley.'
        } else if (paymentFrequency === 'weekly') {
          notes_on_deductions =
            'Nómina semanal (semanas 1–3): solo salario proporcional; deducciones de ley en la semana 4.'
        } else if (paymentFrequency === 'biweekly') {
          notes_on_deductions =
            'Primera quincena: solo salario proporcional (deducciones en la segunda quincena).'
        } else {
          notes_on_deductions = 'Sin deducciones de ley en este período.'
        }
      }

      // Notas automáticas
      if (days_worked < diasPeriodo) {
        notes_on_ingress = `Faltaron ${days_absent} días de asistencia completa.`
      }
      
      if (late_days > 0) {
        notes_on_ingress += ` ${late_days} días con tardanza.`
      }

      return {
        id: emp.employee_code || '',
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
        total_hours_worked: isHourBasedPayType(effectivePayType) ? overtime.total_hours : undefined,
        pay_type: effectivePayType,
        septimo_dia: septimoDia > 0 ? septimoDia : undefined
      }
    }))

    // Guardar en payroll_records
    const payrollRecords = planilla.map((item: PlanillaItem) => ({
      employee_id: empleadosParaNomina.find((e: any) => e.employee_code === item.id || e.dni === item.id)?.id,
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
        country_code: countryCode,
        ...(item.pay_type && isHourBasedPayType(item.pay_type) && item.total_hours_worked != null
          ? { total_hours_worked: item.total_hours_worked }
          : {}),
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
    const stat = payrollStatutoryErrorResponse(error)
    if (stat) return res.status(stat.status).json(stat.body)
    console.error('Error en cálculo de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 