import { statutoryDeductionLabels, type StatutoryDeductionLabels } from '../country/payroll-labels'
import { normalizeCountryCode } from '../country/supported'
import { formatPeriodRangeForDisplay } from './period-dates'
import type { LoadedPlanillaFromRun } from './planilla-from-run'
import type { PlanillaItem } from './report'
import { payrollPdfGroupByFilenameSuffix } from './pdf-layout'
import { coalescePlanillaPayType, isHourBasedPlanillaPayType } from './resolve-effective-pay-type'

export type PlanillaPreviewEmployeeRow = {
  name: string
  department: string
  daysWorked: number
  hoursWorked?: number
  gross: number
  ihss: number
  rap: number
  isr: number
  totalDeductions: number
  net: number
  payType: 'fixed' | 'hourly' | 'admin_floor'
}

export type PlanillaPreviewSummary = {
  employees: number
  totalGross: number
  totalDeductions: number
  totalNet: number
  ihss: number
  rap: number
  isr: number
}

export type PlanillaPreviewData = {
  runId: string
  companyName: string
  periodTitle: string
  periodRange: string
  runStatus: string
  isDraftPreview: boolean
  quincena: number
  summary: PlanillaPreviewSummary
  fixedRows: PlanillaPreviewEmployeeRow[]
  hourlyRows: PlanillaPreviewEmployeeRow[]
  dedLabels: StatutoryDeductionLabels
  defaultFilename: string
  defaultPdfGroupBy: string
}

function mapEmployeeRow(item: PlanillaItem): PlanillaPreviewEmployeeRow {
  const payType = coalescePlanillaPayType(item.pay_type)
  return {
    name: item.name,
    department: item.department,
    daysWorked: item.days_worked,
    hoursWorked: isHourBasedPlanillaPayType(payType) ? item.total_hours_worked : undefined,
    gross: item.total_earnings,
    ihss: item.IHSS,
    rap: item.RAP,
    isr: item.ISR,
    totalDeductions: item.total_deductions,
    net: item.total,
    payType,
  }
}

function buildSummary(rows: PlanillaPreviewEmployeeRow[]): PlanillaPreviewSummary {
  return {
    employees: rows.length,
    totalGross: rows.reduce((s, r) => s + r.gross, 0),
    totalDeductions: rows.reduce((s, r) => s + r.totalDeductions, 0),
    totalNet: rows.reduce((s, r) => s + r.net, 0),
    ihss: rows.reduce((s, r) => s + r.ihss, 0),
    rap: rows.reduce((s, r) => s + r.rap, 0),
    isr: rows.reduce((s, r) => s + r.isr, 0),
  }
}

function mergeSummaries(a: PlanillaPreviewSummary, b: PlanillaPreviewSummary): PlanillaPreviewSummary {
  return {
    employees: a.employees + b.employees,
    totalGross: a.totalGross + b.totalGross,
    totalDeductions: a.totalDeductions + b.totalDeductions,
    totalNet: a.totalNet + b.totalNet,
    ihss: a.ihss + b.ihss,
    rap: a.rap + b.rap,
    isr: a.isr + b.isr,
  }
}

export function buildPlanillaPreviewPayload(loaded: LoadedPlanillaFromRun): PlanillaPreviewData {
  const { payrollRun, planillaFixed, planillaHourly, periodDates, pdfPayrollConfig } = loaded
  const periodRange = formatPeriodRangeForDisplay(
    periodDates.period_start,
    periodDates.period_end
  )
  const freq = pdfPayrollConfig.payment_frequency
  const periodLabel =
    freq === 'monthly'
      ? 'Planilla mensual'
      : freq === 'weekly'
        ? `Semana ${payrollRun.quincena}`
        : `Quincena ${payrollRun.quincena}`

  const fixedRows = planillaFixed.map(mapEmployeeRow)
  const hourlyRows = planillaHourly.map(mapEmployeeRow)
  const summary = mergeSummaries(buildSummary(fixedRows), buildSummary(hourlyRows))
  const dedLabels = statutoryDeductionLabels(normalizeCountryCode(pdfPayrollConfig.country_code))
  const groupSuffix = payrollPdfGroupByFilenameSuffix(loaded.defaultPdfGroupBy)

  return {
    runId: payrollRun.id,
    companyName: loaded.companyName,
    periodTitle: `${periodLabel} · ${loaded.periodo}`,
    periodRange,
    runStatus: payrollRun.status,
    isDraftPreview: loaded.isDraftPreview,
    quincena: payrollRun.quincena,
    summary,
    fixedRows,
    hourlyRows,
    dedLabels,
    defaultFilename: `planilla_${loaded.periodo}_q${payrollRun.quincena}${groupSuffix}.pdf`,
    defaultPdfGroupBy: loaded.defaultPdfGroupBy,
  }
}
