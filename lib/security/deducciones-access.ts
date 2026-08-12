import { normalizePermissionsToCanonical } from './canonical-permissions'

function parseRawPermissions(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

/**
 * Acceso al módulo /app/deducciones (sidebar, página y APIs de planes).
 * Payroll roles con nómina lo tienen por defecto; managers solo con can_manage_deducciones.
 */
export function canAccessDeduccionesModule(role: unknown, permissions: unknown): boolean {
  const normalizedRole = (role || '').toString().trim().toLowerCase()
  const canonical = normalizePermissionsToCanonical(normalizedRole, parseRawPermissions(permissions))
  return canonical.can_manage_deducciones === true
}

/** Listado de empleados para asignar planes (sin abrir módulo Empleados en sidebar). */
export function canSearchEmployeesForDeducciones(role: unknown, permissions: unknown): boolean {
  const normalizedRole = (role || '').toString().trim().toLowerCase()
  const canonical = normalizePermissionsToCanonical(normalizedRole, parseRawPermissions(permissions))
  return canonical.can_view_employees === true || canonical.can_manage_deducciones === true
}

/**
 * Cancelar planes activos (p. ej. adelanto salarial).
 * Por defecto permitido si tiene acceso a Deducciones; se deniega con can_cancel_deduction_plans: false.
 */
export function canCancelDeductionPlans(role: unknown, permissions: unknown): boolean {
  if (!canAccessDeduccionesModule(role, permissions)) return false
  const raw = parseRawPermissions(permissions)
  if (raw.can_cancel_deduction_plans === false) return false
  return true
}
