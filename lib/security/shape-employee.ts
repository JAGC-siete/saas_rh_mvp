/**
 * Employee API response shaping for field-level security.
 * Every endpoint that returns employee data MUST call shapeEmployee(s).
 */
import type { FieldAccessContext } from './field-access'

/** Columns that must never appear in API/export payloads when salary view is denied. */
export const SALARY_SENSITIVE_EMPLOYEE_KEYS = [
  'base_salary',
  'hourly_rate_reference',
  'monthly_salary',
  'base_salary_used',
] as const

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

function stripSalarySensitiveFields<T extends Record<string, unknown>>(record: T): T {
  const shaped = { ...record }
  for (const key of SALARY_SENSITIVE_EMPLOYEE_KEYS) {
    delete shaped[key]
  }
  return shaped
}

export function shapeEmployee<T extends Record<string, unknown>>(
  employee: T,
  ctx: FieldAccessContext
): T & { base_salary_masked?: boolean } {
  if (ctx.canViewSalary) {
    return employee
  }
  return { ...stripSalarySensitiveFields(employee), base_salary_masked: true }
}

/** Sum/average salary aggregates; empty when view is denied (omit from JSON responses). */
export function computeSalaryAggregates(
  employees: Array<{ base_salary?: number | null }>,
  ctx: FieldAccessContext
): { totalPayroll?: number; averageSalary?: number; totalSalary?: number } {
  if (!ctx.canViewSalary || employees.length === 0) {
    return {}
  }
  const totalSalary = employees.reduce((sum, emp) => sum + (Number(emp.base_salary) || 0), 0)
  const averageSalary = totalSalary / employees.length
  return {
    totalSalary,
    totalPayroll: totalSalary,
    averageSalary,
  }
}

/** Redact payroll monetary fields for users without salary view. */
export function shapePayrollRecord<T extends Record<string, unknown>>(
  record: T,
  ctx: FieldAccessContext
): T {
  if (ctx.canViewSalary) return record
  const shaped = { ...record }
  for (const key of [
    'net_salary',
    'gross_salary',
    'base_salary',
    'total_earnings',
    'total_deductions',
    'eff_bruto',
    'eff_neto',
    'eff_ihss',
    'eff_rap',
    'eff_isr',
  ] as const) {
    delete shaped[key]
  }
  return shaped
}

export type EmployeeExportReportData = {
  employees: Record<string, unknown>[]
  stats?: Record<string, unknown>
  departmentStats?: Array<Record<string, unknown>>
}

export function shapeEmployeeExportReportData(
  data: EmployeeExportReportData,
  ctx: FieldAccessContext
): EmployeeExportReportData {
  const employees = shapeEmployees(data.employees || [], ctx)
  if (ctx.canViewSalary) {
    return { ...data, employees }
  }
  const stats = data.stats ? { ...data.stats } : undefined
  if (stats) {
    delete stats.totalSalary
    delete stats.averageSalary
    delete stats.totalPayroll
  }
  const departmentStats = data.departmentStats?.map((row) => {
    const next = { ...row }
    delete next.totalSalary
    return next
  })
  return { employees, stats, departmentStats }
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
