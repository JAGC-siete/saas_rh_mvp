-- Local-only fixture: company_payroll_configs as in production (Planilla) on
-- 2026-10-23, policies verbatim from pg_policy. Loads on top of
-- 00_prod_snapshot_20261016.sql (roles, auth helpers, user_profiles).
-- No row data. Never run against Supabase.

\set ON_ERROR_STOP on

-- companies FK dropped: the fixture has no companies table
create table public.company_payroll_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique,
  calculation_type text default 'standard'
    check (calculation_type = any (array['standard'::text, 'formula_based'::text, 'custom'::text])),
  is_active boolean default true,
  custom_fields jsonb default '{}'::jsonb,
  calculation_config jsonb default '{}'::jsonb,
  calculation_script text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  payment_frequency text
    check (payment_frequency is null or payment_frequency = any (array['quincenal'::text, 'mensual'::text, 'semanal'::text])),
  payment_day integer check (payment_day is null or (payment_day >= 1 and payment_day <= 31)),
  quincena_config jsonb default '{"first_end": 15, "second_end": 30, "first_start": 1, "second_start": 16}'::jsonb,
  calculation_mode text default 'daily'
    check (calculation_mode is null or calculation_mode = any (array['daily'::text, 'hourly'::text, 'admin_floor'::text])),
  incomplete_record_default_hours numeric
    check (incomplete_record_default_hours is null or (incomplete_record_default_hours >= 0 and incomplete_record_default_hours <= 24))
);

create trigger update_company_payroll_configs_updated_at
  before update on public.company_payroll_configs
  for each row execute function public.update_updated_at_column();

grant all on public.company_payroll_configs to anon, authenticated, service_role;
alter table public.company_payroll_configs enable row level security;

create policy payroll_config_admin_delete on public.company_payroll_configs
  for delete to authenticated
  using (exists (select 1 from user_profiles up where up.id = auth.uid() and up.role = 'super_admin'::text));

create policy payroll_config_admin_insert on public.company_payroll_configs
  for insert to authenticated
  with check (exists (select 1 from user_profiles up where up.id = auth.uid()
    and (up.role = 'super_admin'::text or (up.role = 'company_admin'::text and up.company_id = company_payroll_configs.company_id))));

create policy payroll_config_admin_update on public.company_payroll_configs
  for update to authenticated
  using (exists (select 1 from user_profiles up where up.id = auth.uid()
    and (up.role = 'super_admin'::text or (up.role = 'company_admin'::text and up.company_id = company_payroll_configs.company_id))))
  with check (exists (select 1 from user_profiles up where up.id = auth.uid()
    and (up.role = 'super_admin'::text or (up.role = 'company_admin'::text and up.company_id = company_payroll_configs.company_id))));

create policy payroll_config_read_company on public.company_payroll_configs
  for select to authenticated
  using (company_id in (select up.company_id from user_profiles up where up.id = auth.uid()));

create policy payroll_config_select_by_company on public.company_payroll_configs
  for select to authenticated
  using ((exists (select 1 from user_profiles up where up.id = auth.uid() and up.role = 'super_admin'::text))
    or (company_id in (select up.company_id from user_profiles up where up.id = auth.uid() and up.company_id is not null)));

create policy payroll_config_write_admins on public.company_payroll_configs
  for all to authenticated
  using (exists (select 1 from user_profiles up where up.id = auth.uid() and up.company_id = up.company_id
    and up.role = any (array['company_admin'::text, 'super_admin'::text])))
  with check (exists (select 1 from user_profiles up where up.id = auth.uid() and up.company_id = up.company_id
    and up.role = any (array['company_admin'::text, 'super_admin'::text])));
