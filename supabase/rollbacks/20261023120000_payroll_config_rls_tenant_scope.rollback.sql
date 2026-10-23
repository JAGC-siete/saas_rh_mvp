-- Rollback for 20261023120000_payroll_config_rls_tenant_scope.sql
-- Restores payroll_config_write_admins exactly as in prod on 2026-10-21
-- (from pg_policy), including the always-true company comparison.
-- Idempotent.

drop policy if exists payroll_config_write_admins on public.company_payroll_configs;

create policy payroll_config_write_admins on public.company_payroll_configs
  for all to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.company_id = up.company_id
        and up.role = any (array['company_admin'::text, 'super_admin'::text])
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.company_id = up.company_id
        and up.role = any (array['company_admin'::text, 'super_admin'::text])
    )
  );
