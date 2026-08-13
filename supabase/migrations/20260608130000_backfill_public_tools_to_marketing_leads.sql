-- Backfill leads_public_tools → marketing_leads (skip welcome: historical opt-ins)
-- Idempotent: ON CONFLICT (email) DO NOTHING

DO $$
BEGIN
  IF to_regclass('public.leads_public_tools') IS NULL
     OR to_regclass('public.marketing_leads') IS NULL THEN
    RAISE NOTICE 'public tools → marketing backfill skipped: required tables missing';
    RETURN;
  END IF;
END$$;

INSERT INTO public.marketing_leads (
  email,
  source,
  status,
  current_step,
  unsubscribe_token,
  created_at,
  updated_at
)
SELECT
  lower(trim(lpt.email::text)) AS email,
  CASE lpt.source
    WHEN 'prestaciones' THEN 'calculadora-prestaciones'
    ELSE 'calculadora-deducciones'
  END AS source,
  'active'::public.marketing_lead_status AS status,
  1::smallint AS current_step,
  encode(gen_random_bytes(24), 'hex') AS unsubscribe_token,
  COALESCE(lpt.consented_at, lpt.created_at, now()) AS created_at,
  now() AS updated_at
FROM public.leads_public_tools lpt
WHERE lpt.consent_newsletter = true
  AND trim(lpt.email::text) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.marketing_leads ml
    WHERE lower(ml.email) = lower(trim(lpt.email::text))
  )
ON CONFLICT (email) DO NOTHING;
