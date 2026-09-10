/**
 * Clock-span hours for portal/UI summaries (not AHC).
 * Subtracts lunch interval when both lunch marks exist.
 */
export function markSpanWorkedHours(marks: {
  check_in?: string | null
  check_out?: string | null
  lunch_start?: string | null
  lunch_end?: string | null
}): number | null {
  if (!marks.check_in || !marks.check_out) return null
  const start = new Date(marks.check_in).getTime()
  const end = new Date(marks.check_out).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null

  let ms = end - start
  if (marks.lunch_start && marks.lunch_end) {
    const lunchStart = new Date(marks.lunch_start).getTime()
    const lunchEnd = new Date(marks.lunch_end).getTime()
    if (Number.isFinite(lunchStart) && Number.isFinite(lunchEnd) && lunchEnd > lunchStart) {
      ms -= lunchEnd - lunchStart
    }
  }
  return Math.max(0, ms / (1000 * 60 * 60))
}
