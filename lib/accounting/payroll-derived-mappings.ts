import type { SupabaseClient } from '@supabase/supabase-js'

export type DerivedConceptRow = {
  id: string
  code: string
  label: string
  has_employer_contrib: boolean
  active: boolean
}

export type PayrollDerivedDeductionField = {
  field_key: string
  label: string
}

export type PayrollDerivedMappingRow = {
  id: string
  field_key: string
  concept_code: string | null
  concept_label: string | null
}

export type PayrollDerivedMappingsPayload = {
  concepts: DerivedConceptRow[]
  deductions: PayrollDerivedDeductionField[]
  mappings: PayrollDerivedMappingRow[]
}

export async function loadPayrollDerivedMappingsPayload(
  supabase: SupabaseClient,
  companyId: string
): Promise<PayrollDerivedMappingsPayload> {
  const { data: cpcRow } = await supabase
    .from('company_payroll_configs')
    .select('custom_fields')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle()

  const customFields = (cpcRow?.custom_fields || {}) as Record<string, unknown>
  const deductions = Object.entries(customFields)
    .filter(([, def]) => typeof def === 'object' && def && String((def as { category?: string }).category || '') === 'deductions')
    .map(([fieldKey, def]) => ({
      field_key: fieldKey,
      label: String((def as { label?: string }).label || fieldKey)
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const { data: concepts, error: cErr } = await supabase
    .from('payroll_derived_concepts')
    .select('id, code, label, has_employer_contrib, active')
    .eq('company_id', companyId)
    .order('label')

  if (cErr) throw new Error(cErr.message)

  const conceptRows = (concepts || []) as DerivedConceptRow[]
  const conceptById = new Map<string, DerivedConceptRow>(conceptRows.map((c) => [c.id, c]))

  const { data: sources, error: sErr } = await supabase
    .from('payroll_derived_concept_sources')
    .select('id, concept_id, source_kind, employee_source')
    .eq('company_id', companyId)
    .eq('source_kind', 'run_line_metadata_key')

  if (sErr) throw new Error(sErr.message)

  const mappings = (sources || [])
    .map((s) => ({
      id: s.id as string,
      field_key: s.employee_source as string,
      concept_code: conceptById.get(String(s.concept_id))?.code || null,
      concept_label: conceptById.get(String(s.concept_id))?.label || null
    }))
    .filter((m) => typeof m.field_key === 'string' && m.field_key.length > 0)

  return {
    concepts: conceptRows,
    deductions,
    mappings
  }
}
