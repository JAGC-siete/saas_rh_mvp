-- Solicitudes públicas de /webycitas (página y/o reservas; Maps al contratar).
-- No crea company, landing_pages, marketing_leads ni tenant SISU.

CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webycitas_lead_status') THEN
    CREATE TYPE public.webycitas_lead_status AS ENUM (
      'received',
      'reviewed',
      'rejected'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.webycitas_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name text NOT NULL,
  business_name text NOT NULL,
  email citext NOT NULL,
  phone text NOT NULL,
  rubro text NOT NULL,
  city text NOT NULL,
  note text,
  services text[] NOT NULL,
  status public.webycitas_lead_status NOT NULL DEFAULT 'received',
  source text NOT NULL DEFAULT 'webycitas',
  consented_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webycitas_leads_owner_name_len CHECK (
    length(trim(owner_name)) BETWEEN 2 AND 80
  ),
  CONSTRAINT webycitas_leads_business_name_len CHECK (
    length(trim(business_name)) BETWEEN 2 AND 120
  ),
  CONSTRAINT webycitas_leads_phone_len CHECK (
    length(trim(phone)) BETWEEN 7 AND 30
  ),
  CONSTRAINT webycitas_leads_city_len CHECK (
    length(trim(city)) BETWEEN 2 AND 80
  ),
  CONSTRAINT webycitas_leads_note_len CHECK (
    note IS NULL OR length(note) <= 500
  ),
  CONSTRAINT webycitas_leads_rubro_check CHECK (
    rubro = ANY (ARRAY[
      'barberia'::text,
      'ferreteria'::text,
      'cafeteria'::text,
      'mercadito'::text,
      'escuela'::text,
      'otro'::text
    ])
  ),
  CONSTRAINT webycitas_leads_services_check CHECK (
    cardinality(services) BETWEEN 1 AND 2
    AND services <@ ARRAY['landing'::text, 'booking'::text]
  ),
  CONSTRAINT webycitas_leads_source_len CHECK (
    length(trim(source)) BETWEEN 3 AND 40
  )
);

COMMENT ON TABLE public.webycitas_leads IS
  'Solicitudes de /webycitas. Insert solo desde el endpoint público (service role). No crea tenant, landing ni secuencia de planilla.';
COMMENT ON COLUMN public.webycitas_leads.status IS
  'received = pendiente de revisión. reviewed/rejected = operación superadmin. Nunca crea company.';
COMMENT ON COLUMN public.webycitas_leads.services IS
  'landing y/o booking. Google Maps no es SKU: se ofrece al contratar cualquiera.';
COMMENT ON COLUMN public.webycitas_leads.notified_at IS
  'Marca de aviso Resend interno enviado al operador.';
COMMENT ON COLUMN public.webycitas_leads.source IS
  'Origen de captura. Default webycitas. Distinto de marketing_leads y leads_public_tools.';

CREATE INDEX IF NOT EXISTS idx_webycitas_leads_status_created_at
  ON public.webycitas_leads (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webycitas_leads_created_at
  ON public.webycitas_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webycitas_leads_email
  ON public.webycitas_leads (email);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'webycitas_leads_set_updated_at') THEN
    CREATE TRIGGER webycitas_leads_set_updated_at
      BEFORE UPDATE ON public.webycitas_leads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

ALTER TABLE public.webycitas_leads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.webycitas_leads FROM anon;
GRANT SELECT, UPDATE ON public.webycitas_leads TO authenticated;
GRANT USAGE ON TYPE public.webycitas_lead_status TO authenticated;

DROP POLICY IF EXISTS webycitas_leads_super_admin_select ON public.webycitas_leads;
CREATE POLICY webycitas_leads_super_admin_select
  ON public.webycitas_leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS webycitas_leads_super_admin_update ON public.webycitas_leads;
CREATE POLICY webycitas_leads_super_admin_update
  ON public.webycitas_leads
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );
