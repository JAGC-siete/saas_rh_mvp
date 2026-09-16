/**
 * Acceso a landing_pages / landing_leads: nombres de tabla, columnas por capa y conversión
 * de la fila publicada al objeto que consume el renderer.
 *
 * Reglas de lectura:
 * - Dashboard (/app/landings): sesión + RLS por company_id, además de .eq('company_id', companyId).
 * - Público (/p/[slug]): cliente anon sin cookies. RLS solo expone filas publicadas y el GRANT
 *   por columna deja fuera content_json, company_id y lead_notify_email.
 */

import { logger } from '../logger'
import { readLandingPageContent } from './page-schema'
import type {
  LandingLeadRow,
  LandingPagePublicRow,
  LandingPageRow,
  PublicLandingPage,
} from '../../types/landing'

export const LANDING_PAGES_TABLE = 'landing_pages'
export const LANDING_LEADS_TABLE = 'landing_leads'

/** Listado del dashboard: sin JSONB, para no arrastrar el árbol completo. */
export const LANDING_PAGE_LIST_COLUMNS =
  'id, company_id, title, slug, template_type, status, published_at, updated_at' as const

/** Editor del dashboard: incluye el borrador. */
export const LANDING_PAGE_EDIT_COLUMNS =
  'id, company_id, title, slug, template_type, status, schema_version, content_json, lead_notify_email, published_at, updated_at' as const

/** Render público: exactamente las columnas que el rol anon tiene permitido leer. */
export const LANDING_PAGE_PUBLIC_COLUMNS =
  'id, slug, title, template_type, status, schema_version, published_content_json, published_at' as const

export const LANDING_LEAD_LIST_COLUMNS =
  'id, landing_id, company_id, full_name, email, phone, message, source, created_at' as const

/* ------------------------------------------------------------------ *
 * Inventario de columnas
 *
 * Estas listas son la versión en tiempo de ejecución de las interfaces de
 * types/landing.ts. La aserción de tipos de abajo rompe la compilación si una
 * lista y su interfaz se separan; tests/landings-schema-drift.test.ts rompe el
 * CI si se separan de la tabla real.
 * ------------------------------------------------------------------ */

export const LANDING_PAGE_COLUMN_NAMES = [
  'id',
  'company_id',
  'title',
  'slug',
  'template_type',
  'status',
  'schema_version',
  'content_json',
  'published_content_json',
  'lead_notify_email',
  'published_at',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
] as const

export const LANDING_LEAD_COLUMN_NAMES = [
  'id',
  'landing_id',
  'company_id',
  'full_name',
  'email',
  'phone',
  'message',
  'extra',
  'source',
  'notified_at',
  'created_at',
] as const

/** Columnas con GRANT SELECT para el rol anon (ver migración ..._public_read.sql). */
export const LANDING_PAGE_ANON_COLUMN_NAMES = [
  'id',
  'slug',
  'title',
  'template_type',
  'status',
  'schema_version',
  'published_content_json',
  'published_at',
] as const

/** Columnas que el público nunca debe poder leer. Se prueban una por una en el test de drift. */
export const LANDING_PAGE_PRIVATE_COLUMN_NAMES = [
  'company_id',
  'content_json',
  'lead_notify_email',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
] as const

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

const _landingPageColumnsMatchRow: Exact<
  keyof LandingPageRow,
  (typeof LANDING_PAGE_COLUMN_NAMES)[number]
> = true

const _landingLeadColumnsMatchRow: Exact<
  keyof LandingLeadRow,
  (typeof LANDING_LEAD_COLUMN_NAMES)[number]
> = true

const _anonColumnsAreSubsetOfRow: Exact<
  (typeof LANDING_PAGE_ANON_COLUMN_NAMES)[number] | (typeof LANDING_PAGE_PRIVATE_COLUMN_NAMES)[number],
  keyof LandingPageRow
> = true

void _landingPageColumnsMatchRow
void _landingLeadColumnsMatchRow
void _anonColumnsAreSubsetOfRow

/**
 * Convierte la fila publicada en el objeto que consume el LandingRenderer.
 * Tolerante por bloque: un bloque roto o de tipo desconocido se descarta y se registra,
 * en vez de tumbar toda la página. Devuelve null solo si no queda nada renderizable,
 * para que la ruta pública responda 404 en vez de mostrar una página vacía.
 */
export function toPublicLandingPage(row: LandingPagePublicRow): PublicLandingPage | null {
  const read = readLandingPageContent(row.published_content_json)

  if (!read.ok) {
    logger.error('Snapshot de landing no renderizable', {
      landingId: row.id,
      slug: row.slug,
      reason: read.reason,
    })
    return null
  }

  if (read.dropped.length > 0) {
    logger.warn('Bloques descartados al renderizar landing', {
      landingId: row.id,
      slug: row.slug,
      dropped: read.dropped,
    })
  }

  if (read.upgradedFrom !== null) {
    logger.info('Snapshot de landing migrado al renderizar', {
      landingId: row.id,
      slug: row.slug,
      from: read.upgradedFrom,
    })
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    templateType: row.template_type,
    content: read.content,
  }
}
