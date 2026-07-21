-- Fix ERROR security_definer_view (lint 0010).
-- Default views run as owner (postgres) and bypass RLS on base tables.
-- With security_invoker=true, the caller's privileges + RLS apply.
-- Docs: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

ALTER VIEW public.v_payroll_lines_effective SET (security_invoker = true);
ALTER VIEW public.realtime_leaderboard SET (security_invoker = true);
ALTER VIEW public.v_employees_norm SET (security_invoker = true);
ALTER VIEW public.v_company_effective_features SET (security_invoker = true);
ALTER VIEW public.marketing_activaciones_backfill_summary SET (security_invoker = true);
ALTER VIEW public.marketing_current_customer_contacts SET (security_invoker = true);
ALTER VIEW public.marketing_lead_inventory SET (security_invoker = true);
ALTER VIEW public.marketing_p2_backfill_summary SET (security_invoker = true);

-- Product views: no anonymous PostgREST access
REVOKE ALL ON public.v_payroll_lines_effective FROM anon;
REVOKE ALL ON public.realtime_leaderboard FROM anon;
REVOKE ALL ON public.v_employees_norm FROM anon;
REVOKE ALL ON public.v_company_effective_features FROM anon;

-- Marketing ops views: backend/service_role only (scripts + admin clients)
REVOKE ALL ON public.marketing_activaciones_backfill_summary FROM anon, authenticated;
REVOKE ALL ON public.marketing_current_customer_contacts FROM anon, authenticated;
REVOKE ALL ON public.marketing_lead_inventory FROM anon, authenticated;
REVOKE ALL ON public.marketing_p2_backfill_summary FROM anon, authenticated;
