-- Migration: Communication Center v2 (drafts, scheduling, structured blocks)
-- Date: 2026-06-14
-- Purpose: Extend communication_campaigns to support draft/scheduled states,
--          structured "novedades" blocks, hero intro, CTA and commit sourcing.

alter table public.communication_campaigns
  add column if not exists intro text;

alter table public.communication_campaigns
  add column if not exists blocks jsonb not null default '[]'::jsonb;

alter table public.communication_campaigns
  add column if not exists cta_url text;

alter table public.communication_campaigns
  add column if not exists cta_label text;

alter table public.communication_campaigns
  add column if not exists scheduled_at timestamptz;

-- Phase 2: commits referenced when building the campaign.
alter table public.communication_campaigns
  add column if not exists source_commits jsonb;

-- Allow the 'scheduled' lifecycle state.
alter table public.communication_campaigns
  drop constraint if exists communication_campaigns_status_check;
alter table public.communication_campaigns
  add constraint communication_campaigns_status_check
  check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed'));

-- Cron picks scheduled campaigns whose time has come.
create index if not exists idx_communication_campaigns_scheduled
  on public.communication_campaigns (scheduled_at)
  where status = 'scheduled';
