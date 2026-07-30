/**
 * Helpers for applying deduction-plan installment advances on payroll authorize.
 * Keeps cancel/stale-metadata and duplicate-id edge cases out of the API handler.
 */

export type DeductionPlanAuthorizeCandidate = {
  planId: string
  employeeId: string
  runLineId: string
}

export type DeductionPlanAuthorizeRow = {
  activo?: boolean | null
  plazos_aplicados?: number | null
  plazos_totales?: number | null
}

type LineLike = {
  id?: string
  employee_id?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Collect unique (planId, employeeId, runLineId) from line metadata._deduction_plan_ids.
 */
export function collectDeductionPlanIncrements(
  lines: LineLike[] | null | undefined
): DeductionPlanAuthorizeCandidate[] {
  const seen = new Set<string>()
  const out: DeductionPlanAuthorizeCandidate[] = []

  for (const line of lines || []) {
    const employeeId = line.employee_id
    const runLineId = line.id
    if (!employeeId || !runLineId) continue

    const ids = line.metadata?._deduction_plan_ids
    if (!Array.isArray(ids)) continue

    for (const raw of ids) {
      if (typeof raw !== 'string' || !raw) continue
      const key = `${raw}:${employeeId}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ planId: raw, employeeId, runLineId })
    }
  }

  return out
}

/**
 * Whether authorize should burn a plazo for this plan.
 * Inactive / exhausted plans (e.g. cancelled while draft still had _deduction_plan_ids) are skipped.
 */
export function shouldIncrementDeductionPlan(plan: DeductionPlanAuthorizeRow | null | undefined): boolean {
  if (!plan) return false
  if (plan.activo === false) return false
  const applied = Number(plan.plazos_aplicados) || 0
  const total = Number(plan.plazos_totales) || 0
  if (total <= 0) return false
  if (applied >= total) return false
  return true
}
