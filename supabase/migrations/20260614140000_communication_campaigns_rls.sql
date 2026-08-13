-- Migration: Communication campaigns (super-admin adoption sequences)
-- Date: 2026-06-14
-- Purpose: Version-control the communication_campaigns / communication_recipients
--          tables (created out-of-band) and FIX the critical security gap:
--          both tables had RLS DISABLED, exposing all rows to anon/authenticated.
--          Writes happen via service_role (createAdminClient) in the API.

-- 1. Ensure tables exist (idempotent; they already exist in prod).
create table if not exists public.communication_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  target_segment text,
  status text default 'draft',
  created_by uuid,
  created_at timestamptz default timezone('utc'::text, now())
);

create table if not exists public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.communication_campaigns(id) on delete cascade,
  user_id uuid,
  email text not null,
  status text not null,
  error_message text,
  sent_at timestamptz default timezone('utc'::text, now())
);

-- 2. Add updated_at to campaigns for status transitions + trigger.
alter table public.communication_campaigns
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

create or replace function public.set_updated_at_communication_campaigns()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_communication_campaigns on public.communication_campaigns;
create trigger trg_set_updated_at_communication_campaigns
before update on public.communication_campaigns
for each row execute function public.set_updated_at_communication_campaigns();

-- 3. Constrain status values (drop first for idempotency).
alter table public.communication_campaigns
  drop constraint if exists communication_campaigns_status_check;
alter table public.communication_campaigns
  add constraint communication_campaigns_status_check
  check (status in ('draft', 'sending', 'sent', 'failed'));

-- 4. Indexes.
create index if not exists idx_communication_campaigns_status
  on public.communication_campaigns(status, created_at desc);
create index if not exists idx_communication_recipients_campaign
  on public.communication_recipients(campaign_id);

-- 5. SECURITY FIX: enable RLS. Writes use service_role (bypasses RLS).
--    Only super_admin may read via the authenticated client.
alter table public.communication_campaigns enable row level security;
alter table public.communication_recipients enable row level security;

drop policy if exists "communication_campaigns_super_admin_read" on public.communication_campaigns;
create policy "communication_campaigns_super_admin_read"
  on public.communication_campaigns
  for select
  to authenticated
  using (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
  );

drop policy if exists "communication_recipients_super_admin_read" on public.communication_recipients;
create policy "communication_recipients_super_admin_read"
  on public.communication_recipients
  for select
  to authenticated
  using (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'super_admin')
  );

comment on table public.communication_campaigns is 'Super-admin mass communication campaigns (user adoption sequences). Write via service_role API.';
comment on table public.communication_recipients is 'Per-recipient delivery log for communication_campaigns.';
