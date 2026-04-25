-- Migration: Create attendance_corrections workflow table
-- Date: 2026-04-25
-- Purpose: Support attendance correction requests (submit + approve/reject) with audit trail.

create table if not exists public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,

  proposed_check_in timestamptz null,
  proposed_check_out timestamptz null,
  proposed_lunch_start timestamptz null,
  proposed_lunch_end timestamptz null,

  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  -- reviewer is stored as employee_id (matches existing leave_requests style)
  reviewed_by uuid null references public.employees(id) on delete set null,
  reviewed_at timestamptz null,
  reviewer_note text null,

  -- created_by is the auth user id (not employee id)
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- audit snapshots (optional)
  before_snapshot jsonb null,
  after_snapshot jsonb null,

  -- optional link to an attendance_record affected (set by API)
  attendance_record_id uuid null references public.attendance_records(id) on delete set null
);

create index if not exists attendance_corrections_company_date_idx
  on public.attendance_corrections(company_id, date);

create index if not exists attendance_corrections_employee_date_idx
  on public.attendance_corrections(employee_id, date);

create index if not exists attendance_corrections_status_idx
  on public.attendance_corrections(status);

-- RLS
alter table public.attendance_corrections enable row level security;

-- Admin/HR can manage corrections within their company.
drop policy if exists "Company admins and HR managers can manage attendance corrections" on public.attendance_corrections;
create policy "Company admins and HR managers can manage attendance corrections"
on public.attendance_corrections
for all
using (
  company_id = public.get_user_company()
  and exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.role in ('company_admin', 'hr_manager', 'super_admin')
  )
)
with check (
  company_id = public.get_user_company()
  and exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.role in ('company_admin', 'hr_manager', 'super_admin')
  )
);

-- Employees can read/insert their own correction requests.
drop policy if exists "Employees can manage own attendance corrections" on public.attendance_corrections;
create policy "Employees can manage own attendance corrections"
on public.attendance_corrections
for select
using (
  employee_id = (
    select up.employee_id
    from public.user_profiles up
    where up.id = auth.uid()
    limit 1
  )
);

drop policy if exists "Employees can create own attendance corrections" on public.attendance_corrections;
create policy "Employees can create own attendance corrections"
on public.attendance_corrections
for insert
with check (
  employee_id = (
    select up.employee_id
    from public.user_profiles up
    where up.id = auth.uid()
    limit 1
  )
  and company_id = public.get_user_company()
  and status = 'pending'
);

-- Keep updated_at fresh
create or replace function public.set_updated_at_attendance_corrections()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_attendance_corrections on public.attendance_corrections;
create trigger trg_set_updated_at_attendance_corrections
before update on public.attendance_corrections
for each row execute function public.set_updated_at_attendance_corrections();

