-- B2B outbound prospection (SuperAdmin): runs, contacts, email ledger.
-- Separate from marketing_leads (inbound TOFU sequence).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'b2b_prospect_run_status') THEN
    CREATE TYPE public.b2b_prospect_run_status AS ENUM (
      'draft',
      'ready',
      'sending',
      'sent',
      'archived'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'b2b_prospect_confidence') THEN
    CREATE TYPE public.b2b_prospect_confidence AS ENUM (
      'alta',
      'media',
      'baja',
      'descartado'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'b2b_prospect_email_status') THEN
    CREATE TYPE public.b2b_prospect_email_status AS ENUM (
      'dry_run',
      'sent',
      'error',
      'skipped'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.b2b_prospect_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad text NOT NULL,
  departamento text,
  pais text NOT NULL DEFAULT 'Honduras',
  rubros text[] NOT NULL DEFAULT '{}',
  status public.b2b_prospect_run_status NOT NULL DEFAULT 'draft',
  email_subject text NOT NULL,
  email_body text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.b2b_prospect_runs IS
  'Outbound B2B prospection runs (ciudad/rubro). Email template editable per run.';

CREATE TABLE IF NOT EXISTS public.b2b_prospect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.b2b_prospect_runs(id) ON DELETE CASCADE,
  comercio text NOT NULL,
  rubro text,
  telefono text,
  email text,
  email_normalized text,
  direccion text,
  confianza public.b2b_prospect_confidence NOT NULL DEFAULT 'media',
  fuentes text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b2b_prospect_contacts_comercio_nonempty CHECK (length(trim(comercio)) > 0)
);

COMMENT ON TABLE public.b2b_prospect_contacts IS
  'Contacts for a B2B prospection run. Emails optional until verified.';

CREATE UNIQUE INDEX IF NOT EXISTS b2b_prospect_contacts_run_email_uidx
  ON public.b2b_prospect_contacts (run_id, email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS b2b_prospect_contacts_run_comercio_noemail_uidx
  ON public.b2b_prospect_contacts (run_id, lower(trim(comercio)))
  WHERE email_normalized IS NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_prospect_contacts_run_id
  ON public.b2b_prospect_contacts (run_id);

CREATE INDEX IF NOT EXISTS idx_b2b_prospect_runs_created_at
  ON public.b2b_prospect_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.b2b_prospect_email_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.b2b_prospect_runs(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.b2b_prospect_contacts(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  to_email text NOT NULL,
  status public.b2b_prospect_email_status NOT NULL,
  resend_id text,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.b2b_prospect_email_ledger IS
  'Outbound send audit. At most one status=sent per contact. Writes via SuperAdmin API only.';

CREATE UNIQUE INDEX IF NOT EXISTS b2b_prospect_email_ledger_contact_sent_uidx
  ON public.b2b_prospect_email_ledger (contact_id)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS idx_b2b_prospect_email_ledger_run_id
  ON public.b2b_prospect_email_ledger (run_id);

CREATE INDEX IF NOT EXISTS idx_b2b_prospect_email_ledger_contact_id
  ON public.b2b_prospect_email_ledger (contact_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'b2b_prospect_runs_set_updated_at') THEN
    CREATE TRIGGER b2b_prospect_runs_set_updated_at
      BEFORE UPDATE ON public.b2b_prospect_runs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'b2b_prospect_contacts_set_updated_at') THEN
    CREATE TRIGGER b2b_prospect_contacts_set_updated_at
      BEFORE UPDATE ON public.b2b_prospect_contacts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

ALTER TABLE public.b2b_prospect_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_prospect_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_prospect_email_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_select_b2b_prospect_runs"
  ON public.b2b_prospect_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin_select_b2b_prospect_contacts"
  ON public.b2b_prospect_contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin_select_b2b_prospect_email_ledger"
  ON public.b2b_prospect_email_ledger
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );
