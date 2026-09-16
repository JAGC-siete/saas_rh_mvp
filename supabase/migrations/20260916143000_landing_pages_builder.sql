-- SaaS "Creador de Landing Pages": páginas por empresa (diseño en JSONB) + leads capturados.
-- Modelo: content = borrador editable; published_content = snapshot inmutable que sirve el render público.
-- Tenant: toda lectura de dashboard filtra company_id (RLS + .eq en la app).
-- Render público: resuelve el tenant por slug (no hay sesión), lee solo published_content vía service role.

CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'landing_page_status') THEN
    CREATE TYPE public.landing_page_status AS ENUM (
      'draft',
      'published',
      'archived'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'landing_page_template') THEN
    CREATE TYPE public.landing_page_template AS ENUM (
      'papeleria',
      'barberia',
      'salon_belleza',
      'comercial'
    );
  END IF;
END$$;

-- =========================
-- 1) landing_pages
-- =========================

CREATE TABLE IF NOT EXISTS public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  template_key public.landing_page_template NOT NULL,
  status public.landing_page_status NOT NULL DEFAULT 'draft',
  schema_version integer NOT NULL DEFAULT 1,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_content jsonb,
  lead_notify_email citext,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_pages_name_len CHECK (length(trim(name)) BETWEEN 2 AND 120),
  CONSTRAINT landing_pages_slug_format CHECK (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 63
  ),
  CONSTRAINT landing_pages_schema_version_positive CHECK (schema_version >= 1),
  CONSTRAINT landing_pages_content_object CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT landing_pages_published_content_object CHECK (
    published_content IS NULL OR jsonb_typeof(published_content) = 'object'
  ),
  -- 'published' exige snapshot + fecha: el render público nunca sirve un borrador.
  CONSTRAINT landing_pages_published_requires_snapshot CHECK (
    status <> 'published' OR (published_content IS NOT NULL AND published_at IS NOT NULL)
  ),
  -- Permite FK compuesta desde tablas hijas y garantiza consistencia de tenant.
  CONSTRAINT landing_pages_id_company_uniq UNIQUE (id, company_id)
);

COMMENT ON TABLE public.landing_pages IS
  'Landing pages del constructor SaaS. El diseño vive en JSONB (nunca HTML crudo); el motor de render lo interpreta.';
COMMENT ON COLUMN public.landing_pages.content IS
  'Borrador editable. Contrato validado con Zod en lib/landing-pages/page-schema.ts.';
COMMENT ON COLUMN public.landing_pages.published_content IS
  'Snapshot publicado que sirve la ruta pública. NULL mientras la página nunca se publicó.';
COMMENT ON COLUMN public.landing_pages.schema_version IS
  'Versión del contrato JSON para migrar estructuras sin romper páginas vivas.';
COMMENT ON COLUMN public.landing_pages.lead_notify_email IS
  'Destino del aviso Resend cuando la landing captura un lead. NULL = usa el contacto de la empresa.';

CREATE UNIQUE INDEX IF NOT EXISTS landing_pages_slug_uidx
  ON public.landing_pages (slug);

CREATE UNIQUE INDEX IF NOT EXISTS landing_pages_company_name_uidx
  ON public.landing_pages (company_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_landing_pages_company_updated_at
  ON public.landing_pages (company_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_landing_pages_company_status
  ON public.landing_pages (company_id, status);

-- =========================
-- 2) landing_page_leads
-- =========================

CREATE TABLE IF NOT EXISTS public.landing_page_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email citext,
  phone text,
  message text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'landing-page',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_page_leads_page_company_fk
    FOREIGN KEY (landing_page_id, company_id)
    REFERENCES public.landing_pages (id, company_id) ON DELETE CASCADE,
  CONSTRAINT landing_page_leads_full_name_len CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  CONSTRAINT landing_page_leads_message_len CHECK (message IS NULL OR length(message) <= 1000),
  CONSTRAINT landing_page_leads_extra_object CHECK (jsonb_typeof(extra) = 'object'),
  CONSTRAINT landing_page_leads_contact_present CHECK (
    email IS NOT NULL OR (phone IS NOT NULL AND length(regexp_replace(phone, '\D', '', 'g')) >= 7)
  )
);

COMMENT ON TABLE public.landing_page_leads IS
  'Leads capturados por el bloque leadForm de una landing publicada. Insert solo desde el endpoint público (service role) con company_id explícito.';
COMMENT ON COLUMN public.landing_page_leads.company_id IS
  'Denormalizado para RLS y filtros .eq(company_id). La FK compuesta impide cruzar tenants.';
COMMENT ON COLUMN public.landing_page_leads.notified_at IS
  'Marca de aviso Resend enviado al dueño del negocio.';

CREATE INDEX IF NOT EXISTS idx_landing_page_leads_company_created_at
  ON public.landing_page_leads (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_landing_page_leads_page_created_at
  ON public.landing_page_leads (landing_page_id, created_at DESC);

-- =========================
-- 3) updated_at
-- =========================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'landing_pages_set_updated_at') THEN
    CREATE TRIGGER landing_pages_set_updated_at
      BEFORE UPDATE ON public.landing_pages
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- =========================
-- 4) RLS por company_id
-- =========================

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

-- El render público no usa sesión anónima: resuelve por slug con service role.
REVOKE ALL ON public.landing_pages FROM anon;
REVOKE ALL ON public.landing_page_leads FROM anon;

DROP POLICY IF EXISTS landing_pages_select ON public.landing_pages;
CREATE POLICY landing_pages_select
  ON public.landing_pages
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.company_id IS NOT NULL
        AND up.is_active IS NOT FALSE
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS landing_pages_write ON public.landing_pages;
CREATE POLICY landing_pages_write
  ON public.landing_pages
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.company_id IS NOT NULL
        AND up.is_active IS NOT FALSE
        AND up.role = 'company_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.company_id IS NOT NULL
        AND up.is_active IS NOT FALSE
        AND up.role = 'company_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS landing_page_leads_select ON public.landing_page_leads;
CREATE POLICY landing_page_leads_select
  ON public.landing_page_leads
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.company_id IS NOT NULL
        AND up.is_active IS NOT FALSE
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS landing_page_leads_delete ON public.landing_page_leads;
CREATE POLICY landing_page_leads_delete
  ON public.landing_page_leads
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.company_id IS NOT NULL
        AND up.is_active IS NOT FALSE
        AND up.role = 'company_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );
