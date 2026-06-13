-- Add draft/published status to recursos articles
ALTER TABLE public.recursos
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.recursos
  DROP CONSTRAINT IF EXISTS recursos_status_check;

ALTER TABLE public.recursos
  ADD CONSTRAINT recursos_status_check CHECK (status IN ('draft', 'published'));

COMMENT ON COLUMN public.recursos.status IS 'draft = hidden from public /recursos; published = visible on site and sitemap.';

CREATE INDEX IF NOT EXISTS idx_recursos_status_published
  ON public.recursos (date_published DESC)
  WHERE status = 'published';
