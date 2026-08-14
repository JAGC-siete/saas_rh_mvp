/**
 * Snapshot of employees.base_salary stamped on payroll_run_lines.metadata.base_salary_used.
 * Live ficha vs stamp: regenerable runs must recalc; frozen runs keep the stamp.
 */

import {
  linePayTypeDriftedFromEmployee,
  type CompanyCalculationMode,
} from './resolve-effective-pay-type'

/** Cent-level compare for monthly salary (numeric(10,2)). */
export const SALARY_SNAPSHOT_EPS = 0.009

export function readStampedBaseSalary(
  metadata: Record<string, unknown> | null | undefined
): number | null {
  const n = Number(metadata?.base_salary_used)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function lineBaseSalaryDriftedFromEmployee(
  stamped: unknown,
  live: unknown
): boolean {
  const used = Number(stamped)
  if (!Number.isFinite(used)) return false
  const current = Number(live)
  if (!Number.isFinite(current)) return false
  return Math.abs(used - current) > SALARY_SNAPSHOT_EPS
}

/** Prefer the salary used to compute eff_* so the column matches amounts. */
export function resolveSnapshotMonthlySalary(
  live: unknown,
  metadata: Record<string, unknown> | null | undefined
): number {
  const stamped = readStampedBaseSalary(metadata)
  if (stamped != null) return stamped
  return Number(live) || 0
}

export function payrollLineMasterDataDrifted(input: {
  employeePayType: unknown
  metadataPayType?: unknown
  companyCalculationMode?: CompanyCalculationMode | string | null
  liveBaseSalary?: unknown
  stampedBaseSalary?: unknown
}): boolean {
  if (
    linePayTypeDriftedFromEmployee({
      employeePayType: input.employeePayType,
      metadataPayType: input.metadataPayType,
      companyCalculationMode: input.companyCalculationMode,
    })
  ) {
    return true
  }
  return lineBaseSalaryDriftedFromEmployee(input.stampedBaseSalary, input.liveBaseSalary)
}
