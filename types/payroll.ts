// Payroll Types and Contracts for Frontend Integration
// These types define the minimal contracts between frontend and backend

export type Quincena = 1 | 2;
export type TipoCalculo = 'CON' | 'SIN';
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
  company_uuid: string;
  year: number;
  month: number;
  quincena: Quincena;
  tipo: TipoCalculo;
  status: RunStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollRunLine {
  id: string;
  run_id: string;
  company_uuid: string;
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
}

export interface PayrollAdjustment {
  id: string;
  run_line_id: string;
  company_uuid: string;
  field: EditField;
  old_value: number;
  reason: string;
  user_id: string;
  created_at: string;
}

// UI State Types
export type UIRunStatus = 'idle' | 'previewing' | 'draft' | 'editing' | 'authorizing' | 'authorized' | 'distributing' | 'error';

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
