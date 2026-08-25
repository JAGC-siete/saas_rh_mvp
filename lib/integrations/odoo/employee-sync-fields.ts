export const ODOO_EMPLOYEE_SYNC_FIELDS = ['name', 'dni', 'email', 'status'] as const

export function employeeSyncFieldsChanged(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): boolean {
  return ODOO_EMPLOYEE_SYNC_FIELDS.some(
    (field) => String(before[field] ?? '') !== String(after[field] ?? '')
  )
}
