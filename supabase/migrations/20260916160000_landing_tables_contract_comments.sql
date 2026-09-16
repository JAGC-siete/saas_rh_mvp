-- Documenta en la propia base el contrato que el código espera.
-- Quien haga ALTER TABLE ve estos comentarios en Supabase Studio y en \d+,
-- así sabe qué archivos de TypeScript hay que actualizar en el mismo cambio.

COMMENT ON TABLE public.landing_pages IS
  'Landing pages del constructor SaaS. El diseño vive en JSONB (nunca HTML crudo). '
  'CONTRATO ACOPLADO — al alterar esta tabla actualizar también: types/landing.ts (interfaces de fila), '
  'lib/landings/db.ts (listas de columnas por capa) y lib/landings/page-schema.ts (contrato Zod del JSON). '
  'Si se agregan columnas legibles por el público, extender el GRANT por columna al rol anon.';

COMMENT ON TABLE public.landing_leads IS
  'Leads capturados por el bloque leadForm de una landing publicada. Insert solo desde /api/landings/lead '
  'con company_id resuelto en servidor (service role); el rol anon no tiene INSERT ni SELECT. '
  'CONTRATO ACOPLADO — al alterar esta tabla actualizar types/landing.ts y lib/landings/db.ts.';

COMMENT ON COLUMN public.landing_pages.slug IS
  'Namespace GLOBAL: la URL pública es /p/<slug> y no incluye la empresa. '
  'Único en toda la tabla (landing_pages_slug_uidx), no por company_id.';

COMMENT ON COLUMN public.landing_pages.status IS
  'draft: solo visible en el dashboard. published: el rol anon puede leer published_content_json. '
  'archived: fuera de circulación sin borrar. Publicar = validar content_json con Zod, copiarlo a '
  'published_content_json y sellar published_at en la misma sentencia.';

COMMENT ON COLUMN public.landing_pages.template_type IS
  'Enum cerrado. Las 4 plantillas base y su JSON inicial viven en lib/landings/templates.ts.';
