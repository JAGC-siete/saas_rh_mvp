-- Hot-path FK indexes (additive) + drop advisor-identical duplicate indexes.
-- Access-preserving; no RLS/policy changes.

-- ========== Add missing FK indexes ==========
CREATE INDEX IF NOT EXISTS idx_employees_work_schedule_id
  ON public.employees (work_schedule_id);

CREATE INDEX IF NOT EXISTS idx_attendance_events_ref_record_id
  ON public.attendance_events (ref_record_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_approved_by
  ON public.attendance_records (approved_by);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_attendance_record_id
  ON public.attendance_corrections (attendance_record_id);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_reviewed_by
  ON public.attendance_corrections (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_departments_manager_id
  ON public.departments (manager_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by
  ON public.leave_requests (approved_by);

CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id
  ON public.leave_requests (leave_type_id);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_authorized_by
  ON public.payroll_runs (authorized_by);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_created_by
  ON public.payroll_runs (created_by);

-- ========== Drop identical duplicates (keep canonical name) ==========
DROP INDEX IF EXISTS public.idx_attendance_events_event_uid_unique;
-- unique_employee_date is constraint-backed; drop the plain duplicate instead
DROP INDEX IF EXISTS public.uq_attendance_employee_date;
DROP INDEX IF EXISTS public.idx_attendance_records_event_uid;
DROP INDEX IF EXISTS public.idx_departments_company_temp;
DROP INDEX IF EXISTS public.idx_devices_company;
DROP INDEX IF EXISTS public.ux_employee_sessions_token_hash;
DROP INDEX IF EXISTS public.employee_habits_company_idx;
DROP INDEX IF EXISTS public.employee_habits_employee_idx;
