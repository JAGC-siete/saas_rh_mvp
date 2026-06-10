-- Optional contact fields for TOFU leads (/info, enriched captures)
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.marketing_leads.full_name IS 'Display name from TOFU forms (e.g. /info).';
COMMENT ON COLUMN public.marketing_leads.phone IS 'Optional phone/WhatsApp from TOFU forms (e.g. /info).';
