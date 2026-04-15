-- In-app notifications for key employee actions (attendance + leave requests)
-- Generated: 2026-04-15

-- Core table
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  -- If set, notification is targeted to that employee. If NULL, it's company-scoped (admins/managers).
  employee_id uuid references public.employees(id) on delete cascade,
  module text not null check (module in ('attendance', 'leave', 'payroll', 'admin', 'system', 'gamification')),
  type text not null check (type in ('success', 'error', 'warning', 'info')),
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_notifications_company_created_at
  on public.app_notifications (company_id, created_at desc);

create index if not exists idx_app_notifications_employee_created_at
  on public.app_notifications (employee_id, created_at desc)
  where employee_id is not null;

alter table public.app_notifications enable row level security;

drop policy if exists "Super admin can read app notifications" on public.app_notifications;
create policy "Super admin can read app notifications"
  on public.app_notifications
  for select
  to authenticated
  using (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
  );

drop policy if exists "Company managers can read company app notifications" on public.app_notifications;
create policy "Company managers can read company app notifications"
  on public.app_notifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.company_id = app_notifications.company_id
        and up.role in ('company_admin', 'hr_manager', 'manager')
    )
  );

drop policy if exists "Employees can read own app notifications" on public.app_notifications;
create policy "Employees can read own app notifications"
  on public.app_notifications
  for select
  to authenticated
  using (
    app_notifications.employee_id is not null
    and exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.company_id = app_notifications.company_id
        and up.employee_id = app_notifications.employee_id
    )
  );

-- Trigger: attendance event insert → notify employee + managers
create or replace function public.tg_notify_attendance_event()
returns trigger
language plpgsql
as $$
declare
  emp_company_id uuid;
  emp_name text;
  msg_employee text;
  msg_company text;
begin
  select e.company_id, e.name
    into emp_company_id, emp_name
  from public.employees e
  where e.id = new.employee_id;

  if emp_company_id is null then
    return new;
  end if;

  msg_employee := 'Se registró una marca de asistencia.';
  msg_company := coalesce(emp_name, 'Empleado') || ' registró asistencia.';

  insert into public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  values (
    emp_company_id,
    new.employee_id,
    'attendance',
    'info',
    'Asistencia registrada',
    msg_employee,
    jsonb_build_object(
      'event_type', new.event_type,
      'ts_utc', new.ts_utc,
      'ts_local', new.ts_local,
      'device_id', new.device_id,
      'source', new.source,
      'ref_record_id', new.ref_record_id
    )
  );

  insert into public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  values (
    emp_company_id,
    null,
    'attendance',
    'info',
    'Registro de asistencia',
    msg_company,
    jsonb_build_object(
      'employee_id', new.employee_id,
      'employee_name', emp_name,
      'event_type', new.event_type,
      'ts_utc', new.ts_utc,
      'ts_local', new.ts_local
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_attendance_event on public.attendance_events;
create trigger trg_notify_attendance_event
after insert on public.attendance_events
for each row
execute function public.tg_notify_attendance_event();

-- Trigger: leave request insert → notify employee + managers
create or replace function public.tg_notify_leave_request_created()
returns trigger
language plpgsql
as $$
declare
  emp_company_id uuid;
  emp_name text;
  leave_type_name text;
  msg_employee text;
  msg_company text;
begin
  select e.company_id, e.name
    into emp_company_id, emp_name
  from public.employees e
  where e.id = new.employee_id;

  select lt.name
    into leave_type_name
  from public.leave_types lt
  where lt.id = new.leave_type_id;

  if emp_company_id is null then
    return new;
  end if;

  msg_employee := 'Tu solicitud de permiso fue enviada para aprobación.';
  msg_company :=
    coalesce(emp_name, 'Empleado') ||
    ' solicitó permiso' ||
    case when leave_type_name is not null then ' (' || leave_type_name || ')' else '' end ||
    '.';

  insert into public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  values (
    emp_company_id,
    new.employee_id,
    'leave',
    'info',
    'Permiso solicitado',
    msg_employee,
    jsonb_build_object(
      'leave_request_id', new.id,
      'leave_type_id', new.leave_type_id,
      'leave_type_name', leave_type_name,
      'start_date', new.start_date,
      'end_date', new.end_date,
      'days_requested', new.days_requested,
      'status', new.status
    )
  );

  insert into public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  values (
    emp_company_id,
    null,
    'leave',
    'warning',
    'Nueva solicitud de permiso',
    msg_company,
    jsonb_build_object(
      'leave_request_id', new.id,
      'employee_id', new.employee_id,
      'employee_name', emp_name,
      'leave_type_id', new.leave_type_id,
      'leave_type_name', leave_type_name,
      'start_date', new.start_date,
      'end_date', new.end_date,
      'days_requested', new.days_requested,
      'reason', new.reason
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_leave_request_created on public.leave_requests;
create trigger trg_notify_leave_request_created
after insert on public.leave_requests
for each row
execute function public.tg_notify_leave_request_created();

