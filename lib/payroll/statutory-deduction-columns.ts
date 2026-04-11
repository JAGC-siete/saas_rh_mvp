/**
 * Qué columnas de deducciones legales mostrar en PDF / UI.
 * Evita duplicar ISR automático (eff_isr) cuando hay ISR manual por campo personalizado.
 */

import type { CountryCode } from '../country/supported'

export type LegalDeductionsFlags = {
  ihss?: boolean
  rap?: boolean
  isr?: boolean
}

export type CustomFieldConfigEntry =
  | string
  | {
      label?: string
      category?: 'earnings' | 'deductions' | 'calculation_helper'
      type?: string
      required?: boolean
      default?: unknown
    }

export function manualIsrCustomFieldPresent(
  customFieldsConfig?: Record<string, CustomFieldConfigEntry> | null
): boolean {
  if (!customFieldsConfig) return false
  for (const [fieldName, fieldDef] of Object.entries(customFieldsConfig)) {
    const def = typeof fieldDef === 'string' ? { label: fieldDef } : fieldDef
    const category = def.category
    if (category === 'earnings' || category === 'calculation_helper') continue
    const key = fieldName.toLowerCase()
    const label = String(typeof fieldDef === 'string' ? fieldDef : def.label || fieldName).toLowerCase()
    if (key === 'isr_manual' || key.includes('isr_manual')) return true
    if (key.includes('retencion_isr') || key.startsWith('isr_retencion')) return true
    if (label.includes('isr') && label.includes('manual')) return true
    if (/\bisr\s*\(?\s*manual/.test(label)) return true
  }
  return false
}

export function resolveStatutoryDeductionColumns(
  legalDeductions?: LegalDeductionsFlags | null,
  customFieldsConfig?: Record<string, CustomFieldConfigEntry> | null,
  countryCode?: CountryCode | null
): { ihss: boolean; rap: boolean; isr: boolean } {
  const ihss = legalDeductions?.ihss !== false
  let rap = legalDeductions?.rap !== false
  if (countryCode === 'GTM') {
    rap = false
  }
  const isrLegalOn = legalDeductions?.isr !== false
  const isr = isrLegalOn && !manualIsrCustomFieldPresent(customFieldsConfig)
  return { ihss, rap, isr }
}
