-- Directorio Mercado Municipal Siguatepeque: vendedores (puestos) por empresa.
-- Público: anon lee solo status='active' y columnas de ficha (sin company_id).
-- Admin: authenticated filtra por company_id; las APIs también hacen .eq('company_id').

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_status') THEN
    CREATE TYPE public.vendor_status AS ENUM (
      'active',
      'inactive'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  whatsapp text NOT NULL,
  status public.vendor_status NOT NULL DEFAULT 'active',
  logo_url text,
  stall_location text,
  hours_note text,
  featured boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendors_name_len CHECK (length(trim(name)) BETWEEN 2 AND 80),
  CONSTRAINT vendors_slug_format CHECK (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 63
  ),
  CONSTRAINT vendors_description_len CHECK (length(trim(description)) BETWEEN 10 AND 500),
  CONSTRAINT vendors_category_allowed CHECK (
    category IN (
      'comida',
      'verduras',
      'frutas',
      'carnes',
      'granos',
      'abarrotes',
      'ropa',
      'calzado',
      'artesanias',
      'servicios',
      'otros'
    )
  ),
  CONSTRAINT vendors_whatsapp_len CHECK (length(trim(whatsapp)) BETWEEN 8 AND 30),
  CONSTRAINT vendors_logo_url_len CHECK (logo_url IS NULL OR length(logo_url) <= 500),
  CONSTRAINT vendors_stall_location_len CHECK (
    stall_location IS NULL OR length(trim(stall_location)) BETWEEN 2 AND 80
  ),
  CONSTRAINT vendors_hours_note_len CHECK (
    hours_note IS NULL OR length(trim(hours_note)) BETWEEN 2 AND 80
  ),
  CONSTRAINT vendors_id_company_uniq UNIQUE (id, company_id)
);

COMMENT ON TABLE public.vendors IS
  'Puestos del Mercado Municipal (Siguatepeque). Tenant = company_id. El directorio público resuelve por slug.';
COMMENT ON COLUMN public.vendors.slug IS
  'Slug SEO global. Ruta pública: /mercado/[slug].';
COMMENT ON COLUMN public.vendors.status IS
  'active: visible en el directorio. inactive: solo admin.';
COMMENT ON COLUMN public.vendors.featured IS
  'Si true, el Home /mercado lo muestra en el grid de destacados.';
COMMENT ON COLUMN public.vendors.whatsapp IS
  'Número de contacto del puesto. El CTA público arma wa.me.';

CREATE UNIQUE INDEX IF NOT EXISTS vendors_slug_uidx
  ON public.vendors (slug);

CREATE UNIQUE INDEX IF NOT EXISTS vendors_company_name_uidx
  ON public.vendors (company_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_vendors_company_updated_at
  ON public.vendors (company_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendors_company_status_category
  ON public.vendors (company_id, status, category);

CREATE INDEX IF NOT EXISTS idx_vendors_public_featured
  ON public.vendors (featured, updated_at DESC)
  WHERE status = 'active';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vendors_set_updated_at') THEN
    CREATE TRIGGER vendors_set_updated_at
      BEFORE UPDATE ON public.vendors
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT USAGE ON TYPE public.vendor_status TO authenticated, anon;

REVOKE ALL ON public.vendors FROM anon;

DROP POLICY IF EXISTS vendors_public_select ON public.vendors;
CREATE POLICY vendors_public_select
  ON public.vendors
  FOR SELECT TO anon
  USING (status = 'active');

GRANT SELECT (
  id,
  name,
  slug,
  description,
  category,
  whatsapp,
  status,
  logo_url,
  stall_location,
  hours_note,
  featured,
  updated_at
) ON public.vendors TO anon;

DROP POLICY IF EXISTS vendors_tenant_select ON public.vendors;
CREATE POLICY vendors_tenant_select
  ON public.vendors
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

DROP POLICY IF EXISTS vendors_tenant_write ON public.vendors;
CREATE POLICY vendors_tenant_write
  ON public.vendors
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.company_id IS NOT NULL
        AND up.is_active IS NOT FALSE
        AND up.role IN ('company_admin', 'admin')
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
        AND up.role IN ('company_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );
