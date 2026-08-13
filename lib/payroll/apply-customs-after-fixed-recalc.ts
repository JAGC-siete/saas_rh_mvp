/**
 * After fixed days/OT recalc, re-fold custom earnings (and non-plan deductions)
 * from line metadata into bruto/neto without double-counting deduction plans.
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function metadataWithoutPlanKeys(
  metadata: Record<string, unknown> | null | undefined,
  planFieldKeys: Set<string>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(metadata || {}) }
  for (const k of planFieldKeys) {
    delete out[k]
  }
  delete out._deduction_plan_ids
  delete out._deduction_plan_breakdown
  return out
}

/**
 * dayOtGross / netAfterStatutoryAndPlans come from fixed-line engine (plans already in net).
 * ingresos / customDeductionsExcludingPlans come from calculatePayroll on metadataWithoutPlanKeys.
 */
export function foldCustomsIntoFixedRecalcAmounts(input: {
  dayOtGross: number
  netAfterStatutoryAndPlans: number
  ingresosAdicionales: number
  customDeductionsExcludingPlans: number
}): { bruto: number; neto: number } {
  const dayOt = Number(input.dayOtGross) || 0
  const netBase = Number(input.netAfterStatutoryAndPlans) || 0
  const ingresos = Number(input.ingresosAdicionales) || 0
  const customDeds = Number(input.customDeductionsExcludingPlans) || 0
  return {
    bruto: round2(dayOt + ingresos),
    neto: round2(netBase + ingresos - customDeds),
  }
}
