/**
 * Empresa contenedora de las landings de ejemplo.
 *
 * landing_pages.company_id es NOT NULL (FK a companies). El constructor es una
 * herramienta de superadmin para visitas a clientes, no un módulo por tenant de
 * RRHH, así que las páginas viven aquí y no en la empresa de sesión (que puede
 * ser null).
 */

export const LANDING_STUDIO_COMPANY_ID = 'a11d1000-1a0d-4000-8000-000000000001'
export const LANDING_STUDIO_SUBDOMAIN = 'landing-studio'

const STUDIO_INSERT = {
  id: LANDING_STUDIO_COMPANY_ID,
  name: 'Humano SISU Landings',
  subdomain: LANDING_STUDIO_SUBDOMAIN,
  plan_type: 'basic',
  is_active: true,
  country_code: 'HND',
  timezone: 'America/Tegucigalpa',
  settings: { landing_studio: true },
}

type QueryResult = { data: { id: string } | null; error: { message: string } | null }

type AdminLike = {
  from: (table: string) => {
    select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<QueryResult> } }
    insert: (row: Record<string, unknown>) => { select: (columns: string) => { single: () => Promise<QueryResult> } }
  }
}

export async function ensureLandingStudioCompanyId(adminClient: AdminLike): Promise<string> {
  const byId = await adminClient.from('companies').select('id').eq('id', LANDING_STUDIO_COMPANY_ID).maybeSingle()
  if (byId.data?.id) return byId.data.id

  const inserted = await adminClient.from('companies').insert({ ...STUDIO_INSERT }).select('id').single()
  if (inserted.data?.id) return inserted.data.id

  const bySubdomain = await adminClient
    .from('companies')
    .select('id')
    .eq('subdomain', LANDING_STUDIO_SUBDOMAIN)
    .maybeSingle()
  if (bySubdomain.data?.id) return bySubdomain.data.id

  throw new Error(inserted.error?.message || byId.error?.message || 'No se pudo preparar el contenedor de landings')
}
