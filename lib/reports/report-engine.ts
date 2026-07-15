import type { ResolvedColumn } from './column-resolver'
import {
  formatTimeDisplayInZone,
  formatDateOnlyForLocale,
  parseDateOnlyAsHonduras
} from '../timezone'
import { reportFormatForCountry, type ReportFormatContext } from '../country/payroll-labels'

const DEFAULT_REPORT_FMT: ReportFormatContext = reportFormatForCountry('HND')

export type { ReportFormatContext }

/**
 * Report engine - Strategy-style helpers for metadata-driven report generation.
 * Provides header extraction and row rendering per report type.
 */

export function getHeaders(columns: ResolvedColumn[]): string[] {
  return columns.map((c) => c.label)
}

function getAttendanceRowValue(
  record: any,
  col: ResolvedColumn,
  employeeById: Map<string, any>,
  ctx: ReportFormatContext,
  timeFormat?: '24h' | '12h'
): string | number {
  const emp = record.employees || employeeById.get(record.employee_id)
  const empName = emp?.name ?? record.employee_id
  const empCode = emp?.employee_code ?? ''
  const hour12 = timeFormat === '12h'

  switch (col.sourceField) {
    case 'employee_code':
      return empCode
    case 'employee_name':
      return empName
    case 'date':
      return record.date ? formatDateOnlyForLocale(record.date, ctx.locale, ctx.timeZone) : ''
    case 'check_in':
      return record.check_in ? formatTimeDisplayInZone(record.check_in, ctx.locale, ctx.timeZone, { hour12 }) : ''
    case 'check_out':
      return record.check_out ? formatTimeDisplayInZone(record.check_out, ctx.locale, ctx.timeZone, { hour12 }) : ''
    case 'lunch_start':
      return record.lunch_start ? formatTimeDisplayInZone(record.lunch_start, ctx.locale, ctx.timeZone, { hour12 }) : ''
    case 'lunch_end':
      return record.lunch_end ? formatTimeDisplayInZone(record.lunch_end, ctx.locale, ctx.timeZone, { hour12 }) : ''
    case 'status':
      return record.status ?? ''
    case 'hours_worked': {
      if (record.check_in && record.check_out) {
        let totalMs = new Date(record.check_out).getTime() - new Date(record.check_in).getTime()
        if (record.lunch_start && record.lunch_end) {
          const lunchMs = new Date(record.lunch_end).getTime() - new Date(record.lunch_start).getTime()
          totalMs -= lunchMs
        }
        const hours = totalMs / (1000 * 60 * 60)
        return Number(hours.toFixed(1))
      }
      return 0
    }
    case 'late_minutes':
      return record.late_minutes ?? 0
    case 'justification':
      return record.justification ?? ''
    default:
      if (col.source === 'payroll_config') {
        const val = (record.metadata as Record<string, unknown>)?.[col.sourceField]
        return val !== undefined && val !== null ? String(val) : ''
      }
      return ''
  }
}

/** Mismo criterio que attendance_lists_filtered: nombre de empleado, luego fecha. */
export function sortAttendanceRecordsForExport(attendance: any[], employees: any[]): any[] {
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const employeeName = (record: any) => {
    const emp = record.employees || employeeById.get(record.employee_id)
    return String(emp?.name ?? record.employee_id ?? '')
  }

  return [...attendance].sort((a, b) => {
    const byName = employeeName(a).localeCompare(employeeName(b), 'es', { sensitivity: 'base' })
    if (byName !== 0) return byName
    const byDate = String(a.date ?? '').localeCompare(String(b.date ?? ''))
    if (byDate !== 0) return byDate
    return String(a.check_in ?? '').localeCompare(String(b.check_in ?? ''))
  })
}

export function renderAttendanceRows(
  attendance: any[],
  employees: any[],
  columns: ResolvedColumn[],
  fmt: ReportFormatContext = DEFAULT_REPORT_FMT,
  opts?: { timeFormat?: '24h' | '12h' }
): (string | number)[][] {
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const sorted = sortAttendanceRecordsForExport(attendance, employees)
  return sorted.map((r) =>
    columns.map((col) => getAttendanceRowValue(r, col, employeeById, fmt, opts?.timeFormat))
  )
}

