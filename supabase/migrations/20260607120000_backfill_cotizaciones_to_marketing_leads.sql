-- Backfill cotizaciones.contact_email → marketing_leads
-- Rules: active leads at step 1 + ledger marker (no welcome resend).
-- Idempotent: ON CONFLICT (email) DO NOTHING.

DO $$
BEGIN
  IF to_regclass('public.cotizaciones') IS NULL THEN
    RAISE NOTICE 'cotizaciones backfill skipped: public.cotizaciones does not exist.';
    RETURN;
  END IF;

  IF to_regclass('public.marketing_leads') IS NULL THEN
    RAISE EXCEPTION 'cotizaciones backfill requires public.marketing_leads';
  END IF;

  CREATE TEMP TABLE _cotizaciones_marketing_source ON COMMIT DROP AS
  SELECT DISTINCT ON (lower(trim(c.contact_email)))
    lower(trim(c.contact_email)) AS email,
    c.created_at
  FROM public.cotizaciones c
  WHERE lower(trim(c.contact_email)) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ORDER BY lower(trim(c.contact_email)), c.created_at DESC;

  INSERT INTO public.marketing_leads (
    email,
    source,
    status,
    current_step,
    unsubscribe_token,
    created_at
  )
  SELECT
    s.email,
    'ventas:backfill' AS source,
    'active'::public.marketing_lead_status,
    1,
    encode(gen_random_bytes(24), 'hex') AS unsubscribe_token,
    s.created_at
  FROM _cotizaciones_marketing_source s
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
    'Ventas backfill',
    'Import from cotizaciones (no resend)',
    NULL
  FROM public.marketing_leads ml
  INNER JOIN _cotizaciones_marketing_source s ON ml.email = s.email
  WHERE ml.source = 'ventas:backfill'
    AND ml.status = 'active'::public.marketing_lead_status
    AND ml.current_step = 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.marketing_email_ledger led
      WHERE led.lead_id = ml.id
        AND led.step = 0
    );

  RAISE NOTICE 'cotizaciones → marketing_leads backfill complete.';
END$$;
