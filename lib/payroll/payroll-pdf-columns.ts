/**
 * Column catalog for consolidated payroll PDF tables.
 * Fixed order: identification → income → deductions → net.
 * Labels come from report config (columnLabels) with fallbacks.
 */

import { statutoryDeductionLabels } from '../country/payroll-labels'
import { normalizeCountryCode, type CountryCode } from '../country/supported'
import { resolveStatutoryDeductionColumns } from './statutory-deduction-columns'

export interface PayrollPdfCustomFieldDef {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' | 'calculation_helper'
  required: boolean
  default: any
}

export type PayrollPdfCustomFieldsConfig = Record<string, PayrollPdfCustomFieldDef | string>

export interface BuildPayrollPdfColumnsInput {
  isHourly: boolean
  hasSeptimoDia: boolean
  hasOvertimePay: boolean
  visibleColumnIds?: Set<string> | null
  columnLabels?: Record<string, string>
  /** Orders custom_* within earnings / deductions blocks only. */
  columnOrder?: Record<string, number> | null
  includeCustomPayrollFields?: boolean
  customFieldsConfig?: PayrollPdfCustomFieldsConfig
  legalDeductions?: { ihss?: boolean; rap?: boolean; isr?: boolean }
  countryCode?: CountryCode | string | null
  /**
   * Custom earnings field names with at least one non-zero value in the table.
   * OT-alias earnings (e.g. horas_extra_manual) are omitted when empty so they
   * do not duplicate the "Pago HE" / overtime_pay column.
   */
  customEarningsWithValues?: Set<string> | null
}

export interface PayrollPdfColumnMeta {
  id: string
  header: string
}

/** Base quincenal de reporte = mensual ÷ 2 (sin HE ni otros ingresos). */
export function reportBiweeklyBaseFromMonthly(monthly: number): number {
  return (Number(monthly) || 0) / 2
}

function colVisible(visible: Set<string> | null | undefined, id: string): boolean {
  return visible == null || visible.has(id)
}

function colLabel(labels: Record<string, string> | undefined, id: string, fallback: string): string {
  return labels?.[id]?.trim() || fallback
}

function sortCustomFieldEntries<T>(
  entries: [string, T][],
  columnOrder: Record<string, number> | null | undefined
): [string, T][] {
  if (!columnOrder) return entries
  return [...entries].sort((a, b) => {
    const ao = columnOrder[`custom_${a[0]}`]
    const bo = columnOrder[`custom_${b[0]}`]
    const aRank = ao == null ? 10_000 : ao
    const bRank = bo == null ? 10_000 : bo
    if (aRank !== bRank) return aRank - bRank
    return a[0].localeCompare(b[0])
  })
}

function normalizeCustomField(
  fieldName: string,
  fieldDef: PayrollPdfCustomFieldDef | string,
  forcedCategory: 'earnings' | 'deductions'
): PayrollPdfCustomFieldDef {
  if (typeof fieldDef === 'string') {
    return {
      label: fieldDef,
      category: forcedCategory,
      type: 'number',
      required: false,
      default: 0,
    }
  }
  return fieldDef
}

/** Manual/legacy HE earnings that collide with standard `overtime_pay` ("Pago HE"). */
export function isOvertimeEarningsAlias(fieldName: string): boolean {
  const n = fieldName.trim().toLowerCase()
  if (!n) return false
  if (n === 'horas_extra_manual' || n === 'horas_extras' || n === 'ingreso_he_manual') return true
  return /hora.*extra|extra.*hora|overtime/.test(n)
}

/**
 * Builds ordered column metadata for the planilla PDF table.
 * Does not include the hours-quantity column (`horas_extras`).
 */
export function buildPayrollPdfColumnMeta(input: BuildPayrollPdfColumnsInput): PayrollPdfColumnMeta[] {
  const {
    isHourly,
    hasSeptimoDia,
    hasOvertimePay,
    visibleColumnIds = null,
    columnLabels = {},
    columnOrder = null,
    customFieldsConfig,
    legalDeductions,
    countryCode,
    customEarningsWithValues = null,
  } = input
  const filterCustomFields = Boolean(input.includeCustomPayrollFields && visibleColumnIds)
  const country = normalizeCountryCode(countryCode)
  const dedLabels = statutoryDeductionLabels(country)
  const statutoryCols = resolveStatutoryDeductionColumns(
    legalDeductions,
    customFieldsConfig,
    country
  )

  const cols: PayrollPdfColumnMeta[] = []
  const push = (id: string, fallback: string) => {
    if (!colVisible(visibleColumnIds, id)) return
    cols.push({ id, header: colLabel(columnLabels, id, fallback) })
  }

  // —— Identificación ——
  push('emp_code', 'Código')
  push('emp_name', 'Nombre')
  push('department', 'Departamento')
  push('position', 'Puesto')
  push('days_worked', isHourly ? 'Días' : 'Días Trab.')
  if (isHourly) {
    push('hours', 'Horas')
    push('hourly_rate', 'Tarifa/Hora')
  }

  // —— Ingresos: mensual → quincenal → HE monto → custom earnings → total ——
  push('base_salary', 'Sueldo Mensual')
  push('biweekly_salary', 'Sueldo Quincenal')
  if (isHourly && hasSeptimoDia) {
    push('septimo_dia', 'Séptimo Día')
  }
  if (hasOvertimePay) {
    push('overtime_pay', 'Pago HE')
  }

  if (customFieldsConfig) {
    const earningEntries = sortCustomFieldEntries(
      Object.entries(customFieldsConfig).filter(([, fieldDef]) => {
        const def = normalizeCustomField('', fieldDef, 'earnings')
        return def.category === 'earnings'
      }),
      columnOrder
    )
    for (const [fieldName, fieldDef] of earningEntries) {
      const def = normalizeCustomField(fieldName, fieldDef, 'earnings')
      const customId = `custom_${fieldName}`
      if (filterCustomFields && !visibleColumnIds!.has(customId)) continue
      // Avoid Julio-style dual HE columns: "Pago HE" + empty "Horas Extra".
      if (isOvertimeEarningsAlias(fieldName)) {
        const hasValue = customEarningsWithValues?.has(fieldName) ?? false
        if (hasOvertimePay || !hasValue) continue
      }
      cols.push({ id: customId, header: colLabel(columnLabels, customId, def.label || fieldName) })
    }
  }

  push('gross_salary', 'Total ingresos')

  // —— Deducciones → suma → neto ——
  if (statutoryCols.ihss) {
    push('ihss', dedLabels.primarySocial)
  }
  if (statutoryCols.rap && dedLabels.secondarySocial !== '—') {
    push('rap', dedLabels.secondarySocial)
  }
  if (statutoryCols.isr) {
    push('isr', dedLabels.incomeTax)
  }

  if (customFieldsConfig) {
    const deductionEntries = sortCustomFieldEntries(
      Object.entries(customFieldsConfig).filter(([, fieldDef]) => {
        const def = normalizeCustomField('', fieldDef, 'deductions')
        return def.category === 'deductions'
      }),
      columnOrder
    )
    for (const [fieldName, fieldDef] of deductionEntries) {
      const def = normalizeCustomField(fieldName, fieldDef, 'deductions')
      const customId = `custom_${fieldName}`
      if (filterCustomFields && !visibleColumnIds!.has(customId)) continue
      cols.push({ id: customId, header: colLabel(columnLabels, customId, def.label || fieldName) })
    }
  }

  push('total_deductions', 'Total Deducciones')
  push('net_salary', 'Neto a Pagar')

  return cols
}
