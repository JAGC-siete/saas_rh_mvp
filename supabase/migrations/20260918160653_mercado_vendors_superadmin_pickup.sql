-- Mercado San Pablo (Siguatepeque): fichas públicas + SuperAdmin pickup.
-- company_id nullable: el directorio no exige tenant SISU.
-- Aislado al producto mercado: bucket y políticas propias.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_status') THEN
    CREATE TYPE public.vendor_status AS ENUM ('active', 'inactive');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.vendor_applications(id) ON DELETE SET NULL,
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
  products text[] NOT NULL DEFAULT ARRAY[]::text[],
  payment_methods text[] NOT NULL DEFAULT ARRAY['efectivo', 'transferencia_bac']::text[],
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
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
      'comida', 'verduras', 'frutas', 'carnes', 'granos', 'abarrotes',
      'ropa', 'calzado', 'artesanias', 'servicios', 'otros'
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
  CONSTRAINT vendors_products_len CHECK (cardinality(products) <= 5),
  CONSTRAINT vendors_payment_methods_allowed CHECK (
    cardinality(payment_methods) >= 1
    AND payment_methods <@ ARRAY['efectivo', 'transferencia_bac']::text[]
  ),
  CONSTRAINT vendors_gallery_len CHECK (
    jsonb_typeof(gallery) = 'array'
    AND jsonb_array_length(gallery) <= 4
  )
);

-- Si la tabla ya existía con company_id NOT NULL, relajar.
ALTER TABLE public.vendors
  ALTER COLUMN company_id DROP NOT NULL;

COMMENT ON TABLE public.vendors IS
  'Fichas públicas Mercado Municipal San Pablo. SuperAdmin CRUD. company_id opcional.';
COMMENT ON COLUMN public.vendors.company_id IS
  'Opcional. El directorio municipal no crea tenant SISU.';
COMMENT ON COLUMN public.vendors.application_id IS
  'Solicitud de origen cuando la ficha se crea desde inscripción.';
COMMENT ON COLUMN public.vendors.status IS
  'active = visible en directorio. inactive = baja.';
COMMENT ON COLUMN public.vendors.featured IS
  'true = aportación anual al día → destacado en home.';
COMMENT ON COLUMN public.vendors.gallery IS
  'Hasta 4 fotos {src, alt}. Incluye fachada para pickup.';

CREATE UNIQUE INDEX IF NOT EXISTS vendors_slug_uidx ON public.vendors (slug);
CREATE UNIQUE INDEX IF NOT EXISTS vendors_application_id_uidx
  ON public.vendors (application_id)
  WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_status_featured
  ON public.vendors (status, featured DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendors_status_category
  ON public.vendors (status, category);

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
  id, name, slug, description, category, whatsapp, status,
  logo_url, stall_location, hours_note, products, payment_methods,
  gallery, featured, updated_at, created_at
) ON public.vendors TO anon;

DROP POLICY IF EXISTS vendors_super_admin_all ON public.vendors;
CREATE POLICY vendors_super_admin_all
  ON public.vendors
  FOR ALL TO authenticated
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

-- Solicitudes: approved = ficha creada; reviewed = en proceso.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'vendor_application_status'
      AND e.enumlabel = 'approved'
  ) THEN
    ALTER TYPE public.vendor_application_status ADD VALUE 'approved';
  END IF;
END$$;

COMMENT ON COLUMN public.vendor_applications.status IS
  'received = nueva; reviewed = en proceso; approved = ficha creada; rejected = descartada.';

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vendor_applications_vendor_id_uidx
  ON public.vendor_applications (vendor_id)
  WHERE vendor_id IS NOT NULL;

-- Storage exclusivo del directorio municipal (público de lectura).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mercado-san-pablo',
  'mercado-san-pablo',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS mercado_san_pablo_public_read ON storage.objects;
CREATE POLICY mercado_san_pablo_public_read
  ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'mercado-san-pablo');

DROP POLICY IF EXISTS mercado_san_pablo_super_admin_write ON storage.objects;
CREATE POLICY mercado_san_pablo_super_admin_write
  ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'mercado-san-pablo'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    bucket_id = 'mercado-san-pablo'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );
