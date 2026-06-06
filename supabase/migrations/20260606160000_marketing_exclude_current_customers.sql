-- Exclude current customer contacts from marketing sequence; activate all other leads for watchman.
-- Customer companies (product decision 2026-06):
--   4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c  Prohalca
--   48ab60e4-83ff-4a76-9310-cf32e076d1a3  Grupo Gastro Cueva
--   7a0278af-4c01-4dfb-a098-7fb2b8090d3f  Tony's Mar Restaurante
--   c419b1a5-32de-4518-8ff2-e7ebd6318a9f  Enlace

DO $$
BEGIN
  IF to_regclass('public.marketing_leads') IS NULL THEN
    RAISE NOTICE 'customer exclusion skipped: marketing_leads missing';
    RETURN;
  END IF;

  CREATE TEMP TABLE _marketing_current_customer_contacts ON COMMIT DROP AS
  SELECT DISTINCT ON (comp.id)
    comp.id AS company_id,
    comp.name AS company_name,
    lower(trim(a.contacto_email)) AS email,
    a.contacto_nombre AS contact_name
  FROM public.companies comp
  INNER JOIN public.activaciones a ON (
    (comp.id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c'::uuid AND a.empresa ILIKE '%prohalca%')
    OR (comp.id = 'c419b1a5-32de-4518-8ff2-e7ebd6318a9f'::uuid AND a.empresa ILIKE '%enlace%')
    OR (comp.id = '48ab60e4-83ff-4a76-9310-cf32e076d1a3'::uuid AND a.empresa ILIKE '%gastro cueva%')
    OR (comp.id = '7a0278af-4c01-4dfb-a098-7fb2b8090d3f'::uuid AND (
      a.empresa ILIKE '%tony''s mar%' OR a.empresa ILIKE '%tonys mar%' OR a.empresa = 'Tony''s Mar'
    ))
  )
  WHERE comp.id IN (
    '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c'::uuid,
    '48ab60e4-83ff-4a76-9310-cf32e076d1a3'::uuid,
    '7a0278af-4c01-4dfb-a098-7fb2b8090d3f'::uuid,
    'c419b1a5-32de-4518-8ff2-e7ebd6318a9f'::uuid
  )
  ORDER BY comp.id, a.created_at DESC;

  -- Current customers: out of sequence (watchman only sends to status = active)
  UPDATE public.marketing_leads ml
  SET
    status = 'completed'::public.marketing_lead_status,
    current_step = 5,
    unsubscribed_at = NULL,
    source = 'current_customer:' || cc.company_id::text
  FROM _marketing_current_customer_contacts cc
  WHERE ml.email = cc.email;

  -- Everyone else: eligible for watchman steps 1–4
  UPDATE public.marketing_leads ml
  SET
    status = 'active'::public.marketing_lead_status,
    current_step = 1,
    unsubscribed_at = NULL
  WHERE ml.email NOT IN (SELECT email FROM _marketing_current_customer_contacts);

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
    'Prospect reactivation',
    'Eligible for watchman (no welcome resend)',
    NULL
  FROM public.marketing_leads ml
  WHERE ml.status = 'active'::public.marketing_lead_status
    AND ml.current_step = 1
    AND ml.email NOT IN (SELECT email FROM _marketing_current_customer_contacts)
    AND NOT EXISTS (
      SELECT 1 FROM public.marketing_email_ledger led
      WHERE led.lead_id = ml.id AND led.step = 0
    );

  RAISE NOTICE 'Customer exclusion applied. See marketing_current_customer_contacts view.';
END$$;

CREATE OR REPLACE VIEW public.marketing_current_customer_contacts AS
SELECT DISTINCT ON (comp.id)
  comp.id AS company_id,
  comp.name AS company_name,
  lower(trim(a.contacto_email)) AS email,
  a.contacto_nombre AS contact_name,
  ml.status AS marketing_status,
  ml.current_step
FROM public.companies comp
INNER JOIN public.activaciones a ON (
  (comp.id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c'::uuid AND a.empresa ILIKE '%prohalca%')
  OR (comp.id = 'c419b1a5-32de-4518-8ff2-e7ebd6318a9f'::uuid AND a.empresa ILIKE '%enlace%')
  OR (comp.id = '48ab60e4-83ff-4a76-9310-cf32e076d1a3'::uuid AND a.empresa ILIKE '%gastro cueva%')
  OR (comp.id = '7a0278af-4c01-4dfb-a098-7fb2b8090d3f'::uuid AND (
    a.empresa ILIKE '%tony''s mar%' OR a.empresa ILIKE '%tonys mar%' OR a.empresa = 'Tony''s Mar'
  ))
)
LEFT JOIN public.marketing_leads ml ON ml.email = lower(trim(a.contacto_email))
WHERE comp.id IN (
  '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c'::uuid,
  '48ab60e4-83ff-4a76-9310-cf32e076d1a3'::uuid,
  '7a0278af-4c01-4dfb-a098-7fb2b8090d3f'::uuid,
  'c419b1a5-32de-4518-8ff2-e7ebd6318a9f'::uuid
)
ORDER BY comp.id, a.created_at DESC;

COMMENT ON VIEW public.marketing_current_customer_contacts IS
  'Current paying customers excluded from marketing sequence (4 company IDs).';
