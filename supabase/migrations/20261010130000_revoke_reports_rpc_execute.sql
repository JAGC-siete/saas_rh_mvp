-- The reports_* functions are SECURITY DEFINER and trust p_company_id without checking
-- the caller, so any logged-in user could call supabase.rpc('reports_payroll', ...) with
-- another company's id and read its employees, DNI and salaries.
-- 20261010120000 already revoked PUBLIC/anon; this closes authenticated.
-- Only the API (service_role, after requireCompanyAccess) needs to call them.
-- PUBLIC/anon are repeated so this file stands on its own (REVOKE is idempotent).
--
-- Deploy the API change (routes calling these via the admin client) BEFORE applying this,
-- or reports fail with "permission denied" in between.

REVOKE EXECUTE ON FUNCTION public.reports_attendance(uuid, date, date, uuid[], uuid[], text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reports_attendance_summary(uuid, date, date, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reports_employees(uuid, text, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reports_employees_summary(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reports_payroll(uuid, date, date, uuid[], uuid[], text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reports_payroll_summary(uuid, date, date, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reports_work_certificate_data(uuid, uuid, date) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reports_attendance(uuid, date, date, uuid[], uuid[], text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.reports_attendance_summary(uuid, date, date, uuid[], uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.reports_employees(uuid, text, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.reports_employees_summary(uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.reports_payroll(uuid, date, date, uuid[], uuid[], text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reports_payroll_summary(uuid, date, date, uuid[], uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.reports_work_certificate_data(uuid, uuid, date) TO service_role;

-- reports_calculate_severance may be dropped by the severance unification (lib/payroll/cesantias.ts);
-- guard so this migration still applies if that lands first.
DO $$
BEGIN
  IF to_regprocedure('public.reports_calculate_severance(uuid, uuid, date)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.reports_calculate_severance(uuid, uuid, date) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.reports_calculate_severance(uuid, uuid, date) TO service_role;
  END IF;
END $$;
