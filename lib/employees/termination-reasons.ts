/**
 * Motivos de baja estables para SQL/reportes. Solo estos códigos acepta la API.
 */

export const TERMINATION_REASON_OPTIONS: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'renuncia_voluntaria', label: 'Renuncia voluntaria' },
  { code: 'despido_justificado', label: 'Despido con justa causa' },
  { code: 'despido_injustificado', label: 'Despido sin justa causa' },
  { code: 'fin_contrato', label: 'Fin de contrato / temporal' },
  { code: 'mutuo_acuerdo', label: 'Desvinculación por mutuo acuerdo' },
  { code: 'abandono_empleo', label: 'Abandono de empleo' },
  { code: 'fallecimiento', label: 'Fallecimiento' },
  { code: 'jubilacion', label: 'Jubilación' },
  { code: 'otro', label: 'Otro (detallar abajo)' }
]

const ALLOWED = new Set(TERMINATION_REASON_OPTIONS.map((o) => o.code))

export function isAllowedTerminationReasonCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') return false
  return ALLOWED.has(code.trim())
}

export function getTerminationReasonLabel(code: string | null | undefined): string {
  if (!code) return '—'
  const opt = TERMINATION_REASON_OPTIONS.find((o) => o.code === code.trim())
  return opt?.label ?? code.trim()
}

/** Detalle libre: trim + longitud máxima */
export function normalizeTerminationReasonDetail(detail: unknown, maxLen = 2000): string | null {
  if (detail === null || detail === undefined) return null
  const s = String(detail).trim()
  if (!s) return null
  return s.length > maxLen ? s.slice(0, maxLen) : s
}
