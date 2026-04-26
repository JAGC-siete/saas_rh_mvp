import type { CountryCode } from '../country/supported'

/** Por campo personalizado de tipo earnings (p. ej. bonificación incentivo GT). */
export type EarningImpactRule = {
  affectsSocialSecurity?: boolean
  affectsIsr?: boolean
}

export type EarningImpactRulesMap = Record<string, EarningImpactRule>

export function defaultEarningImpactForCountry(_country: CountryCode): EarningImpactRule {
  return { affectsSocialSecurity: true, affectsIsr: true }
}

export function getEarningImpactForField(
  fieldKey: string,
  rules: EarningImpactRulesMap | null | undefined,
  country: CountryCode
): EarningImpactRule {
  const d = defaultEarningImpactForCountry(country)
  const r = rules?.[fieldKey]
  if (!r) return d
  return {
    affectsSocialSecurity: r.affectsSocialSecurity !== false,
    affectsIsr: r.affectsIsr !== false
  }
}
