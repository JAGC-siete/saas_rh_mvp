import { calculatePayroll } from '../payroll-client-specific'
import { getCustomFieldsFromDB } from '../payroll-calculation-engine'

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
  'days_adjust_reason',
  'ot_adjusted_at',
  'ot_adjusted_by',
  'ot_adjusted_reason',
  'ot_adjust_reason',
  'ot_evening_25',
  'ot_night_50',
  'ot_late_75',
  'ot_morning_25',
  'ot_holiday_100',
  'ot_diurno',
  'ot_nocturno',
  'ot_feriado',
  'overtime_pay',
  'statutory_zeroed_at',
  'statutory_zeroed_by',
  'statutory_zeroed_reason',
  'statutory_zero_ihss',
  'statutory_zero_rap',
  'statutory_zero_isr',
  'septimo_dia',
  '_deduction_plan_ids',
])

const LEGACY_DEDUCTION_KEYS = new Set<string>(
  LEGACY_DEDUCTION_FIELDS.map((field) => field.key)
)

/** Claves de ingresos / sistema en metadata que no deben listarse como deducción en el PDF. */
const NON_DEDUCTION_METADATA_KEYS = new Set([
  ...METADATA_SKIP_KEYS,
  'edited',
  'pay_overtime',
  'hours_worked',
  'total_hours_worked',
  'horas_extras',
  'feriado_trabajado',
  'estipendio_transporte',
  'valor_hora_extra',
  'descanso_por_turno_noche',
  'doble_turno',
  'pausa_almuerzo',
  'incapacidad',
  'dias_faltados',
])

function isDeductionMetadataKey(key: string): boolean {
  if (NON_DEDUCTION_METADATA_KEYS.has(key) || key.startsWith('_')) return false
  if (LEGACY_DEDUCTION_KEYS.has(key)) return true
  return /^[a-z][a-z0-9_]{0,63}$/.test(key)
}

function resolveDeductionAmount(calculated: number, fromMeta: number): number {
  return Math.max(calculated, fromMeta)
}

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
      const calculated = parseAmount(calc.calculatedFields?.[fieldName])
      const fromMeta = parseAmount(meta[fieldName])
      const amount = resolveDeductionAmount(calculated, fromMeta)
      pushDeduction(formatFieldLabel(fieldName, fieldDef.label), amount)
    }

    // Borradores editados pueden tener claves con monto que ya no están en custom_fields actuales
    for (const [key, value] of Object.entries(meta)) {
      if (!isDeductionMetadataKey(key) || customFields[key]) continue
      pushDeduction(formatFieldLabel(key), parseAmount(value))
    }
  } else {
    for (const field of LEGACY_DEDUCTION_FIELDS) {
      pushDeduction(field.label, parseAmount(meta[field.key]))
    }

    for (const [key, value] of Object.entries(meta)) {
      if (!isDeductionMetadataKey(key) || LEGACY_DEDUCTION_KEYS.has(key)) continue
      pushDeduction(formatFieldLabel(key), parseAmount(value))
    }
  }

  const planIds = meta._deduction_plan_ids as string[] | undefined
  if (planIds?.length && supabase) {
    const { data: plans } = await supabase
      .from('employee_deduction_plans')
      .select('field_key, monto_por_plazo')
      .in('id', planIds)
      .eq('company_id', companyId)

    for (const plan of plans || []) {
      const fieldKey = plan.field_key as string
      const fieldDef = customFields?.[fieldKey]
      const amount =
        parseAmount(meta[fieldKey]) > 0
          ? parseAmount(meta[fieldKey])
          : parseAmount(plan.monto_por_plazo)
      pushDeduction(formatFieldLabel(fieldKey, fieldDef?.label), amount)
    }
  }

  return list
}

export function formatCustomDeductionsNotes(
  list: Array<{ name: string; amount: number }>
): string {
  return list.map((d) => `${d.name}: L. ${d.amount.toFixed(2)}`).join('; ')
}
