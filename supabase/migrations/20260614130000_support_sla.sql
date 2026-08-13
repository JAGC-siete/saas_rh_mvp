-- Migration: SLA tracking for support tickets (Phase 3)
-- Date: 2026-06-14
-- Purpose: Track first-response SLA breaches and escalation for the support
--          queue. SLA targets themselves are computed in application code
--          (lib/support/sla.ts) keyed by priority.

alter table public.support_tickets
  add column if not exists sla_breached boolean not null default false;

alter table public.support_tickets
  add column if not exists escalated_at timestamptz null;

-- Index used by the SLA escalation cron: only active tickets pending first
-- response with a due date are scanned.
create index if not exists support_tickets_sla_pending_idx
  on public.support_tickets (sla_due_at)
  where status in ('open', 'in_progress', 'waiting_customer')
    and first_response_at is null
    and sla_breached = false;
