export interface PerformanceCompanySettings {
  performance_require_all_rated_to_complete: boolean
  performance_require_comment_on_no_cumple: boolean
  performance_supera_multiplier: number
}

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceCompanySettings = {
  performance_require_all_rated_to_complete: true,
  performance_require_comment_on_no_cumple: false,
  performance_supera_multiplier: 1.25
}

export function parsePerformanceSettings(raw: unknown): PerformanceCompanySettings {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}

  const requireAll = obj.performance_require_all_rated_to_complete
  const requireComment = obj.performance_require_comment_on_no_cumple
  const mult = obj.performance_supera_multiplier

  const parsedMult =
    typeof mult === 'number' && Number.isFinite(mult) && mult >= 1 && mult <= 2
      ? mult
      : DEFAULT_PERFORMANCE_SETTINGS.performance_supera_multiplier

  return {
    performance_require_all_rated_to_complete:
      typeof requireAll === 'boolean' ? requireAll : DEFAULT_PERFORMANCE_SETTINGS.performance_require_all_rated_to_complete,
    performance_require_comment_on_no_cumple:
      typeof requireComment === 'boolean' ? requireComment : DEFAULT_PERFORMANCE_SETTINGS.performance_require_comment_on_no_cumple,
    performance_supera_multiplier: parsedMult
  }
}

