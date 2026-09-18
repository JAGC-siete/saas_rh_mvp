/**
 * Persistencia de la maqueta /webycitas en landing_pages. Solo servidor.
 */

import { randomBytes } from 'crypto'
import { LANDING_PAGES_TABLE } from '../landings/db'
import { logger } from '../logger'
import { landingSlugSchema, RESERVED_LANDING_SLUGS, slugifyBusinessName } from '../landings/page-schema'
import { landingPublicPath } from '../landings/paths'
import { WEBYCITAS_LEADS_TABLE, type DemoLocalLead } from './demo-local'
import { buildWebycitasPreviewContent, templateKeyForRubro } from './webycitas-preview'

const UNIQUE_VIOLATION = '23505'
const SLUG_RETRIES = 6

export function previewSuffix(): string {
  return randomBytes(2).toString('hex')
}

export function allocatePreviewSlug(businessName: string, suffix: string): string {
  const raw = slugifyBusinessName(businessName)
  const base = raw.length >= 3 ? raw : 'negocio'
  const room = 63 - suffix.length - 1
  const trimmed = (base.slice(0, Math.max(3, room)).replace(/-+$/g, '') || 'negocio').slice(0, Math.max(3, room))
  const slug = `${trimmed}-${suffix}`
  const parsed = landingSlugSchema.safeParse(slug)
  if (parsed.success) return parsed.data
  if (RESERVED_LANDING_SLUGS.includes(slug)) return `negocio-${suffix}`
  return `negocio-${suffix}`
}

type PublishClient = ReturnType<typeof import('../supabase/server').createAdminClient>

export async function publishWebycitasPreview(params: {
  adminClient: PublishClient
  companyId: string
  leadId: string
  lead: DemoLocalLead
}): Promise<{ slug: string; publicPath: string } | null> {
  const content = buildWebycitasPreviewContent({
    rubro: params.lead.rubro,
    businessName: params.lead.businessName,
    city: params.lead.city,
    phone: params.lead.phone,
    email: params.lead.email,
  })
  const templateType = templateKeyForRubro(params.lead.rubro)
  const now = new Date().toISOString()

  for (let attempt = 0; attempt < SLUG_RETRIES; attempt += 1) {
    const suffix = previewSuffix()
    const slug = allocatePreviewSlug(params.lead.businessName, suffix)
    const titleBase = params.lead.businessName.trim()
    const title = (attempt === 0 ? titleBase : `${titleBase} · ${suffix}`).slice(0, 120)

    const { data, error } = await params.adminClient
      .from(LANDING_PAGES_TABLE)
      .insert({
        company_id: params.companyId,
        title,
        slug,
        template_type: templateType,
        status: 'published',
        schema_version: content.version,
        content_json: content,
        published_content_json: content,
        published_at: now,
        lead_notify_email: params.lead.email,
        is_lead_preview: true,
        webycitas_lead_id: params.leadId,
      })
      .select('id, slug')
      .single()

    if (error) {
      if (error.code === UNIQUE_VIOLATION) continue
      logger.error('No se pudo publicar maqueta webycitas', { error: error.message })
      return null
    }

    const row = data as { id: string; slug: string } | null
    if (!row) return null

    const { error: linkError } = await params.adminClient
      .from(WEBYCITAS_LEADS_TABLE)
      .update({ preview_slug: row.slug, landing_id: row.id })
      .eq('id', params.leadId)

    if (linkError) {
      return { slug: row.slug, publicPath: landingPublicPath(row.slug) }
    }

    return { slug: row.slug, publicPath: landingPublicPath(row.slug) }
  }

  return null
}
