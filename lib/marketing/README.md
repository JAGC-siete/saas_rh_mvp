# Marketing email sequence

Single opt-in lead capture via `POST /api/mail-list/subscribe` → `marketing_leads`.

## Flow

1. **Subscribe** — welcome (step 0) + ledger entry; `current_step` → 1.
2. **Watchman** — steps 1–4 on bi-monthly windows (days 12–16, 26–30), triggered by:
   - `POST /api/cron/daily` (when today is a watch day)
   - `POST /api/cron/sequence-watchman` (standalone)
3. **Unsubscribe** — `GET /api/mail-list/unsubscribe?token=` (marketing `unsubscribe_token`; legacy `confirmation_token` fallback).

Every outbound sequence email includes a one-click unsubscribe footer (`lib/marketing/unsubscribe.ts`).

## Ops

- Inventory views: `marketing_lead_inventory` (always). `mail_list_legacy_inventory` only if table `mail_list_subscriptions` exists.
- Dry run: `WATCHMAN_DRY_RUN=true` skips Resend sends and ledger/step updates.

## P2 (backfill legacy → marketing_leads)

Migration `20260606130000_p2_backfill_legacy_mail_list_to_marketing_leads.sql`:

| Legacy status | Age | → marketing_leads |
|---------------|-----|-------------------|
| `confirmed` | any | `active`, step **1**, ledger marker step 0 |
| `pending` | ≤ **30 days** | `active`, step **1**, ledger marker |
| `pending` | > 30 days | `unsubscribed`, step **5** (no emails) |
| `unsubscribed` | any | `unsubscribed`, step **5** |

- Idempotent: `ON CONFLICT (email) DO NOTHING` (existing `marketing_leads` wins).
- Legacy table **not dropped**; `metadata.p2_migrated_at` set on all legacy rows.
- Verify: `SELECT * FROM marketing_p2_backfill_summary;`
- Skip-safe if `mail_list_subscriptions` does not exist.

## P3 (admin)

- `/app/admin/mail-list` → `marketing_leads` + conteo en `marketing_email_ledger`
- Stats: activos, completados, desuscritos, emails enviados, en cola watchman
- Export: `GET /api/admin/mail-list/export` (hasta 10k filas, respeta filtros)

## P4 (legacy token sunset)

Module: `lib/marketing/legacy-token-fallback.ts`

| Route | Behavior |
|-------|----------|
| `GET /api/mail-list/confirm?token=` | Pending **≤ 30 días** → `marketing_leads` active + ledger marker. Pending **> 30 días** → `error=expired`. Confirmed/unsubscribed → sync marketing. |
| `GET /api/mail-list/unsubscribe?token=` | 1) `marketing_leads.unsubscribe_token` 2) legacy `confirmation_token` fallback (any age, while table exists) |

After P5 migration, confirm redirects to `error=legacy_retired`; unsubscribe is marketing-only.

## P5 (drop legacy)

Migration `20260606140000_p5_drop_legacy_mail_list.sql`:

- Archives to `mail_list_subscriptions_archive` before drop
- Drops `mail_list_subscriptions`, legacy views, enum `mail_list_status`
- Removed: `lib/emails/mail-list-confirmation.ts`

Restore if needed: `SELECT * FROM mail_list_subscriptions_archive;`
