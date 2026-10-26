-- Local-only seed for payroll config RLS tests. Loads after 01_seed.sql
-- (users 4..01 employee, 4..02 manager, 4..04 hr_manager, 4..05 company_admin
-- of company 1; 4..07 super_admin; helpers t_as / t_expect / t_rows).
--   Company 1: config 7..01 | Company 2: config 7..02, admin 4..08
--   Company 3: no config yet, admin 4..09
\set ON_ERROR_STOP on

insert into public.user_profiles (id, company_id, employee_id, role) values
  ('40000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', null, 'company_admin'),
  ('40000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', null, 'company_admin');

insert into public.company_payroll_configs (id, company_id, custom_fields) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{"adelanto_salarial": {"label": "Adelanto"}}'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '{"prestamo": {"label": "Prestamo"}}');
