/**
 * Draft preview sync: remove payroll_run_lines for employees no longer in the calc set
 * (inactive, filtered out by attendance, etc.). Authorized/distributed runs never hit this path.
 */

export type PayrollLineIdRow = {
  id: string
  employee_id?: string | null
}

export function findOrphanPayrollLineIds(
  existingLines: PayrollLineIdRow[],
  keptEmployeeIds: Iterable<string>
): string[] {
  const kept = new Set(
    [...keptEmployeeIds].filter((id) => typeof id === 'string' && id.length > 0)
  )
  const orphanIds: string[] = []
  for (const line of existingLines) {
    const eid = line.employee_id
    if (!eid || !line.id) continue
    if (!kept.has(eid)) orphanIds.push(line.id)
  }
  return orphanIds
}
