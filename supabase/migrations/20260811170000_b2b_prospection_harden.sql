-- Harden B2B prospection: idempotent sent ledger + no-email comercio dedupe.
-- Safe if already applied inside b2b_prospection remote apply.

CREATE UNIQUE INDEX IF NOT EXISTS b2b_prospect_contacts_run_comercio_noemail_uidx
  ON public.b2b_prospect_contacts (run_id, lower(trim(comercio)))
  WHERE email_normalized IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS b2b_prospect_email_ledger_contact_sent_uidx
  ON public.b2b_prospect_email_ledger (contact_id)
  WHERE status = 'sent';

COMMENT ON TABLE public.b2b_prospect_runs IS
  'Outbound B2B prospection runs. Writes via SuperAdmin API (service role) only; RLS SELECT for super_admin.';

COMMENT ON TABLE public.b2b_prospect_contacts IS
  'B2B prospect contacts. Writes via SuperAdmin API only.';

COMMENT ON TABLE public.b2b_prospect_email_ledger IS
  'Outbound send audit. At most one status=sent per contact (partial unique index).';
