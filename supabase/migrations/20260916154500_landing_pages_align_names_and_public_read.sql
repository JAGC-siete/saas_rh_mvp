-- Alinea nombres con el plan del módulo (title, content_json, template_type, landing_leads)
-- y abre la lectura pública por RLS en vez de service role.
--
-- Lectura pública: el rol anon solo ve filas publicadas y solo las columnas necesarias.
-- El borrador (content_json) y el destino de avisos (lead_notify_email) quedan fuera del GRANT,
-- porque RLS filtra filas pero no columnas.
-- Tablas sin datos al momento de este cambio: los renombres no mueven filas.

-- =========================
-- 1) landing_pages: renombres
-- =========================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landing_pages' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.landing_pages RENAME COLUMN name TO title;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landing_pages' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.landing_pages RENAME COLUMN content TO content_json;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landing_pages' AND column_name = 'published_content'
  ) THEN
    ALTER TABLE public.landing_pages RENAME COLUMN published_content TO published_content_json;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landing_pages' AND column_name = 'template_key'
  ) THEN
    ALTER TABLE public.landing_pages RENAME COLUMN template_key TO template_type;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_name_len') THEN
    ALTER TABLE public.landing_pages RENAME CONSTRAINT landing_pages_name_len TO landing_pages_title_len;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_content_object') THEN
    ALTER TABLE public.landing_pages
      RENAME CONSTRAINT landing_pages_content_object TO landing_pages_content_json_object;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_published_content_object') THEN
    ALTER TABLE public.landing_pages
      RENAME CONSTRAINT landing_pages_published_content_object TO landing_pages_published_content_json_object;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'landing_pages_company_name_uidx' AND relkind = 'i') THEN
    ALTER INDEX public.landing_pages_company_name_uidx RENAME TO landing_pages_company_title_uidx;
  END IF;
END$$;

COMMENT ON COLUMN public.landing_pages.content_json IS
  'Borrador editable. Contrato validado con Zod en lib/landings/page-schema.ts.';
COMMENT ON COLUMN public.landing_pages.published_content_json IS
  'Snapshot publicado que sirve la ruta pública /p/[slug]. NULL mientras la página nunca se publicó.';

-- =========================
-- 2) landing_page_leads -> landing_leads
-- =========================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'landing_page_leads'
  ) THEN
    ALTER TABLE public.landing_page_leads RENAME TO landing_leads;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landing_leads' AND column_name = 'landing_page_id'
  ) THEN
    ALTER TABLE public.landing_leads RENAME COLUMN landing_page_id TO landing_id;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_page_leads_page_company_fk') THEN
    ALTER TABLE public.landing_leads
      RENAME CONSTRAINT landing_page_leads_page_company_fk TO landing_leads_page_company_fk;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_page_leads_full_name_len') THEN
    ALTER TABLE public.landing_leads
      RENAME CONSTRAINT landing_page_leads_full_name_len TO landing_leads_full_name_len;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_page_leads_message_len') THEN
    ALTER TABLE public.landing_leads
      RENAME CONSTRAINT landing_page_leads_message_len TO landing_leads_message_len;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_page_leads_extra_object') THEN
    ALTER TABLE public.landing_leads
      RENAME CONSTRAINT landing_page_leads_extra_object TO landing_leads_extra_object;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_page_leads_contact_present') THEN
    ALTER TABLE public.landing_leads
      RENAME CONSTRAINT landing_page_leads_contact_present TO landing_leads_contact_present;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'landing_page_leads_pkey' AND relkind = 'i') THEN
    ALTER INDEX public.landing_page_leads_pkey RENAME TO landing_leads_pkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_landing_page_leads_company_created_at' AND relkind = 'i') THEN
    ALTER INDEX public.idx_landing_page_leads_company_created_at
      RENAME TO idx_landing_leads_company_created_at;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_landing_page_leads_page_created_at' AND relkind = 'i') THEN
    ALTER INDEX public.idx_landing_page_leads_page_created_at
      RENAME TO idx_landing_leads_landing_created_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'landing_leads' AND policyname = 'landing_page_leads_select'
  ) THEN
    ALTER POLICY landing_page_leads_select ON public.landing_leads RENAME TO landing_leads_select;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'landing_leads' AND policyname = 'landing_page_leads_delete'
  ) THEN
    ALTER POLICY landing_page_leads_delete ON public.landing_leads RENAME TO landing_leads_delete;
  END IF;
END$$;

COMMENT ON TABLE public.landing_leads IS
  'Leads capturados por el bloque leadForm de una landing publicada. Insert solo desde /api/landings/lead con company_id resuelto en servidor.';
COMMENT ON COLUMN public.landing_leads.company_id IS
  'Denormalizado para RLS y filtros .eq(company_id). La FK compuesta impide cruzar tenants.';

-- =========================
-- 3) Lectura pública por RLS (sin service role)
-- =========================

DROP POLICY IF EXISTS landing_pages_public_select ON public.landing_pages;
CREATE POLICY landing_pages_public_select
  ON public.landing_pages
  FOR SELECT TO anon
  USING (status = 'published' AND published_content_json IS NOT NULL);

-- Privilegio a nivel de columna: el borrador y el correo de avisos no salen nunca.
REVOKE ALL ON public.landing_pages FROM anon;
GRANT SELECT (
  id,
  slug,
  title,
  template_type,
  status,
  schema_version,
  published_content_json,
  published_at
) ON public.landing_pages TO anon;

-- Los leads siguen cerrados para anon: se escriben desde el endpoint con service role.
REVOKE ALL ON public.landing_leads FROM anon;
