-- Puente /webycitas → landing_pages: preview público no reclamado.
-- Misma tabla que /p/[slug]. Insert solo desde el endpoint público (service role).
-- Nuevas columnas fuera del GRANT anon.

ALTER TYPE public.landing_page_template ADD VALUE IF NOT EXISTS 'ferreteria';
ALTER TYPE public.landing_page_template ADD VALUE IF NOT EXISTS 'mercadito';
ALTER TYPE public.landing_page_template ADD VALUE IF NOT EXISTS 'supermercado';
ALTER TYPE public.landing_page_template ADD VALUE IF NOT EXISTS 'clinica';

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS is_lead_preview boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webycitas_lead_id uuid;

COMMENT ON COLUMN public.landing_pages.is_lead_preview IS
  'true = maqueta generada desde /webycitas, aún no reclamada como sitio de pago. El render público sigue siendo status=published.';
COMMENT ON COLUMN public.landing_pages.webycitas_lead_id IS
  'Lead origen. NULL en landings armadas a mano en /app/landings.';

CREATE UNIQUE INDEX IF NOT EXISTS landing_pages_webycitas_lead_id_uidx
  ON public.landing_pages (webycitas_lead_id)
  WHERE webycitas_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landing_pages_lead_preview
  ON public.landing_pages (created_at DESC)
  WHERE is_lead_preview = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_webycitas_lead_fk'
  ) THEN
    ALTER TABLE public.landing_pages
      ADD CONSTRAINT landing_pages_webycitas_lead_fk
      FOREIGN KEY (webycitas_lead_id)
      REFERENCES public.webycitas_leads(id)
      ON DELETE SET NULL;
  END IF;
END$$;

ALTER TABLE public.webycitas_leads
  ADD COLUMN IF NOT EXISTS preview_slug text,
  ADD COLUMN IF NOT EXISTS landing_id uuid;

COMMENT ON COLUMN public.webycitas_leads.preview_slug IS
  'Slug público /p/{slug} de la maqueta. NULL si el insert en landing_pages falló.';
COMMENT ON COLUMN public.webycitas_leads.landing_id IS
  'landing_pages.id de la maqueta. NULL si no se publicó preview.';
COMMENT ON TABLE public.webycitas_leads IS
  'Solicitudes de /webycitas. Insert desde el endpoint público (service role). Puede crear una landing_pages is_lead_preview; no crea tenant de planilla.';

CREATE UNIQUE INDEX IF NOT EXISTS webycitas_leads_preview_slug_uidx
  ON public.webycitas_leads (preview_slug)
  WHERE preview_slug IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'webycitas_leads_landing_fk'
  ) THEN
    ALTER TABLE public.webycitas_leads
      ADD CONSTRAINT webycitas_leads_landing_fk
      FOREIGN KEY (landing_id)
      REFERENCES public.landing_pages(id)
      ON DELETE SET NULL;
  END IF;
END$$;

ALTER TABLE public.webycitas_leads
  DROP CONSTRAINT IF EXISTS webycitas_leads_preview_slug_format;
ALTER TABLE public.webycitas_leads
  ADD CONSTRAINT webycitas_leads_preview_slug_format
  CHECK (
    preview_slug IS NULL
    OR (
      preview_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      AND length(preview_slug) BETWEEN 3 AND 63
    )
  );

ALTER TABLE public.webycitas_leads
  DROP CONSTRAINT IF EXISTS webycitas_leads_rubro_check;
ALTER TABLE public.webycitas_leads
  ADD CONSTRAINT webycitas_leads_rubro_check
  CHECK (
    rubro = ANY (ARRAY[
      'barberia'::text,
      'ferreteria'::text,
      'cafeteria'::text,
      'mercadito'::text,
      'escuela'::text,
      'otro'::text,
      'papeleria'::text,
      'supermercado'::text,
      'spa'::text,
      'clinica'::text,
      'salon'::text
    ])
  );
