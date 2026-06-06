-- P5: Archive and drop legacy mail_list_subscriptions (after P2 backfill + P4 token sunset).
-- Restore from mail_list_subscriptions_archive if needed.

DO $$
BEGIN
  IF to_regclass('public.mail_list_subscriptions') IS NULL THEN
    RAISE NOTICE 'P5: mail_list_subscriptions already absent; skipping drop.';
    RETURN;
  END IF;

  -- 1) Archive (idempotent: only copy if archive empty or missing)
  IF to_regclass('public.mail_list_subscriptions_archive') IS NULL THEN
    EXECUTE $archive$
      CREATE TABLE public.mail_list_subscriptions_archive AS
      SELECT
        m.*,
        now() AT TIME ZONE 'UTC' AS archived_at
      FROM public.mail_list_subscriptions m
    $archive$;

    EXECUTE $comment$
      COMMENT ON TABLE public.mail_list_subscriptions_archive IS
        'P5 backup of legacy mail_list_subscriptions before drop. Read-only restore source.'
    $comment$;

    CREATE INDEX IF NOT EXISTS idx_mail_list_archive_email
      ON public.mail_list_subscriptions_archive(email);
  ELSE
    RAISE NOTICE 'P5: mail_list_subscriptions_archive already exists; skipping re-archive.';
  END IF;

  -- 2) Drop dependent views
  DROP VIEW IF EXISTS public.mail_list_legacy_inventory;
  DROP VIEW IF EXISTS public.marketing_p2_backfill_summary;

  -- 3) Drop trigger
  DROP TRIGGER IF EXISTS mail_list_set_updated_at ON public.mail_list_subscriptions;

  -- 4) Drop RLS policies
  DROP POLICY IF EXISTS "Allow anonymous subscription insert" ON public.mail_list_subscriptions;
  DROP POLICY IF EXISTS "Allow token-based subscription read" ON public.mail_list_subscriptions;
  DROP POLICY IF EXISTS "Allow token-based subscription update" ON public.mail_list_subscriptions;
  DROP POLICY IF EXISTS "public_insert" ON public.mail_list_subscriptions;
  DROP POLICY IF EXISTS "public_select_by_token" ON public.mail_list_subscriptions;
  DROP POLICY IF EXISTS "public_update_by_token" ON public.mail_list_subscriptions;
  DROP POLICY IF EXISTS "admin_select_all" ON public.mail_list_subscriptions;

  -- 5) Drop table and enum
  DROP TABLE public.mail_list_subscriptions;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE c.relkind = 'r'
      AND t.typname = 'mail_list_status'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    DROP TYPE IF EXISTS public.mail_list_status;
  ELSE
    RAISE NOTICE 'P5: mail_list_status enum still referenced; not dropped.';
  END IF;

  RAISE NOTICE 'P5 complete: legacy mail_list_subscriptions dropped. Archive: mail_list_subscriptions_archive';
END$$;
