import type { ReportType } from './report-config-schema'

export interface StandardColumnDef {
  id: string
  label: string
  order: number
  sourceField: string
  source?: 'standard'
}

const ATTENDANCE_COLUMNS: StandardColumnDef[] = [
  { id: 'emp_code', label: 'Código', order: 1, sourceField: 'employee_code', source: 'standard' },
  { id: 'emp_name', label: 'Empleado', order: 2, sourceField: 'employee_name', source: 'standard' },
  { id: 'date', label: 'Fecha', order: 3, sourceField: 'date', source: 'standard' },
  { id: 'check_in', label: 'Entrada', order: 4, sourceField: 'check_in', source: 'standard' },
  { id: 'check_out', label: 'Salida', order: 5, sourceField: 'check_out', source: 'standard' },
  { id: 'lunch_start', label: 'Inicio Almuerzo', order: 6, sourceField: 'lunch_start', source: 'standard' },
  { id: 'lunch_end', label: 'Fin Almuerzo', order: 7, sourceField: 'lunch_end', source: 'standard' },
  { id: 'status', label: 'Estado', order: 8, sourceField: 'status', source: 'standard' },
  { id: 'hours_worked', label: 'Horas', order: 9, sourceField: 'hours_worked', source: 'standard' },
  { id: 'late_minutes', label: 'Min Tardanza', order: 10, sourceField: 'late_minutes', source: 'standard' },
  { id: 'justification', label: 'Justificación', order: 11, sourceField: 'justification', source: 'standard' }
]

const PAYROLL_COLUMNS: StandardColumnDef[] = [
  { id: 'emp_code', label: 'Código', order: 1, sourceField: 'employee_code', source: 'standard' },
  { id: 'emp_name', label: 'Empleado', order: 2, sourceField: 'employee_name', source: 'standard' },
  { id: 'period', label: 'Período', order: 3, sourceField: 'period', source: 'standard' },
  { id: 'gross_salary', label: 'Devengado', order: 4, sourceField: 'gross_salary', source: 'standard' },
  { id: 'total_deductions', label: 'Deducciones', order: 5, sourceField: 'total_deductions', source: 'standard' },
  { id: 'net_salary', label: 'Neto', order: 6, sourceField: 'net_salary', source: 'standard' },
  { id: 'status', label: 'Estado', order: 7, sourceField: 'status', source: 'standard' }
]

const EMPLOYEES_COLUMNS: StandardColumnDef[] = [
  { id: 'emp_code', label: 'Código', order: 1, sourceField: 'employee_code', source: 'standard' },
  { id: 'name', label: 'Nombre', order: 2, sourceField: 'name', source: 'standard' },
  { id: 'position', label: 'Cargo', order: 3, sourceField: 'position', source: 'standard' },
  { id: 'department', label: 'Departamento', order: 4, sourceField: 'department_name', source: 'standard' },
  { id: 'status', label: 'Estado', order: 5, sourceField: 'status', source: 'standard' },
  { id: 'hire_date', label: 'Fecha Ingreso', order: 6, sourceField: 'hire_date', source: 'standard' }
]

const STANDARD_COLUMNS: Record<ReportType, StandardColumnDef[]> = {
  attendance: ATTENDANCE_COLUMNS,
  payroll: PAYROLL_COLUMNS,
  employees: EMPLOYEES_COLUMNS,
  work_certificate: [],
  severance: []
}

export function getStandardColumns(reportType: ReportType): StandardColumnDef[] {
  return STANDARD_COLUMNS[reportType] ?? []
}
