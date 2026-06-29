import { calculatePayroll } from '../payroll-client-specific'
import { getCustomFieldsFromDB } from './payroll-calculation-engine'

/** Campos legacy hardcodeados (clientes antiguos sin custom_fields en BD). */
const LEGACY_DEDUCTION_FIELDS = [
  { key: 'comedor', label: 'Comedor' },
  { key: 'cooperativa_aportaciones', label: 'Coop. Aportaciones' },
  { key: 'cooperativa_retirable', label: 'Coop. Retirable' },
  { key: 'cooperativa_prestamo', label: 'Coop. Préstamo' },
  { key: 'embargo_alimentos', label: 'Embargo de Alimentos' },
  { key: 'otras_deducciones_materiales', label: 'Materiales' },
  { key: 'otras_deducciones_medicamentos', label: 'Medicamentos' },
  { key: 'otras_deducciones_efectivo', label: 'Efectivo' },
  { key: 'prestamo_banrural', label: 'Préstamo BANRURAL' },
  { key: 'prestamo_celular', label: 'Préstamo Celular' },
  { key: 'anticipo_prestamo', label: 'Anticipo/Préstamo' },
  { key: 'impuesto_vecinal', label: 'Impuesto Vecinal' },
] as const

const METADATA_SKIP_KEYS = new Set([
  'tax_year',
  'base_salary_used',
  'position_snapshot',
  'ihss_patronal',
  'rap_patronal',
  'days_extra',
  'notes_extra',
  'paid_leave_days',
  'notes_paid_leave',
  'included_without_attendance',
  'days_adjusted_at',
  'days_adjusted_by',
  'days_adjusted_reason',
  'septimo_dia',
  '_deduction_plan_ids',
])

function parseAmount(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'boolean') return value ? 1 : 0
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

function formatFieldLabel(fieldName: string, label?: string): string {
  if (label && label.trim()) return label.trim()
  return fieldName.replace(/_/g, ' ')
}

/**
 * Lista deducciones adicionales para PDF/comprobante, alineada a company_payroll_configs.custom_fields
 * y a los valores persistidos en payroll_run_lines.metadata (incl. planes por plazos).
 */
export async function buildCustomDeductionsList(
  companyId: string,
  metadata: Record<string, unknown> | null | undefined,
  baseSalary: number,
  supabase: any
): Promise<Array<{ name: string; amount: number }>> {
  const meta = metadata || {}
  const calc = await calculatePayroll(companyId, baseSalary, meta, supabase)
  const customFields = await getCustomFieldsFromDB(companyId, supabase)
  const list: Array<{ name: string; amount: number }> = []
  const seen = new Set<string>()

  const pushDeduction = (name: string, amount: number) => {
    const rounded = Math.round(amount * 100) / 100
    if (rounded <= 0) return
    const dedupeKey = `${name}:${rounded}`
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)
    list.push({ name, amount: rounded })
  }

  if (customFields && Object.keys(customFields).length > 0) {
    for (const [fieldName, fieldDef] of Object.entries(customFields)) {
      if (fieldDef.category !== 'deductions') continue
      const amount =
        parseAmount(calc.calculatedFields?.[fieldName]) || parseAmount(meta[fieldName])
      pushDeduction(formatFieldLabel(fieldName, fieldDef.label), amount)
    }
    return list
  }

  for (const field of LEGACY_DEDUCTION_FIELDS) {
    pushDeduction(field.label, parseAmount(meta[field.key]))
  }

  // Respaldo: claves numéricas en metadata que no sean metadatos internos
  for (const [key, value] of Object.entries(meta)) {
    if (METADATA_SKIP_KEYS.has(key) || key.startsWith('_')) continue
    pushDeduction(formatFieldLabel(key), parseAmount(value))
  }

  return list
}

export function formatCustomDeductionsNotes(
  list: Array<{ name: string; amount: number }>
): string {
  return list.map((d) => `${d.name}: L. ${d.amount.toFixed(2)}`).join('; ')
}
