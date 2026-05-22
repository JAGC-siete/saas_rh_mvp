/** ISO date YYYY-MM-DD helpers for schedule assignment timelines. */

export function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export function addDaysIso(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && bFrom <= aTo
}

export type AssignmentRow = {
  id: string
  employee_id: string
  valid_from: string
  valid_to: string
  work_schedule_id: string
  repeat_weekly?: boolean | null
  repeat_weekdays?: number[] | null
}

export type ConflictAction =
  | { action: 'delete'; id: string }
  | { action: 'update'; id: string; valid_from?: string; valid_to?: string }

/**
 * Trim or remove overlapping assignments so a new range can be inserted cleanly.
 * Previous assignments ending after newFrom are cut to newFrom - 1 day.
 * Assignments starting before newTo+1 extending past newTo are trimmed forward.
 */
export function planAssignmentConflictResolutions(
  existing: AssignmentRow[],
  newFrom: string,
  newTo: string
): ConflictAction[] {
  const actions: ConflictAction[] = []

  for (const ex of existing) {
    if (!rangesOverlap(ex.valid_from, ex.valid_to, newFrom, newTo)) continue

    const fullyInside = ex.valid_from >= newFrom && ex.valid_to <= newTo
    if (fullyInside) {
      actions.push({ action: 'delete', id: ex.id })
      continue
    }

    const spansBefore = ex.valid_from < newFrom
    const spansAfter = ex.valid_to > newTo

    if (spansBefore && spansAfter) {
      // Keep the earlier segment; drop the tail covered by the new assignment.
      actions.push({ action: 'update', id: ex.id, valid_to: addDaysIso(newFrom, -1) })
      continue
    }

    if (spansBefore && ex.valid_to >= newFrom) {
      actions.push({ action: 'update', id: ex.id, valid_to: addDaysIso(newFrom, -1) })
      continue
    }

    if (spansAfter && ex.valid_from <= newTo) {
      actions.push({ action: 'update', id: ex.id, valid_from: addDaysIso(newTo, 1) })
      continue
    }
  }

  return actions.filter((a) => {
    if (a.action === 'update') {
      const ex = existing.find((e) => e.id === a.id)
      if (!ex) return false
      const from = a.valid_from ?? ex.valid_from
      const to = a.valid_to ?? ex.valid_to
      return from <= to
    }
    return true
  })
}

export function parseWeekdays(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null
  const out = v.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6) as number[]
  return out.length > 0 ? Array.from(new Set(out)).sort((a, b) => a - b) : null
}

export function normalizeRepeatWeekdays(repeatWeekly: boolean, weekdays: number[] | null): number[] | null {
  if (!repeatWeekly) return null
  return weekdays
}
