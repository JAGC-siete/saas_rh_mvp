import type { FieldAccessContext } from './field-access'
import {
  shapeEmployeeExportReportData,
  shapeEmployees,
  shapePayrollRecord,
} from './shape-employee'

/**
 * Redacts salary/payroll amounts from report payloads before PDF/CSV/Excel generation.
 */
export function applyFieldAccessToReportData(
  reportData: Record<string, unknown> | null | undefined,
  fieldCtx: FieldAccessContext
): Record<string, unknown> {
  if (!reportData) return {}
  if (fieldCtx.canViewSalary) return reportData

  const next: Record<string, unknown> = { ...reportData }

  if (Array.isArray(next.employees)) {
    next.employees = shapeEmployees(next.employees as Record<string, unknown>[], fieldCtx)
  }

  if (next.stats && typeof next.stats === 'object') {
    const stats = { ...(next.stats as Record<string, unknown>) }
    delete stats.totalPayroll
    delete stats.totalSalary
    delete stats.averageSalary
    next.stats = stats
  }

  if (Array.isArray(next.departmentStats)) {
    next.departmentStats = (next.departmentStats as Record<string, unknown>[]).map((row) => {
      const copy = { ...row }
      delete copy.totalSalary
      return copy
    })
  }

  if (Array.isArray(next.payroll)) {
    next.payroll = (next.payroll as Record<string, unknown>[]).map((row) => {
      const shaped = shapePayrollRecord(row, fieldCtx)
      if (shaped.employees && typeof shaped.employees === 'object') {
        return {
          ...shaped,
          employees: shapeEmployees(
            [shaped.employees as Record<string, unknown>],
            fieldCtx
          )[0],
        }
      }
      return shaped
    })
  }

  return next
}

export { shapeEmployeeExportReportData }
