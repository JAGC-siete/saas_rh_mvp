-- Role-impersonation RLS tests. LOCAL ONLY (see scripts/test-rls-local.sh).
-- Each block runs in its own transaction and is rolled back.
-- Users: 4..01 employee(e_emp, D1) | 4..02 manager(e_mgr, manages D1) | 4..04 hr_manager(e_hr)
--        4..05 company_admin | 4..07 super_admin
-- Leave: 5..01/02 e_emp pending | 5..03 e_emp cancelled | 5..04 e_emp approved
--        5..05 e_mgr pending | 5..06 e_hr pending | 5..07 e_cow pending (D2) | 5..08 other company
\set ON_ERROR_STOP off

-- ===== employee =====
begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect((select count(*) from employees) = 1, 'employee sees only own employees row');
select t_expect((select count(*) from employees where bank_account is not null and id <> '30000000-0000-0000-0000-000000000001') = 0, 'employee cannot read coworkers salary/dni/bank_account');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect((select count(*) from leave_requests where employee_id <> '30000000-0000-0000-0000-000000000001') = 0, 'employee sees 0 coworker leave_requests');
select t_expect((select count(*) from leave_requests) = 4, 'employee still sees own 4 leave_requests');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$update leave_requests set status = 'approved' where id = '50000000-0000-0000-0000-000000000001'$q$) <= 0, 'employee cannot approve own request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$update leave_requests set status = 'rejected' where id = '50000000-0000-0000-0000-000000000001'$q$) <= 0, 'employee cannot reject own request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$update leave_requests set status = 'pending' where id = '50000000-0000-0000-0000-000000000004'$q$) <= 0, 'employee cannot reopen own approved request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$update leave_requests set days_requested = 10, end_date = '2026-11-20' where id = '50000000-0000-0000-0000-000000000004'$q$) <= 0, 'employee cannot extend own approved request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$update leave_requests set status = 'cancelled' where id = '50000000-0000-0000-0000-000000000004'$q$) <= 0, 'employee cannot cancel own approved request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$insert into leave_requests (employee_id, leave_type_id, start_date, end_date, days_requested, status) values ('30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-01', 1, 'approved')$q$) <= 0, 'employee cannot create own request as approved');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$delete from leave_requests where id = '50000000-0000-0000-0000-000000000004'$q$) <= 0, 'employee cannot delete own approved request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$update employees set base_salary = 99999 where id = '30000000-0000-0000-0000-000000000001'$q$) <= 0, 'employee cannot change own salary');
select t_expect(t_rows($q$update employees set bank_account = 'evil' where id = '30000000-0000-0000-0000-000000000003'$q$) <= 0, 'employee cannot change coworker bank_account');
rollback;

-- legal employee flows (must keep working)
begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$update leave_requests set status = 'cancelled', updated_at = now() where id = '50000000-0000-0000-0000-000000000001' and employee_id = '30000000-0000-0000-0000-000000000001' and status = 'pending'$q$) = 1, 'LEGAL employee cancels own pending request (portal)');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000001');
select t_expect(t_rows($q$insert into leave_requests (employee_id, leave_type_id, start_date, end_date, days_requested, status) values ('30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-12-01', '2026-12-01', 1, 'pending')$q$) = 1, 'LEGAL employee creates own pending request (portal)');
rollback;

