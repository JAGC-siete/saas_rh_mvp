/**
 * Employee API response shaping for field-level security.
 * Every endpoint that returns employee data MUST call shapeEmployee(s).
 */
import type { FieldAccessContext } from './field-access'

export const EMPLOYEE_WRITE_ALLOWLIST = [
  'employee_code',
  'dni',
  'name',
  'email',
  'phone',
  'role',
  'team',
  'department_id',
  'work_schedule_id',
  'hire_date',
  'termination_date',
  'status',
  'bank_name',
  'bank_account',
  'emergency_contact_name',
  'emergency_contact_phone',
  'address',
  'metadata',
  'payment_frequency',
  'pay_type',
  'quincena_config',
  'termination_reason_code',
  'termination_reason_detail',
] as const

const MASKED_SALARY_PATTERN = /^\s*L\.?\s*\*+/i

function pickAllowed(body: Record<string, unknown>, allowed: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      out[key] = body[key]
    }
  }
  return out
}

export function isValidBaseSalaryValue(value: unknown): value is number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || MASKED_SALARY_PATTERN.test(trimmed)) return false
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) && parsed > 0
  }
  return false
}

export function shapeEmployee<T extends Record<string, unknown>>(
  employee: T,
  ctx: FieldAccessContext
): T & { base_salary_masked?: boolean } {
  if (ctx.canViewSalary) {
    return employee
  }
  const shaped = { ...employee }
  delete shaped.base_salary
  return { ...shaped, base_salary_masked: true }
}

export function shapeEmployees<T extends Record<string, unknown>>(
  employees: T[],
  ctx: FieldAccessContext
): Array<T & { base_salary_masked?: boolean }> {
  return employees.map((emp) => shapeEmployee(emp, ctx))
}

export function buildEmployeeWritePayload(
  body: Record<string, unknown>,
  ctx: FieldAccessContext,
  options: { includeId?: boolean } = {}
): Record<string, unknown> {
  const allowed = ctx.canEditSalary
    ? [...EMPLOYEE_WRITE_ALLOWLIST, 'base_salary']
    : [...EMPLOYEE_WRITE_ALLOWLIST]

  const payload = pickAllowed(body, allowed)

  if (ctx.canEditSalary && Object.prototype.hasOwnProperty.call(body, 'base_salary')) {
    if (!isValidBaseSalaryValue(body.base_salary)) {
      throw new Error('INVALID_BASE_SALARY')
    }
    payload.base_salary =
      typeof body.base_salary === 'number'
        ? body.base_salary
        : Number.parseFloat(String(body.base_salary).trim())
  }

  if (options.includeId && body.id != null) {
    payload.id = body.id
  }

  return payload
}

export function validateCreateSalaryRequirement(
  body: Record<string, unknown>,
  ctx: FieldAccessContext
): { ok: true } | { ok: false; error: string; message: string } {
  if (!ctx.canEditSalary) {
    if (Object.prototype.hasOwnProperty.call(body, 'base_salary')) {
      return {
        ok: false,
        error: 'Insufficient permissions',
        message: 'No tiene permiso para establecer el salario base.',
      }
    }
    return {
      ok: false,
      error: 'Missing required fields',
      message: 'base_salary es requerido pero no tiene permiso para definirlo.',
    }
  }
  if (!isValidBaseSalaryValue(body.base_salary)) {
    return {
      ok: false,
      error: 'Invalid base_salary',
      message: 'base_salary debe ser un número mayor a cero.',
    }
  }
  return { ok: true }
}
