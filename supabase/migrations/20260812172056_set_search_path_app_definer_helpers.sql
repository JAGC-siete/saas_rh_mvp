-- Pin search_path on SECURITY DEFINER helpers the app actually calls (RPC / RLS).
-- Access-preserving: no REVOKE, no body changes.
-- Uses pg_catalog, public (matches existing hardened helpers in this project).

-- Core identity / RLS used by app queries
ALTER FUNCTION public.get_user_company()
  SET search_path TO pg_catalog, public;

ALTER FUNCTION helpers.is_admin_for_company(p_uid uuid, p_company uuid)
  SET search_path TO helpers, pg_catalog, public;

-- Session / auth RPCs
ALTER FUNCTION public.create_user_session(p_user_id uuid, p_session_token text, p_device_id text, p_ip_hash text, p_ua_hash text, p_company_id uuid, p_access_token_ttl_seconds integer, p_idle_timeout_minutes integer)
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.is_session_active(p_session_token text)
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.update_session_activity(p_session_token text, p_user_id uuid)
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.revoke_user_session(p_session_token text, p_reason text)
  SET search_path TO pg_catalog, public;

-- Attendance RPCs
ALTER FUNCTION public.attendance_employee_timeline(p_employee_id uuid, p_from text, p_to text)
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.attendance_kpis_filtered(p_employee_id uuid, p_from text, p_to text, p_role text, p_department_id uuid, p_company_id uuid)
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.attendance_lists_filtered(p_employee_id uuid, p_from text, p_to text, p_type text, p_role text, p_department_id uuid, p_company_id uuid)
  SET search_path TO pg_catalog, public;

-- Payroll RPC
ALTER FUNCTION public.apply_payroll_adjustment(p_run_line_id uuid, p_company_id uuid, p_field text, p_new_value numeric, p_reason text, p_user_id uuid)
  SET search_path TO pg_catalog, public;

-- Reports RPCs
ALTER FUNCTION public.reports_attendance(p_company_id uuid, p_from date, p_to date, p_employee_ids uuid[], p_department_ids uuid[], p_status_filter text[])
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.reports_attendance_summary(p_company_id uuid, p_from date, p_to date, p_employee_ids uuid[], p_department_ids uuid[])
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.reports_calculate_severance(p_company_id uuid, p_employee_id uuid, p_termination_date date)
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.reports_employees(p_company_id uuid, p_status_filter text, p_department_ids uuid[])
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.reports_employees_summary(p_company_id uuid, p_department_ids uuid[])
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.reports_payroll(p_company_id uuid, p_from date, p_to date, p_employee_ids uuid[], p_department_ids uuid[], p_payroll_type text)
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.reports_payroll_summary(p_company_id uuid, p_from date, p_to date, p_employee_ids uuid[], p_department_ids uuid[])
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.reports_work_certificate_data(p_company_id uuid, p_employee_id uuid, p_certificate_date date)
  SET search_path TO pg_catalog, public;
