-- Role-impersonation RLS tests for company_payroll_configs.
-- LOCAL ONLY (see scripts/test-rls-payroll-config-local.sh).
-- Each block runs in its own transaction and is rolled back.
-- Configs: 7..01 company 1 | 7..02 company 2 | company 3 has none
-- Users: 4..05 company_admin c1 | 4..08 company_admin c2 | 4..09 company_admin c3
--        4..04 hr_manager c1 | 4..02 manager c1 | 4..01 employee c1 | 4..07 super_admin
\set ON_ERROR_STOP off

-- ===== company_admin, other company's config (holes) =====
begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect((select count(*) from company_payroll_configs) = 1, 'company_admin sees only own company config');
select t_expect((select count(*) from company_payroll_configs where company_id = '10000000-0000-0000-0000-000000000002') = 0, 'company_admin cannot read another company config');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect(t_rows($q$update company_payroll_configs set custom_fields = '{}' where id = '70000000-0000-0000-0000-000000000002'$q$) <= 0, 'company_admin cannot update another company config');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect(t_rows($q$delete from company_payroll_configs where id = '70000000-0000-0000-0000-000000000002'$q$) <= 0, 'company_admin cannot delete another company config');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect(t_rows($q$insert into company_payroll_configs (company_id) values ('10000000-0000-0000-0000-000000000003')$q$) <= 0, 'company_admin cannot create a config for another company');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect(t_rows($q$update company_payroll_configs set company_id = '10000000-0000-0000-0000-000000000003' where id = '70000000-0000-0000-0000-000000000001'$q$) <= 0, 'company_admin cannot move own config to another company');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000008');
select t_expect((select count(*) from company_payroll_configs where company_id = '10000000-0000-0000-0000-000000000001') = 0, 'company_admin of company 2 cannot read company 1 config');
select t_expect(t_rows($q$update company_payroll_configs set custom_fields = '{}' where id = '70000000-0000-0000-0000-000000000001'$q$) <= 0, 'company_admin of company 2 cannot update company 1 config');
rollback;

-- ===== legal flows (must keep working) =====
begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect(t_rows($q$update company_payroll_configs set custom_fields = '{"x": {}}' where id = '70000000-0000-0000-0000-000000000001'$q$) = 1, 'LEGAL company_admin updates own config (payroll settings)');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect(t_rows($q$insert into company_payroll_configs (company_id, custom_fields) values ('10000000-0000-0000-0000-000000000001', '{"y": {}}') on conflict (company_id) do update set custom_fields = excluded.custom_fields$q$) = 1, 'LEGAL company_admin upserts own config (config.ts)');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect(t_rows($q$delete from company_payroll_configs where id = '70000000-0000-0000-0000-000000000001'$q$) = 1, 'LEGAL company_admin still deletes own config');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000009');
select t_expect(t_rows($q$insert into company_payroll_configs (company_id) values ('10000000-0000-0000-0000-000000000003')$q$) = 1, 'LEGAL company_admin creates own first config');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000007');
select t_expect((select count(*) from company_payroll_configs) = 2, 'LEGAL super_admin reads every config');
select t_expect(t_rows($q$update company_payroll_configs set custom_fields = '{}' where id = '70000000-0000-0000-0000-000000000002'$q$) = 1, 'LEGAL super_admin updates any config');
select t_expect(t_rows($q$delete from company_payroll_configs where id = '70000000-0000-0000-0000-000000000002'$q$) = 1, 'LEGAL super_admin deletes any config');
rollback;

-- ===== other company roles (unchanged by the migration) =====
begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000004');
select t_expect((select count(*) from company_payroll_configs) = 1, 'LEGAL hr_manager reads own company config');
select t_expect(t_rows($q$update company_payroll_configs set custom_fields = '{}' where id = '70000000-0000-0000-0000-000000000001'$q$) <= 0, 'hr_manager cannot write config through PostgREST');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000002');
select t_expect((select count(*) from company_payroll_configs) = 1, 'LEGAL manager reads own company config (deducciones)');
select t_expect(t_rows($q$update company_payroll_configs set custom_fields = '{}' where id = '70000000-0000-0000-0000-000000000001'$q$) <= 0, 'manager cannot write config');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$delete from company_payroll_configs where id = '70000000-0000-0000-0000-000000000001'$q$) <= 0, 'employee cannot delete config');
rollback;
