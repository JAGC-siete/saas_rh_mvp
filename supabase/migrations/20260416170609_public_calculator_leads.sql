-- Public calculator leads (deducciones / prestaciones PDF opt-in)
-- Idempotent: safe if table already exists in production.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.leads_public_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL,
  full_name text NOT NULL,
  company text,
  phone text,
  source text NOT NULL,
  consent_newsletter boolean NOT NULL DEFAULT true,
  consented_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_public_tools_source_check
    CHECK (source = ANY (ARRAY['deducciones'::text, 'prestaciones'::text]))
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_public_tools_email_ux
  ON public.leads_public_tools (email);

CREATE INDEX IF NOT EXISTS leads_public_tools_source_idx
  ON public.leads_public_tools (source);

CREATE INDEX IF NOT EXISTS leads_public_tools_consented_at_idx
  ON public.leads_public_tools (consented_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'leads_public_tools_set_updated_at'
  ) THEN
    CREATE TRIGGER leads_public_tools_set_updated_at
      BEFORE UPDATE ON public.leads_public_tools
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

COMMENT ON TABLE public.leads_public_tools IS
  'Opt-in leads from public calculators (deducciones, prestaciones). Rich fields; marketing sequence uses marketing_leads.';
