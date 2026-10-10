-- The reports_* functions are SECURITY DEFINER and take any p_company_id, so an anon
-- caller with the public key could read another company's employees and payroll.
-- Every caller is a server API route using the user session (authenticated) or
-- service_role, so anon never needs them. authenticated keeps EXECUTE for now; the
-- cross-company check for logged-in users is a separate fix.
-- PUBLIC is revoked too: Postgres grants EXECUTE to PUBLIC by default on new functions.

REVOKE EXECUTE ON FUNCTION public.reports_attendance(uuid, date, date, uuid[], uuid[], text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reports_attendance_summary(uuid, date, date, uuid[], uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reports_calculate_severance(uuid, uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reports_employees(uuid, text, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reports_employees_summary(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reports_payroll(uuid, date, date, uuid[], uuid[], text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reports_payroll_summary(uuid, date, date, uuid[], uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reports_work_certificate_data(uuid, uuid, date) FROM PUBLIC, anon;