-- ===== manager (D1) =====
begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000002');
select t_expect((select count(*) from employees) = 2, 'manager sees only own department employees');
select t_expect((select count(*) from leave_requests where employee_id not in ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002')) = 0, 'manager sees no leave outside own department');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000002');
select t_expect(t_rows($q$update leave_requests set status = 'approved', approved_by = '30000000-0000-0000-0000-000000000002' where id = '50000000-0000-0000-0000-000000000005'$q$) <= 0, 'manager cannot approve own request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000002');
select t_expect(t_rows($q$update leave_requests set status = 'approved', approved_by = '30000000-0000-0000-0000-000000000002' where id = '50000000-0000-0000-0000-000000000003'$q$) <= 0, 'manager cannot approve a cancelled request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000002');
select t_expect(t_rows($q$update employees set base_salary = 1 where id = '30000000-0000-0000-0000-000000000001'$q$) <= 0, 'manager cannot change employees rows');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000002');
select t_expect(t_rows($q$update leave_requests set status = 'approved', approved_by = '30000000-0000-0000-0000-000000000002', approved_at = now() where id = '50000000-0000-0000-0000-000000000001' and status = 'pending'$q$) = 1, 'LEGAL manager approves pending request in own department');
rollback;

-- ===== hr_manager =====
begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000004');
select t_expect(t_rows($q$update leave_requests set status = 'approved', approved_by = '30000000-0000-0000-0000-000000000004' where id = '50000000-0000-0000-0000-000000000006'$q$) <= 0, 'hr_manager cannot approve own request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000004');
select t_expect(t_rows($q$update leave_requests set status = 'rejected', approved_by = null where id = '50000000-0000-0000-0000-000000000004'$q$) <= 0, 'hr_manager cannot flip approved to rejected');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000004');
select t_expect(t_rows($q$update leave_requests set status = 'approved', approved_by = '30000000-0000-0000-0000-000000000004' where id = '50000000-0000-0000-0000-000000000003'$q$) <= 0, 'hr_manager cannot approve a cancelled request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000004');
select t_expect(t_rows($q$update leave_requests set employee_id = '30000000-0000-0000-0000-000000000003' where id = '50000000-0000-0000-0000-000000000001'$q$) <= 0, 'hr_manager cannot move a request to another employee');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000004');
select t_expect((select count(*) from employees) = 5, 'LEGAL hr_manager sees all own-company employees');
select t_expect(t_rows($q$update leave_requests set status = 'approved', approved_by = '30000000-0000-0000-0000-000000000004', approved_at = now() where id = '50000000-0000-0000-0000-000000000007' and status = 'pending'$q$) = 1, 'LEGAL hr_manager approves coworker pending request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000004');
select t_expect(t_rows($q$update leave_requests set status = 'rejected', rejection_reason = 'x', approved_by = null where id = '50000000-0000-0000-0000-000000000001' and status = 'pending'$q$) = 1, 'LEGAL hr_manager rejects pending request');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000004');
select t_expect(t_rows($q$update leave_requests set status = 'cancelled' where id = '50000000-0000-0000-0000-000000000004'$q$) = 1, 'LEGAL hr_manager cancels an approved request');
rollback;

-- ===== company_admin / super_admin =====
begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000005');
select t_expect((select count(*) from employees) = 5, 'LEGAL company_admin sees all own-company employees');
select t_expect((select count(*) from employees where company_id = '10000000-0000-0000-0000-000000000002') = 0, 'company_admin sees no other-company employees');
select t_expect(t_rows($q$update employees set base_salary = 16000 where id = '30000000-0000-0000-0000-000000000001'$q$) = 1, 'LEGAL company_admin updates employee salary');
rollback;

begin; set local role authenticated; select t_as('40000000-0000-0000-0000-000000000007');
select t_expect((select count(*) from employees) = 6, 'LEGAL super_admin sees all employees');
rollback;

-- ===== service role (state machine also applies) =====
begin; set local role service_role;
select t_expect(t_rows($q$update leave_requests set status = 'approved', approved_by = employee_id where id = '50000000-0000-0000-0000-000000000002'$q$) <= 0, 'service role cannot record a self-approval');
rollback;

begin; set local role service_role;
select t_expect(t_rows($q$update leave_requests set status = 'pending' where id = '50000000-0000-0000-0000-000000000004'$q$) <= 0, 'service role cannot reopen an approved request');
rollback;

begin; set local role service_role;
select t_expect(t_rows($q$update leave_requests set status = 'approved', approved_by = '30000000-0000-0000-0000-000000000004' where id = '50000000-0000-0000-0000-000000000002'$q$) = 1, 'LEGAL service role approves with a different approver');
rollback;
