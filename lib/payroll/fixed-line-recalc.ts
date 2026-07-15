/**
 * Shared fixed-payroll line math: period dates, gross from days, legal deductions + plans.
 * Used by preview and POST /api/payroll/adjust-fixed-days to avoid drift.
 */

import type { TaxConstants } from '../tax/honduras-tax'
import { getIsrForPeriod } from './isr-ytd'
import type { CountryCode } from '../country/supported'
import { computePayrollEmployeeStatutoryDeductions } from './statutory-deductions-compute'
import {
  getBiweeklyPeriodDates,
  getMonthlyPeriodDates,
  getWeeklyPeriodDates
} from './period-dates'

export type PreviewPaymentFrequency = 'monthly' | 'biweekly' | 'weekly'

export interface PaymentCutDatesInput {
  biweekly_type?: 'standard' | 'custom'
  biweekly_first_start?: number
  biweekly_first_end?: number
  biweekly_second_start?: number
  biweekly_second_end?: number
  monthly_type?: 'standard' | 'custom'
  monthly_start?: number
  monthly_end?: number
}

export interface PayrollPeriodContext {
  fechaInicio: string
  fechaFin: string
  diasPeriodo: number
  ultimoDiaCalendario: number
  /** True when monthly standard (1 .. último día del mes calendario) */
  isMonthlyCalendarStandard: boolean
}

export function resolvePayrollPeriodContext(
  year: number,
  month: number,
  quincena: number,
  paymentFrequency: PreviewPaymentFrequency,
  paymentCutDates: PaymentCutDatesInput
): PayrollPeriodContext {
  const ultimoDiaCalendario = new Date(year, month, 0).getDate()

  if (paymentFrequency === 'monthly') {
    const monthlyType = paymentCutDates?.monthly_type || 'standard'
    const ms = paymentCutDates?.monthly_start ?? 1
    const me = paymentCutDates?.monthly_end ?? 30
    if (monthlyType === 'custom' && ms && me) {
      const result = getMonthlyPeriodDates(year, month, ms, me)
      return {
        fechaInicio: result.fechaInicio,
        fechaFin: result.fechaFin,
        diasPeriodo: result.diasPeriodo,
        ultimoDiaCalendario,
        isMonthlyCalendarStandard: false
      }
    }
    const fechaInicio = `${year}-${month.toString().padStart(2, '0')}-01`
    const fechaFin = `${year}-${month.toString().padStart(2, '0')}-${ultimoDiaCalendario}`
    return {
      fechaInicio,
      fechaFin,
      diasPeriodo: ultimoDiaCalendario,
      ultimoDiaCalendario,
      isMonthlyCalendarStandard: true
    }
  }

  if (paymentFrequency === 'weekly') {
    const semana = Math.min(4, Math.max(1, quincena)) as 1 | 2 | 3 | 4
    const result = getWeeklyPeriodDates(year, month, semana)
    return {
      fechaInicio: result.fechaInicio,
      fechaFin: result.fechaFin,
      diasPeriodo: result.diasPeriodo,
      ultimoDiaCalendario,
      isMonthlyCalendarStandard: false
    }
  }

  // biweekly
  const biweeklyType = paymentCutDates?.biweekly_type || 'standard'
  if (
    biweeklyType === 'custom' &&
    paymentCutDates?.biweekly_first_start != null &&
    paymentCutDates?.biweekly_first_end != null &&
    paymentCutDates?.biweekly_second_start != null &&
    paymentCutDates?.biweekly_second_end != null
  ) {
    const result = getBiweeklyPeriodDates(year, month, quincena as 1 | 2, {
      biweekly_first_start: paymentCutDates.biweekly_first_start,
      biweekly_first_end: paymentCutDates.biweekly_first_end,
      biweekly_second_start: paymentCutDates.biweekly_second_start,
      biweekly_second_end: paymentCutDates.biweekly_second_end
    })
    return {
      fechaInicio: result.fechaInicio,
      fechaFin: result.fechaFin,
      diasPeriodo: result.diasPeriodo,
      ultimoDiaCalendario,
      isMonthlyCalendarStandard: false
    }
  }

  if (quincena === 1) {
    return {
      fechaInicio: `${year}-${month.toString().padStart(2, '0')}-01`,
      fechaFin: `${year}-${month.toString().padStart(2, '0')}-15`,
      diasPeriodo: 15,
      ultimoDiaCalendario,
      isMonthlyCalendarStandard: false
    }
  }
  return {
    fechaInicio: `${year}-${month.toString().padStart(2, '0')}-16`,
    fechaFin: `${year}-${month.toString().padStart(2, '0')}-${ultimoDiaCalendario}`,
    diasPeriodo: ultimoDiaCalendario - 15,
    ultimoDiaCalendario,
    isMonthlyCalendarStandard: false
  }
}

export function computeFixedGrossFromDays(input: {
  baseSalary: number
  daysWorked: number
  paymentFrequency: PreviewPaymentFrequency
  diasPeriodo: number
  ultimoDiaCalendario: number
  isMonthlyCalendarStandard: boolean
  semanalProration: 'proportional' | 'fixed'
}): number {
  const base = Number(input.baseSalary) || 0
  const days = Number(input.daysWorked) || 0
  const { paymentFrequency, diasPeriodo, ultimoDiaCalendario, isMonthlyCalendarStandard, semanalProration } =
    input

  if (paymentFrequency === 'monthly') {
    const denom = isMonthlyCalendarStandard ? ultimoDiaCalendario : diasPeriodo
    if (denom > 0) {
      return (base / denom) * days
    }
    return base
  }

  if (paymentFrequency === 'weekly') {
    const periodBase = base / 4
    const useProportional = semanalProration === 'proportional'
    if (useProportional && diasPeriodo > 0) {
      return periodBase * (days / diasPeriodo)
    }
    return periodBase
  }

  // biweekly
  const salarioQuincenal = base / 2
  if (diasPeriodo > 0) {
    return salarioQuincenal * (days / diasPeriodo)
  }
  return salarioQuincenal
}

export interface LegalDeductionsFlags {
  ihss: boolean
  rap: boolean
  isr: boolean
  infop?: boolean
}

export interface EmployeeDeductionPlanRow {
  id: string
  field_key: string
  monto_por_plazo: number
}

function isrFractionForPeriod(
  paymentFrequency: PreviewPaymentFrequency,
  quincena: number
): number | undefined {
  if (paymentFrequency === 'weekly' && quincena >= 1 && quincena <= 4) {
    return quincena / 4
  }
  return undefined
}

export async function computeFixedLineDeductionsAndNet(input: {
  supabase: any
  companyId: string
  employeeId: string
  year: number
  month: number
  quincena: number
  paymentFrequency: PreviewPaymentFrequency
  tipoParam: 'CON' | 'SIN' | '2PAGOS'
  legalDeductions: LegalDeductionsFlags
  useIsrProjection: boolean
  /** Honduras: required when countryCode is HND. */
  taxConstants?: TaxConstants
  countryCode: CountryCode
  totalEarnings: number
  baseSalary: number
  empPlans: EmployeeDeductionPlanRow[]
}): Promise<{
  IHSS: number
  RAP: number
  ISR: number
  totalDeductionsLegal: number
  customDeductionsFromPlans: number
  totalDeductions: number
  total: number
}> {
  const {
    supabase,
    companyId,
    employeeId,
    year,
    month,
    quincena,
    paymentFrequency,
    tipoParam,
    legalDeductions,
    useIsrProjection,
    taxConstants,
    countryCode,
    totalEarnings,
    baseSalary,
    empPlans
  } = input

  let IHSS = 0
  let RAP = 0
  let ISR = 0
  let totalDeductionsLegal = 0

  const fractionOpt = isrFractionForPeriod(paymentFrequency, quincena)

  if (countryCode === 'HND' && !taxConstants) {
    throw new Error('computeFixedLineDeductionsAndNet: taxConstants required for HND')
  }

  if (tipoParam === 'SIN') {
    totalDeductionsLegal = 0
  } else {
    const factor2Pagos = tipoParam === '2PAGOS' ? 0.5 : 1
    const hndTaxConstants = countryCode === 'HND' ? taxConstants : undefined

    const statutory = await computePayrollEmployeeStatutoryDeductions({
      countryCode,
      year,
      baseMonthlySalary: baseSalary,
      factor2Pagos,
      legalDeductions,
      simpleIsrMonthlyBase: baseSalary,
      useIsrProjection: countryCode === 'HND' && useIsrProjection,
      hndTaxConstants,
      runIsrProjection:
        countryCode === 'HND' && useIsrProjection && legalDeductions.isr && hndTaxConstants
          ? () =>
              getIsrForPeriod({
                supabase,
                employeeId,
                companyId,
                year,
                month,
                quincena,
                periodIncome: baseSalary,
                taxConstants: hndTaxConstants,
                factor2Pagos,
                useProjection: true,
                ...(fractionOpt != null ? { fractionOfMonthElapsed: fractionOpt } : {})
              })
          : undefined,
      supabase
    })
    IHSS = statutory.ihss
    RAP = statutory.rap
    ISR = statutory.isr
    totalDeductionsLegal = IHSS + RAP + ISR
  }

  let customDeductionsFromPlans = 0
  for (const plan of empPlans) {
    customDeductionsFromPlans += Number(plan.monto_por_plazo) || 0
  }
  const totalDeductions = totalDeductionsLegal + customDeductionsFromPlans
  const total = totalEarnings - totalDeductions

  return {
    IHSS,
    RAP,
    ISR,
    totalDeductionsLegal,
    customDeductionsFromPlans,
    totalDeductions,
    total
  }
}

export function buildFixedLinePlanMetadata(
  taxYear: number,
  empPlans: EmployeeDeductionPlanRow[],
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const lineMetadata: Record<string, unknown> = {
    tax_year: taxYear,
    pay_type: 'fixed',
    ...extra,
  }
  const planIds: string[] = []
  for (const plan of empPlans) {
    lineMetadata[plan.field_key] = plan.monto_por_plazo
    planIds.push(plan.id)
  }
  if (planIds.length > 0) lineMetadata._deduction_plan_ids = planIds
  return lineMetadata
}

/**
 * Merge server recalc metadata with existing line metadata: keep custom keys, refresh plan keys and tax_year.
 */
export function mergeRecalcMetadata(
  existing: Record<string, unknown> | null | undefined,
  recalc: Record<string, unknown>,
  planFieldKeys: Set<string>
): Record<string, unknown> {
  const base = { ...(existing || {}) }
  for (const k of planFieldKeys) {
    delete base[k]
  }
  delete base._deduction_plan_ids
  delete base.tax_year
  return { ...base, ...recalc }
}
