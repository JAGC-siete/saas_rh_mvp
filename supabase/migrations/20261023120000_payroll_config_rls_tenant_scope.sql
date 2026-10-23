-- Payroll config RLS: a company admin only reaches their own company's config.
--
-- Hole closed (verified against the prod catalog on 2026-10-21):
--   payroll_config_write_admins (FOR ALL) compared up.company_id with itself,
--   which is always true. Any company_admin of any company could read, insert,
--   update and delete every company's company_payroll_configs row through
--   PostgREST (25 companies on 2026-10-23).
--
-- The policy is recreated scoped to the row instead of dropped, so a
-- company_admin keeps every action it had on its OWN company (delete included)
-- and super_admin keeps unrestricted access. The other policies on this table
-- are untouched.
--
-- Rollback: supabase/rollbacks/20261023120000_payroll_config_rls_tenant_scope.rollback.sql
-- Tests:    scripts/test-rls-payroll-config-local.sh (local Postgres only)
--
-- Verify in prod after applying (expect: t | t | t | c2d120bd0b39163361bd7baa7b6b73da):
--   select
--     count(*) = 6,
--     bool_and(coalesce(pg_get_expr(polqual, polrelid), '') !~ 'up\.company_id = up\.company_id'),
--     bool_or(polname = 'payroll_config_write_admins'
--       and pg_get_expr(polqual, polrelid) ~ 'company_payroll_configs\.company_id'),
--     md5(string_agg(polname || '|' || polpermissive::text || '|' || polcmd::text || '|'
--       || polroles::regrole[]::text || '|' || coalesce(pg_get_expr(polqual, polrelid), '') || '|'
--       || coalesce(pg_get_expr(polwithcheck, polrelid), ''), E'\n' order by polname)
--       filter (where polname <> 'payroll_config_write_admins'))
--   from pg_policy where polrelid = 'public.company_payroll_configs'::regclass;
--   The md5 covers the 5 untouched policies as they were on 2026-10-23.

drop policy if exists payroll_config_write_admins on public.company_payroll_configs;

create policy payroll_config_write_admins on public.company_payroll_configs
  for all to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = (select auth.uid())
        and (
          up.role = 'super_admin'
          or (up.role = 'company_admin' and up.company_id = company_payroll_configs.company_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
      where up.id = (select auth.uid())
        and (
          up.role = 'super_admin'
          or (up.role = 'company_admin' and up.company_id = company_payroll_configs.company_id)
        )
    )
  );
