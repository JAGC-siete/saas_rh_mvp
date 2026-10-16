-- Rollback for migrations/20261016140000_employee_rls_leave_approval.sql
-- Restores EXACTLY the production RLS state of public.employees and
-- public.leave_requests as of 2026-10-16 (policy DDL generated from prod
-- pg_policy). Idempotent: safe to run whether or not the migration was applied.
-- Run in one transaction:  begin; \i this_file; commit;

-- 1) Remove everything the migration adds
drop trigger if exists trg_enforce_leave_request_transition on public.leave_requests;
drop function if exists public.enforce_leave_request_transition();

drop policy if exists employees_b2c_own_select on public.employees;
drop policy if exists employees_b2c_own_update on public.employees;
drop policy if exists employees_manager_department_select on public.employees;
drop policy if exists employees_legacy_admin_company on public.employees;

drop policy if exists leave_requests_own_insert on public.leave_requests;
drop policy if exists leave_requests_own_cancel on public.leave_requests;
drop policy if exists leave_requests_manager_department_select on public.leave_requests;
drop policy if exists leave_requests_legacy_admin_company on public.leave_requests;

drop function if exists public.rls_actor_role();
drop function if exists public.rls_actor_employee_id();
drop function if exists public.rls_managed_department_ids();

-- 2) Recreate the original policies verbatim
drop policy if exists "Super admins can access all employees" on public.employees;
drop policy if exists "Super admins can manage employees" on public.employees;
drop policy if exists "Super admins can view all employees" on public.employees;
drop policy if exists b2x_employees_select on public.employees;
drop policy if exists b2x_employees_update on public.employees;
drop policy if exists employees_admin_manage on public.employees;
drop policy if exists employees_company_view on public.employees;
drop policy if exists employees_own_profile on public.employees;
drop policy if exists super_admin_unrestricted_employees on public.employees;

CREATE POLICY "Super admins can access all employees" ON public.employees AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::text)))));
CREATE POLICY "Super admins can manage employees" ON public.employees AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::text)))));
CREATE POLICY "Super admins can view all employees" ON public.employees AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::text)))));
CREATE POLICY b2x_employees_select ON public.employees AS PERMISSIVE FOR SELECT TO authenticated USING ((((is_b2c = true) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.employee_id = employees.id) AND (up.is_b2c = true))))) OR (company_id = get_user_company())));
CREATE POLICY b2x_employees_update ON public.employees AS PERMISSIVE FOR UPDATE TO authenticated USING ((((is_b2c = true) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.employee_id = employees.id) AND (up.is_b2c = true))))) OR (company_id = get_user_company()))) WITH CHECK (((is_b2c = true) OR (company_id = get_user_company())));
CREATE POLICY employees_admin_manage ON public.employees AS PERMISSIVE FOR ALL TO authenticated USING ((company_id IN ( SELECT user_profiles.company_id
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['super_admin'::text, 'company_admin'::text, 'hr_manager'::text]))))));
CREATE POLICY employees_company_view ON public.employees AS PERMISSIVE FOR SELECT TO authenticated USING ((company_id IN ( SELECT user_profiles.company_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY employees_own_profile ON public.employees AS PERMISSIVE FOR SELECT TO authenticated USING ((id IN ( SELECT user_profiles.employee_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY super_admin_unrestricted_employees ON public.employees AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::text)))));

drop policy if exists "Employees can manage their own leave requests" on public.leave_requests;
drop policy if exists "Leave requests are manageable by company admins" on public.leave_requests;
drop policy if exists "Leave requests are viewable by company users" on public.leave_requests;
drop policy if exists "Managers can approve leave requests in their department" on public.leave_requests;
drop policy if exists "Super admin can access everything" on public.leave_requests;
drop policy if exists "Super admins can manage leave requests" on public.leave_requests;
drop policy if exists "Super admins can view all leave requests" on public.leave_requests;
drop policy if exists "Users can view leave requests in their company" on public.leave_requests;
drop policy if exists company_admins_can_view_leaves on public.leave_requests;
drop policy if exists employees_can_update_own_pending_leave_requests on public.leave_requests;
drop policy if exists employees_can_view_own_leaves on public.leave_requests;

CREATE POLICY "Employees can manage their own leave requests" ON public.leave_requests AS PERMISSIVE FOR ALL TO public USING ((employee_id IN ( SELECT user_profiles.employee_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Leave requests are manageable by company admins" ON public.leave_requests AS PERMISSIVE FOR ALL TO public USING (((employee_id IN ( SELECT e.id
   FROM (employees e
     JOIN user_profiles up ON ((up.company_id = e.company_id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['company_admin'::text, 'hr_manager'::text]))))) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['super_admin'::text, 'system_admin'::text])))))));
CREATE POLICY "Leave requests are viewable by company users" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public USING (((employee_id IN ( SELECT e.id
   FROM (employees e
     JOIN user_profiles up ON ((up.company_id = e.company_id)))
  WHERE (up.id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['super_admin'::text, 'system_admin'::text])))))));
CREATE POLICY "Managers can approve leave requests in their department" ON public.leave_requests AS PERMISSIVE FOR UPDATE TO public USING ((employee_id IN ( SELECT e.id
   FROM ((employees e
     JOIN departments d ON ((d.id = e.department_id)))
     JOIN user_profiles up ON ((up.employee_id = d.manager_id)))
  WHERE (up.id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY "Super admin can access everything" ON public.leave_requests AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::text)))));
CREATE POLICY "Super admins can manage leave requests" ON public.leave_requests AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::text)))));
CREATE POLICY "Super admins can view all leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::text)))));
CREATE POLICY "Users can view leave requests in their company" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public USING ((employee_id IN ( SELECT e.id
   FROM (employees e
     JOIN user_profiles up ON ((up.company_id = e.company_id)))
  WHERE (up.id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY company_admins_can_view_leaves ON public.leave_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (user_profiles up
     JOIN employees e ON ((e.company_id = up.company_id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'company_admin'::text) AND (((up.permissions ->> 'can_view_all'::text))::boolean = true) AND (e.id = leave_requests.employee_id)))));
CREATE POLICY employees_can_update_own_pending_leave_requests ON public.leave_requests AS PERMISSIVE FOR UPDATE TO public USING (((employee_id IN ( SELECT user_profiles.employee_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))) AND (status = 'pending'::text))) WITH CHECK ((employee_id IN ( SELECT user_profiles.employee_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY employees_can_view_own_leaves ON public.leave_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.employee_id = leave_requests.employee_id)))));
