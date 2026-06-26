-- Allow aguinaldo and catorceavo calculator lead sources
ALTER TABLE public.leads_public_tools
  DROP CONSTRAINT IF EXISTS leads_public_tools_source_check;

ALTER TABLE public.leads_public_tools
  ADD CONSTRAINT leads_public_tools_source_check
  CHECK (source = ANY (ARRAY[
    'deducciones'::text,
    'prestaciones'::text,
    'aguinaldo'::text,
    'catorceavo'::text
  ]));
