-- Constructor de landings: acceso exclusivo de super_admin (sin empresa de RRHH).
-- Las páginas de ejemplo cuelgan de una empresa contenedora porque company_id es NOT NULL.

INSERT INTO public.companies (
  id,
  name,
  subdomain,
  plan_type,
  is_active,
  country_code,
  timezone,
  settings
)
SELECT
  'a11d1000-1a0d-4000-8000-000000000001',
  'Humano SISU Landings',
  'landing-studio',
  'basic',
  true,
  'HND',
  'America/Tegucigalpa',
  '{"landing_studio": true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE id = 'a11d1000-1a0d-4000-8000-000000000001'
)
AND NOT EXISTS (
  SELECT 1 FROM public.companies WHERE subdomain = 'landing-studio'
);

COMMENT ON COLUMN public.landing_pages.company_id IS
  'Contenedor para la FK. En el constructor de superadmin las páginas viven en la empresa landing-studio, no en un tenant de RRHH.';

DROP POLICY IF EXISTS landing_pages_select ON public.landing_pages;
CREATE POLICY landing_pages_select
  ON public.landing_pages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  );

DROP POLICY IF EXISTS landing_pages_write ON public.landing_pages;
CREATE POLICY landing_pages_write
  ON public.landing_pages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  );

DROP POLICY IF EXISTS landing_leads_select ON public.landing_leads;
CREATE POLICY landing_leads_select
  ON public.landing_leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  );

DROP POLICY IF EXISTS landing_leads_delete ON public.landing_leads;
CREATE POLICY landing_leads_delete
  ON public.landing_leads
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  );
