-- Migration: Native helpdesk / support tickets system (Phase 1)
-- Date: 2026-06-14
-- Purpose: Multi-tenant support tickets with conversation thread + attachments.
--          Customers (company users/employees) open tickets; super_admin is the
--          single support agent across all tenants.

-- =========================================================================
-- 1. support_tickets
-- =========================================================================
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,

  -- creator is the auth user id (admin or employee). employee_id optional link.
  created_by uuid not null references auth.users(id) on delete cascade,
  employee_id uuid null references public.employees(id) on delete set null,

  subject text not null,
  description text not null,

  category text not null default 'other'
    check (category in ('bug', 'feature', 'billing', 'payroll', 'attendance', 'account', 'other')),

  -- affected product module for contextual reporting (Odoo/Factorial pattern)
  module text null,

  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),

  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),

  -- assigned support agent (super_admin). auth user id.
  assigned_to uuid null references auth.users(id) on delete set null,

  -- SLA tracking
  sla_due_at timestamptz null,
  first_response_at timestamptz null,
  resolved_at timestamptz null,
  closed_at timestamptz null,

  -- captured context (origin url, browser, app version, etc.)
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_company_created_idx
  on public.support_tickets(company_id, created_at desc);

create index if not exists support_tickets_created_by_idx
  on public.support_tickets(created_by, created_at desc);

create index if not exists support_tickets_assigned_idx
  on public.support_tickets(assigned_to)
  where assigned_to is not null;

-- partial index for the active support queue
create index if not exists support_tickets_open_status_idx
  on public.support_tickets(priority, created_at desc)
  where status in ('open', 'in_progress', 'waiting_customer');

-- =========================================================================
-- 2. ticket_messages (conversation thread)
-- =========================================================================
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,

  author_id uuid not null references auth.users(id) on delete cascade,
  author_role text not null,

  body text not null,
  -- internal notes are only visible to support agents (super_admin)
  is_internal boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_idx
  on public.ticket_messages(ticket_id, created_at asc);

-- =========================================================================
-- 3. ticket_attachments (mirror of employee_files pattern)
-- =========================================================================
create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  message_id uuid null references public.ticket_messages(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,

  uploaded_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text null,
  file_size bigint null,

  created_at timestamptz not null default now()
);

create index if not exists ticket_attachments_ticket_idx
  on public.ticket_attachments(ticket_id);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_attachments enable row level security;

-- ----- support_tickets -----

-- Super admin (support agent) can do everything across all tenants.
drop policy if exists "support_tickets_super_admin_all" on public.support_tickets;
create policy "support_tickets_super_admin_all"
on public.support_tickets
for all
to authenticated
using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
);

-- Company admins / HR can read all tickets of their company.
drop policy if exists "support_tickets_company_admin_read" on public.support_tickets;
create policy "support_tickets_company_admin_read"
on public.support_tickets
for select
to authenticated
using (
  company_id = public.get_user_company()
  and exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.role in ('company_admin', 'hr_manager')
  )
);

-- Any authenticated user can read their own tickets.
drop policy if exists "support_tickets_owner_read" on public.support_tickets;
create policy "support_tickets_owner_read"
on public.support_tickets
for select
to authenticated
using (created_by = auth.uid());

-- Any authenticated user can create a ticket for their own company.
drop policy if exists "support_tickets_owner_insert" on public.support_tickets;
create policy "support_tickets_owner_insert"
on public.support_tickets
for insert
to authenticated
with check (
  created_by = auth.uid()
  and company_id = public.get_user_company()
  and status = 'open'
);

-- Owners can update limited fields of their own tickets (e.g. close/reopen).
drop policy if exists "support_tickets_owner_update" on public.support_tickets;
create policy "support_tickets_owner_update"
on public.support_tickets
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- ----- ticket_messages -----

-- Super admin can read/write all messages.
drop policy if exists "ticket_messages_super_admin_all" on public.ticket_messages;
create policy "ticket_messages_super_admin_all"
on public.ticket_messages
for all
to authenticated
using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
);

-- Ticket participants (owner or company admin/HR) can read non-internal messages.
drop policy if exists "ticket_messages_participant_read" on public.ticket_messages;
create policy "ticket_messages_participant_read"
on public.ticket_messages
for select
to authenticated
using (
  is_internal = false
  and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_messages.ticket_id
      and (
        t.created_by = auth.uid()
        or (
          t.company_id = public.get_user_company()
          and exists (
            select 1 from public.user_profiles up
            where up.id = auth.uid()
              and up.role in ('company_admin', 'hr_manager')
          )
        )
      )
  )
);

-- Participants can post non-internal replies to tickets they can see.
drop policy if exists "ticket_messages_participant_insert" on public.ticket_messages;
create policy "ticket_messages_participant_insert"
on public.ticket_messages
for insert
to authenticated
with check (
  author_id = auth.uid()
  and is_internal = false
  and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_messages.ticket_id
      and (
        t.created_by = auth.uid()
        or (
          t.company_id = public.get_user_company()
          and exists (
            select 1 from public.user_profiles up
            where up.id = auth.uid()
              and up.role in ('company_admin', 'hr_manager')
          )
        )
      )
  )
);

-- ----- ticket_attachments -----

drop policy if exists "ticket_attachments_super_admin_all" on public.ticket_attachments;
create policy "ticket_attachments_super_admin_all"
on public.ticket_attachments
for all
to authenticated
using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
);

drop policy if exists "ticket_attachments_participant_read" on public.ticket_attachments;
create policy "ticket_attachments_participant_read"
on public.ticket_attachments
for select
to authenticated
using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_attachments.ticket_id
      and (
        t.created_by = auth.uid()
        or (
          t.company_id = public.get_user_company()
          and exists (
            select 1 from public.user_profiles up
            where up.id = auth.uid()
              and up.role in ('company_admin', 'hr_manager')
          )
        )
      )
  )
);

drop policy if exists "ticket_attachments_participant_insert" on public.ticket_attachments;
create policy "ticket_attachments_participant_insert"
on public.ticket_attachments
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_attachments.ticket_id
      and (
        t.created_by = auth.uid()
        or (
          t.company_id = public.get_user_company()
          and exists (
            select 1 from public.user_profiles up
            where up.id = auth.uid()
              and up.role in ('company_admin', 'hr_manager')
          )
        )
      )
  )
);

-- =========================================================================
-- Triggers: keep updated_at fresh + stamp lifecycle timestamps
-- =========================================================================
create or replace function public.set_updated_at_support_tickets()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  -- stamp resolved/closed timestamps on status transitions
  if new.status = 'resolved' and (old.status is distinct from 'resolved') then
    new.resolved_at = coalesce(new.resolved_at, now());
  end if;
  if new.status = 'closed' and (old.status is distinct from 'closed') then
    new.closed_at = coalesce(new.closed_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_support_tickets on public.support_tickets;
create trigger trg_set_updated_at_support_tickets
before update on public.support_tickets
for each row execute function public.set_updated_at_support_tickets();

-- =========================================================================
-- app_notifications: allow module = 'support'
-- =========================================================================
alter table public.app_notifications
  drop constraint if exists app_notifications_module_check;

alter table public.app_notifications
  add constraint app_notifications_module_check
  check (module in ('attendance', 'leave', 'payroll', 'admin', 'system', 'gamification', 'support'));
