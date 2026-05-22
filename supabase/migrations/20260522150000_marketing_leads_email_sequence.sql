-- Migration: Marketing leads email sequence (Step 0 welcome + Steps 1–4 pain points)
-- Date: 2026-05-22

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_lead_status') THEN
    CREATE TYPE public.marketing_lead_status AS ENUM ('active', 'unsubscribed', 'completed');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text,
  status public.marketing_lead_status NOT NULL DEFAULT 'active',
  current_step smallint NOT NULL DEFAULT 0,
  last_mail_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_leads_current_step_non_negative CHECK (current_step >= 0)
);
COMMENT ON TABLE public.marketing_leads IS 'Lead sequence state: Step 0 welcome on subscribe, Steps 1–4 via bi-monthly Watchman.';
COMMENT ON COLUMN public.marketing_leads.current_step IS '0=awaiting welcome, 1–4=next pain-point step, 5+=sequence complete.';

CREATE TABLE IF NOT EXISTS public.marketing_email_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  step smallint NOT NULL,
  step_label text NOT NULL,
  subject text NOT NULL,
  watch_window_key text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_email_ledger_step_range CHECK (step >= 0 AND step <= 4)
);
COMMENT ON TABLE public.marketing_email_ledger IS 'Audit log of every sequence email sent (Step 0 welcome + Steps 1–4 pain points).';
COMMENT ON COLUMN public.marketing_email_ledger.watch_window_key IS 'YYYY-M-first|second for Watchman sends; null for immediate Step 0 welcome.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'marketing_leads_set_updated_at'
  ) THEN
    CREATE TRIGGER marketing_leads_set_updated_at
      BEFORE UPDATE ON public.marketing_leads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_status_step
  ON public.marketing_leads(status, current_step);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_email
  ON public.marketing_leads(email);
CREATE INDEX IF NOT EXISTS idx_marketing_email_ledger_lead_id
  ON public.marketing_email_ledger(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketing_email_ledger_window
  ON public.marketing_email_ledger(lead_id, watch_window_key);

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_ledger ENABLE ROW LEVEL SECURITY;

-- Service role / admin only — all writes go through API with service role key.
CREATE POLICY "admin_select_marketing_leads"
  ON public.marketing_leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'company_admin')
    )
  );

CREATE POLICY "admin_select_marketing_email_ledger"
  ON public.marketing_email_ledger
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'company_admin')
    )
  );
