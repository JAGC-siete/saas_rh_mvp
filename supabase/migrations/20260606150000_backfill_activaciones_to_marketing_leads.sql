-- Backfill activaciones.contacto_email → marketing_leads
-- Rules (aligned with P2 domain-reputation policy):
--   rejected                          → unsubscribed, step 5
--   pending / trial_pending_data ≤30d → active, step 1 + ledger marker (no welcome resend)
--   pending / trial_pending_data >30d → unsubscribed stale, step 5
--   verified, active, trial_live,
--   ready_for_conversion              → active, step 1 + ledger marker
-- Idempotent: ON CONFLICT (email) DO NOTHING (existing marketing_leads wins).
-- No emails sent. Dedupes by email (best status, then newest row).

DO $$
BEGIN
  IF to_regclass('public.activaciones') IS NULL THEN
    RAISE NOTICE 'activaciones backfill skipped: public.activaciones does not exist.';
    RETURN;
  END IF;

  IF to_regclass('public.marketing_leads') IS NULL THEN
    RAISE EXCEPTION 'activaciones backfill requires public.marketing_leads';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'marketing_leads'
      AND column_name = 'unsubscribe_token'
  ) THEN
    RAISE EXCEPTION 'activaciones backfill requires marketing_leads.unsubscribe_token';
  END IF;

  CREATE TEMP TABLE _activaciones_marketing_source ON COMMIT DROP AS
  WITH deduped AS (
    SELECT DISTINCT ON (lower(trim(a.contacto_email)))
      lower(trim(a.contacto_email)) AS email,
      a.status,
      a.created_at,
      a.empresa,
      a.id AS activacion_id
    FROM public.activaciones a
    WHERE lower(trim(a.contacto_email)) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    ORDER BY
      lower(trim(a.contacto_email)),
      CASE a.status
        WHEN 'active' THEN 1
        WHEN 'trial_live' THEN 2
        WHEN 'ready_for_conversion' THEN 3
        WHEN 'verified' THEN 4
        WHEN 'trial_pending_data' THEN 5
        WHEN 'pending' THEN 6
        WHEN 'rejected' THEN 99
        ELSE 50
      END,
      a.created_at DESC
  )
  SELECT
    d.email,
    d.status,
    d.created_at,
    d.empresa,
    d.activacion_id,
    CASE
      WHEN d.status = 'rejected' THEN 'unsubscribed'::public.marketing_lead_status
      WHEN d.status IN ('pending', 'trial_pending_data')
        AND d.created_at >= (now() - interval '30 days') THEN 'active'::public.marketing_lead_status
      WHEN d.status IN ('pending', 'trial_pending_data') THEN 'unsubscribed'::public.marketing_lead_status
      ELSE 'active'::public.marketing_lead_status
    END AS target_status,
    CASE
      WHEN d.status = 'rejected' THEN 5
      WHEN d.status IN ('pending', 'trial_pending_data')
        AND d.created_at >= (now() - interval '30 days') THEN 1
      WHEN d.status IN ('pending', 'trial_pending_data') THEN 5
      ELSE 1
    END AS target_step,
    CASE
      WHEN d.status = 'rejected' THEN false
      WHEN d.status IN ('pending', 'trial_pending_data')
        AND d.created_at < (now() - interval '30 days') THEN false
      ELSE true
    END AS record_ledger_marker
  FROM deduped d;

  INSERT INTO public.marketing_leads (
    email,
    source,
    status,
    current_step,
    unsubscribe_token,
    unsubscribed_at,
    created_at
  )
  SELECT
    s.email,
    'activaciones:' || COALESCE(NULLIF(trim(s.status), ''), 'unknown') AS source,
    s.target_status,
    s.target_step,
    encode(gen_random_bytes(24), 'hex') AS unsubscribe_token,
    CASE
      WHEN s.target_status = 'unsubscribed'::public.marketing_lead_status THEN
        COALESCE(s.created_at, now())
      ELSE NULL
    END AS unsubscribed_at,
    s.created_at
  FROM _activaciones_marketing_source s
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO public.marketing_email_ledger (
    lead_id,
    step,
    step_label,
    subject,
    watch_window_key
  )
  SELECT
    ml.id,
    0,
    'Activaciones backfill',
    'Import from activaciones (no resend)',
    NULL
  FROM public.marketing_leads ml
  INNER JOIN _activaciones_marketing_source s ON ml.email = s.email
  WHERE s.record_ledger_marker
    AND ml.status = 'active'::public.marketing_lead_status
    AND ml.current_step = 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.marketing_email_ledger led
      WHERE led.lead_id = ml.id
        AND led.step = 0
    );

  RAISE NOTICE 'activaciones → marketing_leads backfill complete. Run: SELECT * FROM marketing_activaciones_backfill_summary;';
END$$;

CREATE OR REPLACE VIEW public.marketing_activaciones_backfill_summary AS
SELECT
  a.status AS activacion_status,
  COUNT(*) AS activacion_rows,
  COUNT(DISTINCT lower(trim(a.contacto_email))) AS distinct_emails,
  COUNT(*) FILTER (WHERE a.created_at >= (now() - interval '30 days')) AS activacion_last_30_days,
  COUNT(ml.id) AS matched_in_marketing_leads,
  COUNT(*) FILTER (WHERE ml.status = 'active'::public.marketing_lead_status) AS marketing_active,
  COUNT(*) FILTER (WHERE ml.status = 'unsubscribed'::public.marketing_lead_status) AS marketing_unsubscribed
FROM public.activaciones a
LEFT JOIN public.marketing_leads ml
  ON ml.email = lower(trim(a.contacto_email))
GROUP BY a.status
ORDER BY a.status;

COMMENT ON VIEW public.marketing_activaciones_backfill_summary IS
  'Ops: activaciones vs marketing_leads after backfill. Re-run migration safe.';
