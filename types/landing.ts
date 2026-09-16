/**
 * Tipos del módulo de landing pages: filas de Supabase + contrato del content_json.
 * Las reglas de validación viven en lib/landings/page-schema.ts (Zod); aquí solo se re-exportan
 * los tipos que ese contrato infiere, para que no existan dos definiciones que se desincronicen.
 */

import type {
  LandingBlock,
  LandingBlockKind,
  LandingCta,
  LandingCtaAction,
  LandingPageBusiness,
  LandingPageContent,
  LandingPageContentInput,
  LandingPageMeta,
  LandingPageStatus,
  LandingPageTheme,
  LandingTemplateKey,
} from '../lib/landings/page-schema'

export type {
  LandingBlock,
  LandingBlockKind,
  LandingCta,
  LandingCtaAction,
  LandingPageBusiness,
  LandingPageContent,
  /** Lo que acepta el editor antes de aplicar los defaults del esquema. */
  LandingPageContentInput,
  LandingPageMeta,
  LandingPageStatus,
  LandingPageTheme,
  LandingTemplateKey,
}

/** Fila de public.landing_pages. El JSONB entra como unknown: se usa solo tras pasar por Zod. */
export interface LandingPageRow {
  id: string
  company_id: string
  title: string
  slug: string
  template_type: LandingTemplateKey
  status: LandingPageStatus
  schema_version: number
  content_json: unknown
  published_content_json: unknown | null
  lead_notify_email: string | null
  published_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type LandingPageInsert = Pick<
  LandingPageRow,
  'company_id' | 'title' | 'slug' | 'template_type'
> &
  Partial<
    Pick<
      LandingPageRow,
      'status' | 'schema_version' | 'content_json' | 'lead_notify_email' | 'created_by' | 'updated_by'
    >
  >

export type LandingPageUpdate = Partial<
  Pick<
    LandingPageRow,
    | 'title'
    | 'slug'
    | 'status'
    | 'content_json'
    | 'published_content_json'
    | 'lead_notify_email'
    | 'published_at'
    | 'updated_by'
  >
>

/** Fila del listado del dashboard: sin JSONB. */
export type LandingPageListItem = Pick<
  LandingPageRow,
  'id' | 'company_id' | 'title' | 'slug' | 'template_type' | 'status' | 'published_at' | 'updated_at'
>

/** Fila que el rol anon puede leer de una página publicada (GRANT por columna). */
export type LandingPagePublicRow = Pick<
  LandingPageRow,
  'id' | 'slug' | 'title' | 'template_type' | 'status' | 'schema_version' | 'published_content_json' | 'published_at'
>

/** Fila de public.landing_leads. */
export interface LandingLeadRow {
  id: string
  landing_id: string
  company_id: string
  full_name: string
  email: string | null
  phone: string | null
  message: string | null
  extra: unknown
  source: string
  notified_at: string | null
  created_at: string
}

export type LandingLeadInsert = Pick<LandingLeadRow, 'landing_id' | 'company_id' | 'full_name'> &
  Partial<Pick<LandingLeadRow, 'email' | 'phone' | 'message' | 'extra' | 'source' | 'notified_at'>>

/** Fila de la bandeja: sin extra/notified_at. */
export type LandingLeadListItem = Pick<
  LandingLeadRow,
  'id' | 'landing_id' | 'company_id' | 'full_name' | 'email' | 'phone' | 'message' | 'source' | 'created_at'
>

export interface LandingLeadsResponse {
  landing: { id: string; title: string; slug: string }
  leads: LandingLeadListItem[]
}

/** Página publicada ya validada, lista para el LandingRenderer. */
export interface PublicLandingPage {
  id: string
  slug: string
  title: string
  templateType: LandingTemplateKey
  content: LandingPageContent
}
