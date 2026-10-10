/**
 * Pure access rules for the accounting API. No Supabase imports so they stay unit-testable.
 */
import { canAccessPayrollNavigation } from '../auth/role-access'

/** Same rule as the /app/accounting page gate (PAYROLL_NAV_ROLES). */
export function canUseAccounting(role: unknown): boolean {
  return canAccessPayrollNavigation(role)
}

/**
 * Export must return every requested entry from a single company, or nothing.
 * A partial result would confirm which foreign ids exist.
 */
export function isExportScopeValid(
  requestedIds: string[],
  entries: Array<{ id: string; company_id: string }>
): boolean {
  const requested = new Set(requestedIds)
  if (requested.size === 0 || entries.length !== requested.size) return false
  if (!entries.every((e) => requested.has(e.id))) return false
  return new Set(entries.map((e) => e.company_id)).size === 1
}

/** Account ids that are not part of the company's own chart of accounts. */
export function findForeignAccountIds(requestedIds: string[], ownedIds: string[]): string[] {
  const owned = new Set(ownedIds)
  return [...new Set(requestedIds)].filter((id) => !owned.has(id))
}

/**
 * The search term is interpolated into a PostgREST `.or()` filter, where `,` `(` `)` `.` `*`
 * and quotes change the filter itself. Codes and names only need letters, digits, spaces and dashes.
 */
export function sanitizeAccountSearchTerm(term: string): string {
  return term
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}
