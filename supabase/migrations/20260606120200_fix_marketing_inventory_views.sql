-- Repair: re-apply inventory views when 20260606120100 failed on missing mail_list_subscriptions.
-- Safe to run multiple times.

CREATE OR REPLACE VIEW public.marketing_lead_inventory AS
SELECT
  status,
  current_step,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (WHERE last_mail_sent_at IS NOT NULL) AS with_mail_sent,
  MIN(created_at) AS oldest_created_at,
  MAX(created_at) AS newest_created_at
FROM public.marketing_leads
GROUP BY status, current_step
ORDER BY status, current_step;

COMMENT ON VIEW public.marketing_lead_inventory IS
  'P0 ops: counts by status/step for marketing_leads sequence.';

DO $$
BEGIN
  IF to_regclass('public.mail_list_subscriptions') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.mail_list_legacy_inventory AS
      SELECT
        status,
        COUNT(*) AS subscription_count,
        MIN(created_at) AS oldest_created_at,
        MAX(created_at) AS newest_created_at,
        COUNT(*) FILTER (WHERE created_at >= (now() - interval '30 days')) AS last_30_days
      FROM public.mail_list_subscriptions
      GROUP BY status
      ORDER BY status
    $view$;

    EXECUTE $comment$
      COMMENT ON VIEW public.mail_list_legacy_inventory IS
        'P0 ops: legacy double opt-in table; pending last_30_days guides P2 migration cutoff.'
    $comment$;
  ELSE
    DROP VIEW IF EXISTS public.mail_list_legacy_inventory;
    RAISE NOTICE 'mail_list_subscriptions not found; skipped mail_list_legacy_inventory view.';
  END IF;
END$$;
