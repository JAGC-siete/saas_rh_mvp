-- Solicitudes públicas de inscripción al directorio Mercado San Pablo.
-- No crea filas en vendors: el alta de ficha sigue siendo manual en /app/admin/vendors.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_application_status') THEN
    CREATE TYPE public.vendor_application_status AS ENUM (
      'received',
      'reviewed',
      'rejected'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.vendor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stall_number text NOT NULL,
  merchant_name text NOT NULL,
  business_name text NOT NULL,
  status public.vendor_application_status NOT NULL DEFAULT 'received',
  source text NOT NULL DEFAULT 'mercado-public',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendor_applications_stall_number_len CHECK (
    length(trim(stall_number)) BETWEEN 1 AND 40
  ),
  CONSTRAINT vendor_applications_merchant_name_len CHECK (
    length(trim(merchant_name)) BETWEEN 2 AND 80
  ),
  CONSTRAINT vendor_applications_business_name_len CHECK (
    length(trim(business_name)) BETWEEN 2 AND 80
  ),
  CONSTRAINT vendor_applications_source_len CHECK (
    length(trim(source)) BETWEEN 3 AND 40
  )
);

COMMENT ON TABLE public.vendor_applications IS
  'Solicitudes de inscripción al directorio /mercado. Insert solo desde el endpoint público (service role). No publica fichas.';
COMMENT ON COLUMN public.vendor_applications.status IS
  'received = recibida, pendiente de revisión manual. reviewed/rejected = operación posterior. Nunca crea vendor.';
COMMENT ON COLUMN public.vendor_applications.stall_number IS
  'Número o ubicación del local que declara el comerciante.';
COMMENT ON COLUMN public.vendor_applications.notified_at IS
  'Marca de aviso Resend enviado al operador.';

CREATE INDEX IF NOT EXISTS idx_vendor_applications_status_created_at
  ON public.vendor_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_applications_created_at
  ON public.vendor_applications (created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vendor_applications_set_updated_at') THEN
    CREATE TRIGGER vendor_applications_set_updated_at
      BEFORE UPDATE ON public.vendor_applications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.vendor_applications FROM anon;
GRANT SELECT, UPDATE ON public.vendor_applications TO authenticated;
GRANT USAGE ON TYPE public.vendor_application_status TO authenticated;

DROP POLICY IF EXISTS vendor_applications_super_admin_select ON public.vendor_applications;
CREATE POLICY vendor_applications_super_admin_select
  ON public.vendor_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS vendor_applications_super_admin_update ON public.vendor_applications;
CREATE POLICY vendor_applications_super_admin_update
  ON public.vendor_applications
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
