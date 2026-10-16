-- Leave requests: decisions are one-way out of 'pending' and nobody decides on
-- their own request. The RLS policy "Employees can manage their own leave
-- requests" (FOR ALL) lets an employee write their own rows straight through
-- PostgREST, so the API checks alone are not enough.
--
-- Rules for end-user sessions (auth.uid() not null):
--   * Owner (actor's employee_id = row's employee_id): may only insert as
--     'pending', and may only edit while 'pending', ending in 'pending' or
--     'cancelled'. Cannot move the row to another employee.
--   * Anyone else: may change status only while the row is 'pending'.
-- Service role / direct DB sessions (no auth.uid()) are trusted server code.

create or replace function public.enforce_leave_request_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_employee public.user_profiles.employee_id%type;
begin
  if auth.uid() is null then
    return new;
  end if;

  select employee_id into v_actor_employee
  from public.user_profiles
  where id = auth.uid();

  if tg_op = 'INSERT' then
    if v_actor_employee is not null
       and v_actor_employee = new.employee_id
       and new.status is distinct from 'pending' then
      raise exception 'leave request must be created as pending'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if v_actor_employee is not null and v_actor_employee = old.employee_id then
    if old.status is distinct from 'pending' then
      raise exception 'leave request is no longer pending'
        using errcode = '42501';
    end if;
    if new.status not in ('pending', 'cancelled')
       or new.employee_id is distinct from old.employee_id then
      raise exception 'cannot approve or reject own leave request'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     and old.status is distinct from 'pending' then
    raise exception 'leave request is no longer pending'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_leave_request_transition() from public, anon, authenticated;

drop trigger if exists trg_enforce_leave_request_transition on public.leave_requests;
create trigger trg_enforce_leave_request_transition
  before insert or update on public.leave_requests
  for each row
  execute function public.enforce_leave_request_transition();
