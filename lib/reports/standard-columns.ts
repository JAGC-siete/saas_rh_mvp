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
  { id: 'emp_name', label: 'Nombre', order: 2, sourceField: 'employee_name', source: 'standard' },
  { id: 'department', label: 'Departamento', order: 3, sourceField: 'department', source: 'standard' },
  { id: 'position', label: 'Puesto', order: 4, sourceField: 'position', source: 'standard' },
  { id: 'days_worked', label: 'Días', order: 5, sourceField: 'days_worked', source: 'standard' },
  { id: 'hours', label: 'Horas', order: 6, sourceField: 'total_hours_worked', source: 'standard' },
  { id: 'hourly_rate', label: 'Tarifa/Hora', order: 7, sourceField: 'hourly_rate', source: 'standard' },
  { id: 'base_salary', label: 'Salario Base', order: 8, sourceField: 'base_salary', source: 'standard' },
  { id: 'septimo_dia', label: 'Séptimo Día', order: 9, sourceField: 'septimo_dia', source: 'standard' },
  { id: 'gross_salary', label: 'Devengado', order: 10, sourceField: 'gross_salary', source: 'standard' },
  { id: 'ihss', label: 'IHSS', order: 11, sourceField: 'IHSS', source: 'standard' },
  { id: 'rap', label: 'RAP', order: 12, sourceField: 'RAP', source: 'standard' },
  { id: 'isr', label: 'ISR', order: 13, sourceField: 'ISR', source: 'standard' },
  { id: 'total_deductions', label: 'Deducciones', order: 14, sourceField: 'total_deductions', source: 'standard' },
  { id: 'net_salary', label: 'Neto', order: 15, sourceField: 'net_salary', source: 'standard' },
  /** Solo listados / export CSV-XLSX; no forman parte de la tabla del PDF de planilla. */
  { id: 'period', label: 'Período', order: 16, sourceField: 'period', source: 'standard' },
  { id: 'status', label: 'Estado', order: 17, sourceField: 'status', source: 'standard' }
]

const EMPLOYEES_COLUMNS: StandardColumnDef[] = [
  { id: 'emp_code', label: 'Código', order: 1, sourceField: 'employee_code', source: 'standard' },
  { id: 'name', label: 'Nombre', order: 2, sourceField: 'name', source: 'standard' },
  { id: 'position', label: 'Cargo', order: 3, sourceField: 'position', source: 'standard' },
  { id: 'department', label: 'Departamento', order: 4, sourceField: 'department_name', source: 'standard' },
  { id: 'status', label: 'Estado', order: 5, sourceField: 'status', source: 'standard' },
  { id: 'hire_date', label: 'Fecha Ingreso', order: 6, sourceField: 'hire_date', source: 'standard' }
]

/** Secciones/campos del recibo de pago (denarius) — visibilidad y etiquetas en PDF. */
const VOUCHER_COLUMNS: StandardColumnDef[] = [
  { id: 'emp_code', label: 'Código', order: 1, sourceField: 'employee_code', source: 'standard' },
  { id: 'emp_name', label: 'Nombre', order: 2, sourceField: 'employee_name', source: 'standard' },
  { id: 'department', label: 'Departamento', order: 3, sourceField: 'department', source: 'standard' },
  { id: 'position', label: 'Posición', order: 4, sourceField: 'position', source: 'standard' },
  { id: 'period', label: 'Período', order: 5, sourceField: 'period', source: 'standard' },
  { id: 'days_worked', label: 'Días trabajados', order: 6, sourceField: 'days_worked', source: 'standard' },
  { id: 'base_salary', label: 'Salario base', order: 7, sourceField: 'base_salary', source: 'standard' },
  { id: 'septimo_dia', label: 'Séptimo día', order: 8, sourceField: 'septimo_dia', source: 'standard' },
  { id: 'overtime_pay', label: 'Horas extras', order: 9, sourceField: 'overtime_pay', source: 'standard' },
  { id: 'ihss', label: 'IHSS', order: 10, sourceField: 'social_security', source: 'standard' },
  { id: 'rap', label: 'RAP', order: 11, sourceField: 'professional_tax', source: 'standard' },
  { id: 'isr', label: 'ISR', order: 12, sourceField: 'income_tax', source: 'standard' },
  { id: 'custom_deductions', label: 'Deducciones adicionales', order: 13, sourceField: 'custom_deductions', source: 'standard' },
  { id: 'total_deductions', label: 'Total deducciones', order: 14, sourceField: 'total_deductions', source: 'standard' },
  { id: 'net_salary', label: 'Total a recibir', order: 15, sourceField: 'net_salary', source: 'standard' },
  { id: 'bank_name', label: 'Banco', order: 16, sourceField: 'bank_name', source: 'standard' },
  { id: 'bank_account', label: 'Cuenta bancaria', order: 17, sourceField: 'bank_account', source: 'standard' },
  { id: 'legal_notes', label: 'Notas legales', order: 18, sourceField: 'legal_notes', source: 'standard' },
  { id: 'signatures', label: 'Firmas', order: 19, sourceField: 'signatures', source: 'standard' }
]

const STANDARD_COLUMNS: Record<ReportType, StandardColumnDef[]> = {
  attendance: ATTENDANCE_COLUMNS,
  payroll: PAYROLL_COLUMNS,
  employees: EMPLOYEES_COLUMNS,
  work_certificate: [],
  severance: [],
  voucher: VOUCHER_COLUMNS
}

export function getStandardColumns(reportType: ReportType): StandardColumnDef[] {
  return STANDARD_COLUMNS[reportType] ?? []
}
