/**
 * Decide check_in vs check_out for field mobile punches.
 * Absent shells from daily-close (no marks) must be treated as check_in, not check_out.
 */

export type FieldPunchRecordSlice = {
  check_in: string | null
  check_out: string | null
  status?: string | null
  flags?: Record<string, unknown> | null
} | null

export type FieldPunchAction = 'check_in' | 'check_out' | 'day_complete'

export function decideFieldPunchAction(record: FieldPunchRecordSlice): FieldPunchAction {
  if (!record) return 'check_in'

  const hasIn = Boolean(record.check_in)
  const hasOut = Boolean(record.check_out)

  // Daily-close absent shell: status absent, both marks null → first field punch is check_in
  if (!hasIn && !hasOut) return 'check_in'

  if (hasIn && !hasOut) return 'check_out'

  return 'day_complete'
}

export function isFieldProtectedRecord(flags: unknown): boolean {
  const f = flags as Record<string, unknown> | null | undefined
  return f?.field_protected === true || f?.channel === 'field_mobile'
}

export function buildFieldRecordFlags(
  existingFlags: Record<string, unknown> | null | undefined,
  extras: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...(existingFlags || {}),
    channel: 'field_mobile',
    field_protected: true,
    daily_close_absent: false,
    ...extras,
  }
}
