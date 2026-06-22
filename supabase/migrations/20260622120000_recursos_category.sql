-- Add collection category to recursos (rrhh | responsabilidad-individual)
ALTER TABLE public.recursos
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'rrhh';

ALTER TABLE public.recursos
  DROP CONSTRAINT IF EXISTS recursos_category_check;

ALTER TABLE public.recursos
  ADD CONSTRAINT recursos_category_check
  CHECK (category IN ('rrhh', 'responsabilidad-individual'));

COMMENT ON COLUMN public.recursos.category IS 'Collection: rrhh (payroll/HR) or responsabilidad-individual (leadership essays).';

CREATE INDEX IF NOT EXISTS idx_recursos_category_date
  ON public.recursos (category, date_published DESC)
  WHERE status = 'published';

UPDATE public.recursos
SET category = 'responsabilidad-individual'
WHERE slug = 'arquitecto-de-si-mismo-manifiesto-responsabilidad-individual';

UPDATE public.recursos
SET category = 'rrhh'
WHERE slug <> 'arquitecto-de-si-mismo-manifiesto-responsabilidad-individual';

DELETE FROM public.recursos WHERE slug = 'como-mejorar-seo';
