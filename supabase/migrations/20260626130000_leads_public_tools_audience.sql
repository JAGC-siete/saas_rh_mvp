-- Audience segment from calculator role selector (empleado | empresa)
ALTER TABLE public.leads_public_tools
  ADD COLUMN IF NOT EXISTS calc_audience text;

ALTER TABLE public.leads_public_tools
  DROP CONSTRAINT IF EXISTS leads_public_tools_calc_audience_check;

ALTER TABLE public.leads_public_tools
  ADD CONSTRAINT leads_public_tools_calc_audience_check
  CHECK (calc_audience IS NULL OR calc_audience = ANY (ARRAY['empleado'::text, 'empresa'::text]));

CREATE INDEX IF NOT EXISTS leads_public_tools_calc_audience_idx
  ON public.leads_public_tools (calc_audience)
  WHERE calc_audience IS NOT NULL;

COMMENT ON COLUMN public.leads_public_tools.calc_audience IS
  'Rol elegido en calculadora pública: empleado (B2C) o empresa (B2B/RRHH).';
