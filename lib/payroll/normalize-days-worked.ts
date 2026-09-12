/** Días de planilla fija: admite medios días (14.5). Redondeo a 2 decimales. */
export function normalizePayrollDaysWorked(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw === 'string' && raw.trim() === '') return null
  const parsed =
    typeof raw === 'number'
      ? raw
      : Number(typeof raw === 'string' ? raw.trim().replace(',', '.') : raw)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100) / 100
}
