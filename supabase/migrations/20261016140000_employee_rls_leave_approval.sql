-- Employee data and leave approval hardening (PR 1).
--
-- Holes closed (verified against the prod catalog on 2026-10-16):
--   * employees_company_view / b2x_employees_select let ANY authenticated user
--     of a company (role employee included) read every coworker's row:
--     base_salary, dni, bank_account, phone, address.
--   * b2x_employees_update let any user of the company UPDATE any employee
--     row of that company (own salary included).
--   * "Employees can manage their own leave requests" (FOR ALL, no WITH CHECK)
--     let an employee approve, edit or delete their own leave request through
--     PostgREST, bypassing the API.
--   * "Leave requests are viewable by company users" exposed every coworker's
--     leave requests.
--   * No DB rule stopped approving a cancelled request, flipping
--     approved <-> rejected, or approving your own request.
--
-- Visibility after this migration:
--   employees       employee: own row | manager: own department |
--                   company_admin/hr_manager: company | super_admin: all |
--                   legacy role 'admin': company (read only, as before minus write)
--   leave_requests  employee: own | manager: own department |
--                   company_admin/hr_manager/system_admin/super_admin: unchanged
--
-- Rollback: supabase/rollbacks/20261016140000_employee_rls_leave_approval.rollback.sql
-- Tests:    scripts/test-rls-local.sh (local Postgres only)

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so policies do not depend on user_profiles RLS;
-- they only ever return data about the caller.
-- ---------------------------------------------------------------------------
create or replace function public.rls_actor_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select up.role from public.user_profiles up where up.id = auth.uid() limit 1
$$;

create or replace function public.rls_actor_employee_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select up.employee_id from public.user_profiles up where up.id = auth.uid() limit 1
$$;

create or replace function public.rls_managed_department_ids()
returns setof uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select d.id
  from public.departments d
  join public.user_profiles up on up.id = auth.uid()
  where up.role = 'manager'
    and up.employee_id is not null
    and d.manager_id = up.employee_id
$$;

revoke all on function public.rls_actor_role() from public, anon;
revoke all on function public.rls_actor_employee_id() from public, anon;
revoke all on function public.rls_managed_department_ids() from public, anon;
grant execute on function public.rls_actor_role() to authenticated, service_role;
grant execute on function public.rls_actor_employee_id() to authenticated, service_role;
grant execute on function public.rls_managed_department_ids() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- employees
-- Kept: employees_admin_manage, employees_own_profile, super admin policies.
-- ---------------------------------------------------------------------------
drop policy if exists employees_company_view on public.employees;
drop policy if exists b2x_employees_select on public.employees;
drop policy if exists b2x_employees_update on public.employees;

-- B2C branch of the old b2x policies (a B2C user and their own employee row)
create policy employees_b2c_own_select on public.employees
  for select to authenticated
  using (
    is_b2c = true
    and exists (
      select 1 from public.user_profiles up
      where up.id = (select auth.uid()) and up.employee_id = employees.id and up.is_b2c = true
    )
  );

create policy employees_b2c_own_update on public.employees
  for update to authenticated
  using (
    is_b2c = true
    and exists (
      select 1 from public.user_profiles up
      where up.id = (select auth.uid()) and up.employee_id = employees.id and up.is_b2c = true
    )
  )
  with check (
    is_b2c = true
    and exists (
      select 1 from public.user_profiles up
      where up.id = (select auth.uid()) and up.employee_id = employees.id and up.is_b2c = true
    )
  );

create policy employees_manager_department_select on public.employees
  for select to authenticated
  using (department_id in (select public.rls_managed_department_ids()));

-- Legacy 'admin' role is not in employees_admin_manage; it only had company
-- read access through employees_company_view. Keep that read access.
create policy employees_legacy_admin_company on public.employees
  for select to authenticated
  using (
    (select public.rls_actor_role()) = 'admin'
    and company_id = (select public.get_user_company())
  );

-- ---------------------------------------------------------------------------
-- leave_requests
-- Kept: "Leave requests are manageable by company admins", "Managers can
-- approve leave requests in their department", company_admins_can_view_leaves,
-- employees_can_view_own_leaves, super admin policies.
-- ---------------------------------------------------------------------------
drop policy if exists "Employees can manage their own leave requests" on public.leave_requests;
drop policy if exists "Leave requests are viewable by company users" on public.leave_requests;
drop policy if exists "Users can view leave requests in their company" on public.leave_requests;
drop policy if exists employees_can_update_own_pending_leave_requests on public.leave_requests;

create policy leave_requests_own_insert on public.leave_requests
  for insert to authenticated
  with check (
    employee_id = (select public.rls_actor_employee_id())
    and status = 'pending'
  );

-- Owner may only cancel a pending request (the trigger also blocks other edits)
create policy leave_requests_own_cancel on public.leave_requests
  for update to authenticated
  using (
    employee_id = (select public.rls_actor_employee_id())
    and status = 'pending'
  )
  with check (
    employee_id = (select public.rls_actor_employee_id())
    and status in ('pending', 'cancelled')
  );

create policy leave_requests_manager_department_select on public.leave_requests
  for select to authenticated
  using (
    employee_id in (
      select e.id from public.employees e
      where e.department_id in (select public.rls_managed_department_ids())
    )
  );

create policy leave_requests_legacy_admin_company on public.leave_requests
  for select to authenticated
  using (
    (select public.rls_actor_role()) = 'admin'
    and employee_id in (
      select e.id from public.employees e
      where e.company_id = (select public.get_user_company())
    )
  );

-- ---------------------------------------------------------------------------
-- Status state machine. Applies to every session, service role included.
--   pending  -> approved | rejected : approver must not be the requester
--   pending  -> cancelled           : requester, or HR/admin
--   approved -> cancelled           : HR/admin only
--   anything else                   : rejected
-- The requester may not change any other column, and nobody may move a
-- request to another employee.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_leave_request_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_actor_employee uuid;
  v_is_owner boolean;
  v_is_hr_admin boolean;
begin
  if v_uid is not null then
    select up.role, up.employee_id into v_role, v_actor_employee
    from public.user_profiles up where up.id = v_uid;
  end if;

  v_is_owner := v_actor_employee is not null
    and v_actor_employee = (case when tg_op = 'INSERT' then new.employee_id else old.employee_id end);
  v_is_hr_admin := v_role in ('company_admin', 'hr_manager', 'super_admin', 'system_admin', 'admin');

  if tg_op = 'INSERT' then
    if v_is_owner and new.status is distinct from 'pending' then
      raise exception 'Las solicitudes nuevas se crean como pendientes.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.employee_id is distinct from old.employee_id then
    raise exception 'No se puede pasar una solicitud a otro empleado.'
      using errcode = '42501';
  end if;

  if v_is_owner then
    if old.status is distinct from 'pending'
       or new.status not in ('pending', 'cancelled')
       or (to_jsonb(new) - 'status' - 'updated_at') <> (to_jsonb(old) - 'status' - 'updated_at') then
      raise exception 'Solo puedes cancelar tu solicitud mientras está pendiente. No puedes aprobarla ni cambiarla.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    if new.approved_by is not null and new.approved_by = new.employee_id then
      raise exception 'Nadie puede aprobar ni rechazar su propia solicitud.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status = 'cancelled' and old.status in ('pending', 'approved') then
    if v_is_hr_admin then
      return new;
    end if;
    raise exception 'Solo RR. HH. o un administrador puede cancelar esta solicitud.'
      using errcode = '42501';
  end if;

  raise exception 'Cambio de estado no permitido: de "%" a "%". La solicitud ya fue resuelta.', old.status, new.status
    using errcode = '42501';
end;
$$;

revoke all on function public.enforce_leave_request_transition() from public, anon, authenticated;

drop trigger if exists trg_enforce_leave_request_transition on public.leave_requests;
create trigger trg_enforce_leave_request_transition
  before insert or update on public.leave_requests
  for each row
  execute function public.enforce_leave_request_transition();
