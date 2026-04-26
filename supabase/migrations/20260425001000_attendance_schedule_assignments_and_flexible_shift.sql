-- Migration: employee_schedule_assignments + flexible shift fields on work_schedules
-- Date: 2026-04-25

-- 1) Scheduling by date (phase 3)
create table if not exists public.employee_schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_schedule_id uuid not null references public.work_schedules(id) on delete cascade,
  valid_from date not null,
  valid_to date not null,
  repeat_weekly boolean not null default false,
  repeat_weekdays smallint[] null, -- 0=Sunday .. 6=Saturday; null => all days in range
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists employee_schedule_assignments_company_employee_idx
  on public.employee_schedule_assignments(company_id, employee_id, valid_from, valid_to);

create index if not exists employee_schedule_assignments_company_schedule_idx
  on public.employee_schedule_assignments(company_id, work_schedule_id);

alter table public.employee_schedule_assignments enable row level security;

drop policy if exists "Company admins and HR managers can manage schedule assignments" on public.employee_schedule_assignments;
create policy "Company admins and HR managers can manage schedule assignments"
on public.employee_schedule_assignments
for all
using (
  company_id = public.get_user_company()
  and exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.role in ('company_admin', 'hr_manager', 'super_admin')
  )
)
with check (
  company_id = public.get_user_company()
  and exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.role in ('company_admin', 'hr_manager', 'super_admin')
  )
);

-- 2) Flexible shift + configurable thresholds (phase 4)
alter table public.work_schedules
  add column if not exists shift_type text not null default 'normal' check (shift_type in ('normal', 'flex')),
  add column if not exists required_minutes integer null,
  add column if not exists latest_check_in time null,
  add column if not exists late_grace_minutes integer not null default 5,
  add column if not exists late_absent_minutes integer not null default 60,
  add column if not exists early_grace_minutes integer not null default 5,
  add column if not exists early_absent_minutes integer not null default 60;

