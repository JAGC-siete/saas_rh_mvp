-- Local-only seed for RLS tests. Two companies; company 1 has two departments.
--   D1 (manager = e_mgr): e_emp, e_mgr        D2 (no manager): e_cow, e_hr
--   e_admin has no department. Company 2: e_other.
\set ON_ERROR_STOP on

insert into public.leave_types (id, name) values ('60000000-0000-0000-0000-000000000001', 'Vacaciones');

insert into public.departments (id, company_id, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'D1'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'D2');

insert into public.employees (id, company_id, department_id, dni, name, base_salary, bank_account) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '0801', 'Empleado', 15000, 'acct-emp'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '0802', 'Jefe', 30000, 'acct-mgr'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '0803', 'Companero', 20000, 'acct-cow'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '0804', 'RRHH', 25000, 'acct-hr'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', null, '0805', 'Admin', 40000, 'acct-admin'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', null, '0806', 'Otra empresa', 18000, 'acct-other');

update public.departments set manager_id = '30000000-0000-0000-0000-000000000002'
where id = '20000000-0000-0000-0000-000000000001';

insert into public.user_profiles (id, company_id, employee_id, role) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'employee'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'manager'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'hr_manager'),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'company_admin'),
  ('40000000-0000-0000-0000-000000000007', null, null, 'super_admin');

insert into public.leave_requests (id, employee_id, leave_type_id, start_date, end_date, days_requested, status, approved_by) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-11-02', '2026-11-03', 2, 'pending', null),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-11-09', '2026-11-09', 1, 'pending', null),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-11-16', '2026-11-16', 1, 'cancelled', null),
  ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-10-05', '2026-10-05', 1, 'approved', '30000000-0000-0000-0000-000000000004'),
  ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '2026-11-04', '2026-11-04', 1, 'pending', null),
  ('50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', '2026-11-05', '2026-11-05', 1, 'pending', null),
  ('50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', '2026-11-06', '2026-11-06', 1, 'pending', null),
  ('50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000001', '2026-11-06', '2026-11-06', 1, 'pending', null);

-- Test helpers
create or replace function public.t_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
create or replace function public.t_expect(p_ok boolean, p_name text) returns void language plpgsql as $$
begin
  if p_ok then raise notice 'PASS %', p_name; else raise notice 'FAIL %', p_name; end if;
end $$;
-- Runs a statement and returns rows affected, or -1 if it raised
create or replace function public.t_rows(p_sql text) returns integer language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
exception when others then
  return -1;
end $$;
grant execute on function public.t_as(uuid), public.t_expect(boolean, text), public.t_rows(text) to authenticated, service_role;