function getPayrollRowValue(
  record: any,
  col: ResolvedColumn,
  employeeById: Map<string, any>,
  ctx: ReportFormatContext
): string | number {
  const emp = record.employees ?? employeeById.get(record.employee_id)
  const empName = emp?.name ?? record.employee_id
  const empCode = emp?.employee_code ?? ''

  if (col.source === 'payroll_config') {
    const meta = (record.metadata ?? record) as Record<string, unknown>
    const val = meta[col.sourceField]
    if (val !== undefined && val !== null) {
      return typeof val === 'number' ? val : String(val)
    }
    return ''
  }

  switch (col.sourceField) {
    case 'employee_code':
      return empCode
    case 'employee_name':
      return empName
    case 'department':
      return (
        emp?.departments?.name ??
        (Array.isArray(emp?.departments) ? emp?.departments[0]?.name : undefined) ??
        record.department ??
        ''
      )
    case 'position':
      return emp?.position ?? emp?.role ?? record.position ?? record.role ?? ''
    case 'days_worked':
      return record.days_worked ?? record.eff_hours ?? ''
    case 'total_hours_worked':
      return record.total_hours_worked ?? record.eff_hours ?? ''
    case 'hourly_rate':
      return record.hourly_rate ?? ''
    case 'base_salary':
      return emp?.base_salary ?? record.base_salary ?? record.monthly_salary ?? ''
    case 'biweekly_salary': {
      const monthly = Number(emp?.base_salary ?? record.base_salary ?? record.monthly_salary ?? 0) || 0
      return monthly / 2
    }
    case 'septimo_dia':
      return record.septimo_dia ?? record.seventh_day_pay ?? 0
    case 'overtime_pay':
      return record.overtime_pay ?? record.metadata?.overtime_pay ?? 0
    case 'IHSS':
      return record.IHSS ?? record.eff_ihss ?? 0
    case 'RAP':
      return record.RAP ?? record.eff_rap ?? 0
    case 'ISR':
      return record.ISR ?? record.eff_isr ?? 0
    case 'period':
      return record.period_start && record.period_end
        ? `${parseDateOnlyAsHonduras(record.period_start).toLocaleDateString(ctx.locale, { timeZone: ctx.timeZone, month: 'short', day: 'numeric' })} - ${parseDateOnlyAsHonduras(record.period_end).toLocaleDateString(ctx.locale, { timeZone: ctx.timeZone, month: 'short', day: 'numeric' })}`
        : ''
    case 'period_start':
      return record.period_start ? formatDateOnlyForLocale(record.period_start, ctx.locale, ctx.timeZone) : ''
    case 'period_end':
      return record.period_end ? formatDateOnlyForLocale(record.period_end, ctx.locale, ctx.timeZone) : ''
    case 'gross_salary':
      return record.gross_salary ?? record.eff_bruto ?? record.total_earnings ?? 0
    case 'total_deductions':
      return record.total_deductions ?? 0
    case 'net_salary':
      return record.net_salary ?? record.eff_neto ?? record.total ?? 0
    case 'status':
      return record.status === 'paid' ? 'Pagado' : record.status === 'approved' ? 'Aprobado' : record.status ?? 'Borrador'
    default:
      return ''
  }
}

export function renderPayrollRows(
  payroll: any[],
  employees: any[],
  columns: ResolvedColumn[],
  fmt: ReportFormatContext = DEFAULT_REPORT_FMT
): (string | number)[][] {
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  return payroll.map((r) =>
    columns.map((col) => getPayrollRowValue(r, col, employeeById, fmt))
  )
}

function getEmployeeRowValue(record: any, col: ResolvedColumn, ctx: ReportFormatContext): string | number {
  const dept = record.departments
  const deptName = Array.isArray(dept) ? dept[0]?.name : dept?.name

  switch (col.sourceField) {
    case 'employee_code':
      return record.employee_code ?? ''
    case 'name':
      return record.name ?? ''
    case 'position':
      return record.position ?? record.role ?? ''
    case 'department_name':
      return deptName ?? ''
    case 'status':
      return record.status === 'active' ? 'Activo' : record.status === 'inactive' ? 'Inactivo' : record.status ?? ''
    case 'hire_date':
      return record.hire_date ? formatDateOnlyForLocale(record.hire_date, ctx.locale, ctx.timeZone) : ''
    default:
      return ''
  }
}

export function renderEmployeesRows(
  employees: any[],
  columns: ResolvedColumn[],
  fmt: ReportFormatContext = DEFAULT_REPORT_FMT
): (string | number)[][] {
  return employees.map((r) => columns.map((col) => getEmployeeRowValue(r, col, fmt)))
}
