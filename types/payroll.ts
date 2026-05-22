// Payroll Types and Contracts for Frontend Integration
// These types define the minimal contracts between frontend and backend

export type Quincena = 1 | 2;
export type TipoCalculo = 'CON' | 'SIN' | '2PAGOS';

/**
 * Tipo extendido para payroll_runs.
 * La columna tipo aceptará '13AVO', '14AVO' y '2PAGOS' además de 'CON' y 'SIN'.
 */
export type PayrollRunTipo = TipoCalculo | '13AVO' | '14AVO';

/**
 * Metadata específica para payroll_run_lines cuando el run es 13AVO o 14AVO.
 * Se almacena en payroll_run_lines.metadata (JSONB).
 * 13avo y 14avo no llevan deducciones IHSS/RAP/ISR → is_tax_exempt: true.
 */
export interface PayrollRunLineMetadata1314 {
  is_tax_exempt?: boolean;
  avg_salary?: number;
  days_worked?: number;
  months_worked?: number;
  [key: string]: unknown;
}

export type RunStatus = 'draft' | 'edited' | 'authorized' | 'distributed';
export type EditField = 'days_worked' | 'total_earnings' | 'IHSS' | 'RAP' | 'ISR' | 'total';

// API Request/Response Contracts
export interface PreviewRequest {
  year: number;
  month: number;
  quincena: Quincena;
  tipo: TipoCalculo;
}

export interface PreviewResponse {
  message: string;
  run_id: string;
  year: number;
  month: number;
  quincena: number;
  tipo: string;
  empleados: number;
  totalBruto: number;
  totalDeducciones: number;
  totalNeto: number;
  planilla: PayrollLine[];
  warning?: string | null;
  status?: string;
  incompleteRecordsAlert?: { employee_id: string; employee_name: string; dates: string[] }[];
  noAttendanceWarning?: {
    message: string;
    detail: string;
    action: string;
  } | null;
  attendanceExemptSummary?: {
    count: number;
    employees: { employee_id: string; employee_name: string }[];
    message: string;
  };
}

export interface EditRequest {
  run_line_id: string;
  field: EditField;
  new_value: number;
  reason?: string;
}

export interface EditResponse {
  message: string;
  ok: boolean;
  run_line_id: string;
  edited: boolean;
  adjustment: {
    id: string;
    field: EditField;
    old_value: number;
    new_value: number;
    reason: string;
    created_at: string;
  };
  updated_line: {
    eff_hours: number;
    eff_bruto: number;
    eff_ihss: number;
    eff_rap: number;
    eff_isr: number;
    eff_neto: number;
    edited: boolean;
    updated_at: string;
  };
}

export interface AuthorizeRequest {
  run_id: string;
}

export interface AuthorizeResponse {
  message: string;
  ok: boolean;
  run_id: string;
  status: RunStatus;
  artifact_url: string;
  vouchers: Array<{
    employee_id: string;
    url: string;
  }>;
  warning?: string | null;
  summary: {
    total_lines: number;
    edited_lines: number;
    total_bruto: number;
    total_deducciones: number;
    total_neto: number;
  };
}

export interface SendMailRequest {
  run_id: string;
  employee_id?: string;
}

export interface SendResponse {
  message: string;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    employee_id: string;
    email: string;
    success: boolean;
    message_id?: string;
    error?: string;
  }>;
}

// Data Models
export interface PayrollLine {
  id: string;
  name: string;
  bank: string;
  bank_account: string;
  department: string;
  monthly_salary: number;
  days_worked: number;
  days_absent: number;
  total_earnings: number;
  IHSS: number;
  RAP: number;
  ISR: number;
  total_deducciones: number;
  total: number;
  line_id: string;
}

export interface PayrollRun {
  id: string;
  company_id: string;
  year: number;
  month: number;
  quincena: Quincena;
  /** Extendido para soportar 13AVO y 14AVO además de CON y SIN */
  tipo: PayrollRunTipo;
  status: RunStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollRunLine {
  id: string;
  run_id: string;
  company_id: string;
  employee_id: string;
  calc_hours: number;
  calc_bruto: number;
  calc_ihss: number;
  calc_rap: number;
  calc_isr: number;
  calc_neto: number;
  eff_hours: number;
  eff_bruto: number;
  eff_ihss: number;
  eff_rap: number;
  eff_isr: number;
  eff_neto: number;
  edited: boolean;
  created_at: string;
  updated_at: string;
  /** Para runs 13AVO/14AVO: is_tax_exempt, avg_salary, days_worked, etc. */
  metadata?: PayrollRunLineMetadata1314 | null;
}

export interface PayrollAdjustment {
  id: string;
  run_line_id: string;
  company_id: string;
  field: EditField;
  old_value: number;
  reason: string;
  user_id: string;
  created_at: string;
}

// UI State Types
export type UIRunStatus =
  | 'idle'
  | 'previewing'
  | 'draft'
  | 'editing'
  | 'edited'
  | 'authorizing'
  | 'authorized'
  | 'distributed'
  | 'distributing'
  | 'error';

export interface PayrollFilters {
  year: number;
  month: number;
  quincena: Quincena;
  tipo: TipoCalculo;
}

export interface PayrollState {
  status: UIRunStatus;
  runId?: string;
  filters: PayrollFilters;
  planilla: PayrollLine[];
  error?: string;
  loading: boolean;
}

// Error Types
export interface PayrollError {
  error: string;
  message: string;
  errorCode?: string;
  httpStatus?: number;
}

// Toast/Notification Types
export interface PayrollToast {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
