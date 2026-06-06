-- P2: Idempotent backfill mail_list_subscriptions → marketing_leads
-- Skips entirely when legacy table does not exist (greenfield envs).

DO $$
BEGIN
  IF to_regclass('public.mail_list_subscriptions') IS NULL THEN
    RAISE NOTICE 'P2 backfill skipped: public.mail_list_subscriptions does not exist.';
    RETURN;
  END IF;

  IF to_regclass('public.marketing_leads') IS NULL THEN
    RAISE EXCEPTION 'P2 backfill requires public.marketing_leads';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'marketing_leads'
      AND column_name = 'unsubscribe_token'
  ) THEN
    RAISE EXCEPTION 'P2 backfill requires marketing_leads.unsubscribe_token (run 20260606120000 first)';
  END IF;

  -- 1) Insert leads only missing in marketing_leads (existing row wins)
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
    lower(trim(mls.email)) AS email,
    COALESCE(NULLIF(trim(mls.source), ''), 'legacy-mail-list') AS source,
    CASE
      WHEN mls.status = 'confirmed'::public.mail_list_status THEN 'active'::public.marketing_lead_status
      WHEN mls.status = 'pending'::public.mail_list_status
        AND mls.created_at >= (now() - interval '30 days') THEN 'active'::public.marketing_lead_status
      ELSE 'unsubscribed'::public.marketing_lead_status
    END AS status,
    CASE
      WHEN mls.status = 'confirmed'::public.mail_list_status THEN 1
      WHEN mls.status = 'pending'::public.mail_list_status
        AND mls.created_at >= (now() - interval '30 days') THEN 1
      ELSE 5
    END AS current_step,
    encode(gen_random_bytes(24), 'hex') AS unsubscribe_token,
    CASE
      WHEN mls.status = 'unsubscribed'::public.mail_list_status THEN
        COALESCE(mls.unsubscribed_at, mls.updated_at, mls.created_at)
      WHEN mls.status = 'pending'::public.mail_list_status
        AND mls.created_at < (now() - interval '30 days') THEN
        COALESCE(mls.updated_at, mls.created_at)
      ELSE NULL
    END AS unsubscribed_at,
    mls.created_at
  FROM public.mail_list_subscriptions mls
  WHERE lower(trim(mls.email)) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ON CONFLICT (email) DO NOTHING;

  -- 2) Ledger marker — subscribe must not re-send welcome
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
    'Migrated legacy',
    'Legacy backfill (no resend)',
    NULL
  FROM public.marketing_leads ml
  INNER JOIN public.mail_list_subscriptions mls
    ON ml.email = lower(trim(mls.email))
  WHERE ml.status = 'active'::public.marketing_lead_status
    AND ml.current_step = 1
    AND (
      mls.status = 'confirmed'::public.mail_list_status
      OR (
        mls.status = 'pending'::public.mail_list_status
        AND mls.created_at >= (now() - interval '30 days')
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.marketing_email_ledger led
      WHERE led.lead_id = ml.id
        AND led.step = 0
    );

  -- 3) Audit on legacy rows (table kept for P4 token fallback)
  UPDATE public.mail_list_subscriptions mls
  SET metadata = COALESCE(mls.metadata, '{}'::jsonb) || jsonb_build_object(
    'p2_migrated_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'p2_target_status', CASE
      WHEN mls.status = 'confirmed'::public.mail_list_status THEN 'active'
      WHEN mls.status = 'pending'::public.mail_list_status
        AND mls.created_at >= (now() - interval '30 days') THEN 'active'
      WHEN mls.status = 'pending'::public.mail_list_status THEN 'unsubscribed_stale'
      ELSE 'unsubscribed'
    END
  );

  COMMENT ON TABLE public.mail_list_subscriptions IS
    'DEPRECATED (P2): legacy double opt-in. New captures use marketing_leads. Kept for token fallback until P5.';

  RAISE NOTICE 'P2 backfill complete. Run: SELECT * FROM marketing_p2_backfill_summary;';
END$$;

-- Verification view (conditional)
DO $$
BEGIN
  IF to_regclass('public.mail_list_subscriptions') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.marketing_p2_backfill_summary AS
      SELECT
        mls.status AS legacy_status,
        COUNT(*) AS legacy_rows,
        COUNT(*) FILTER (
          WHERE mls.created_at >= (now() - interval '30 days')
        ) AS legacy_last_30_days,
        COUNT(*) FILTER (
          WHERE (mls.metadata ->> 'p2_migrated_at') IS NOT NULL
        ) AS legacy_marked_migrated,
        COUNT(ml.id) AS matched_in_marketing_leads,
        COUNT(*) FILTER (
          WHERE ml.status = 'active'::public.marketing_lead_status
        ) AS marketing_active,
        COUNT(*) FILTER (
          WHERE ml.status = 'unsubscribed'::public.marketing_lead_status
        ) AS marketing_unsubscribed
      FROM public.mail_list_subscriptions mls
      LEFT JOIN public.marketing_leads ml
        ON ml.email = lower(trim(mls.email))
      GROUP BY mls.status
      ORDER BY mls.status
    $view$;

    EXECUTE $comment$
      COMMENT ON VIEW public.marketing_p2_backfill_summary IS
        'P2 ops: legacy vs marketing_leads counts after backfill. Re-run safe.'
    $comment$;
  END IF;
END$$;
