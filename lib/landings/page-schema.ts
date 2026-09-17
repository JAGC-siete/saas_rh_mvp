/**
 * Contrato del JSON que se guarda en landing_pages.content_json / published_content_json.
 * El motor de render interpreta este árbol de bloques; nunca se persiste HTML crudo.
 */

import { z } from 'zod'

export const LANDING_SCHEMA_VERSION = 1

export const LANDING_TEMPLATE_KEYS = ['papeleria', 'barberia', 'salon_belleza', 'comercial'] as const
export type LandingTemplateKey = (typeof LANDING_TEMPLATE_KEYS)[number]

export const LANDING_PAGE_STATUSES = ['draft', 'published', 'archived'] as const
export type LandingPageStatus = (typeof LANDING_PAGE_STATUSES)[number]

export const LANDING_BLOCK_KINDS = [
  'hero',
  'items',
  'gallery',
  'text',
  'hours',
  'testimonials',
  'faq',
  'leadForm',
  'contact',
  'cta',
] as const
export type LandingBlockKind = (typeof LANDING_BLOCK_KINDS)[number]

export const LANDING_CTA_ACTIONS = ['lead-form', 'whatsapp', 'call', 'maps', 'link'] as const
export type LandingCtaAction = (typeof LANDING_CTA_ACTIONS)[number]

export const MAX_BLOCKS_PER_PAGE = 24
export const MAX_ITEMS_PER_BLOCK = 24

/** Slugs que el shell de marketing/SEO ya usa o reserva para rutas propias. */
export const RESERVED_LANDING_SLUGS: readonly string[] = [
  'admin',
  'api',
  'app',
  'auth',
  'blog',
  'contacto',
  'demo',
  'demo-local',
  'webycitas',
  'health',
  'landing',
  'legal',
  'login',
  'mercado',
  'mercadosanpablosigua',
  'new',
  'precios',
  'privacidad',
  'public',
  'recursos',
  'sitemap',
  'terminos',
  'tools',
]

const shortText = (max: number) => z.string().trim().min(1).max(max)

/** Acepta URL https absoluta o ruta interna (/img/foo.webp). Bloquea javascript:, data:, http. */
export const landingUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      (value.startsWith('/') && !value.startsWith('//')) ||
      (value.startsWith('https://') && z.string().url().safeParse(value).success),
    { message: 'Usa una URL https o una ruta interna que empiece con /.' }
  )

export const landingHexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Usa un color hex de 6 dígitos (#1f2937).')

export const landingSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'El slug necesita al menos 3 caracteres.')
  .max(63, 'El slug no puede pasar de 63 caracteres.')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones simples.')
  .refine((value) => !RESERVED_LANDING_SLUGS.includes(value), {
    message: 'Ese slug está reservado por el sitio. Elige otro.',
  })

export const landingEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), { message: 'Correo no válido.' })

export const landingPhoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(30)
  .refine((value) => (value.match(/\d/g) || []).length >= 7, {
    message: 'Incluye un número real de teléfono o WhatsApp.',
  })

export const landingCtaSchema = z
  .object({
    label: shortText(40),
    action: z.enum(LANDING_CTA_ACTIONS),
    href: landingUrlSchema.optional(),
  })
  .refine((cta) => cta.action !== 'link' || Boolean(cta.href), {
    message: 'Un CTA de tipo link necesita href.',
    path: ['href'],
  })

const blockBase = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'El id del bloque usa minúsculas y guiones.'),
  visible: z.boolean().default(true),
})

export const heroBlockSchema = blockBase.extend({
  kind: z.literal('hero'),
  badge: z.string().trim().max(60).optional(),
  headline: shortText(120),
  subheadline: z.string().trim().max(320).optional(),
  imageUrl: landingUrlSchema.optional(),
  primaryCta: landingCtaSchema,
  secondaryCta: landingCtaSchema.optional(),
})

export const itemsBlockSchema = blockBase.extend({
  kind: z.literal('items'),
  title: shortText(90),
  subtitle: z.string().trim().max(240).optional(),
  layout: z.enum(['list', 'grid']).default('grid'),
  items: z
    .array(
      z.object({
        name: shortText(80),
        detail: z.string().trim().max(160).optional(),
        /** Etiqueta libre ("L. 150", "Desde L. 1,250", "A convenir"): el dueño escribe su realidad. */
        priceLabel: z.string().trim().max(40).optional(),
        imageUrl: landingUrlSchema.optional(),
      })
    )
    .min(1)
    .max(MAX_ITEMS_PER_BLOCK),
})

export const galleryBlockSchema = blockBase.extend({
  kind: z.literal('gallery'),
  title: z.string().trim().max(90).optional(),
  images: z
    .array(z.object({ url: landingUrlSchema, alt: shortText(120) }))
    .min(1)
    .max(12),
})

export const textBlockSchema = blockBase.extend({
  kind: z.literal('text'),
  title: z.string().trim().max(90).optional(),
  body: shortText(1200),
})

export const hoursBlockSchema = blockBase.extend({
  kind: z.literal('hours'),
  title: shortText(90),
  rows: z
    .array(z.object({ label: shortText(40), value: shortText(60) }))
    .min(1)
    .max(8),
  note: z.string().trim().max(160).optional(),
})

export const testimonialsBlockSchema = blockBase.extend({
  kind: z.literal('testimonials'),
  title: shortText(90),
  items: z
    .array(
      z.object({
        author: shortText(60),
        role: z.string().trim().max(60).optional(),
        quote: shortText(320),
      })
    )
    .min(1)
    .max(9),
})

export const faqBlockSchema = blockBase.extend({
  kind: z.literal('faq'),
  title: shortText(90),
  items: z
    .array(z.object({ question: shortText(140), answer: shortText(600) }))
    .min(1)
    .max(12),
})

export const leadFormBlockSchema = blockBase.extend({
  kind: z.literal('leadForm'),
  title: shortText(90),
  subtitle: z.string().trim().max(240).optional(),
  submitLabel: shortText(40),
  consentText: shortText(320),
  fields: z
    .object({
      phone: z.boolean().default(true),
      message: z.boolean().default(true),
    })
    .default({ phone: true, message: true }),
  successTitle: shortText(90),
  successBody: shortText(320),
})

export const contactBlockSchema = blockBase.extend({
  kind: z.literal('contact'),
  title: shortText(90),
  note: z.string().trim().max(240).optional(),
  showWhatsapp: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  showAddress: z.boolean().default(true),
  showMap: z.boolean().default(true),
})

export const ctaBlockSchema = blockBase.extend({
  kind: z.literal('cta'),
  headline: shortText(120),
  subheadline: z.string().trim().max(240).optional(),
  primaryCta: landingCtaSchema,
})

export const landingBlockSchema = z.discriminatedUnion('kind', [
  heroBlockSchema,
  itemsBlockSchema,
  galleryBlockSchema,
  textBlockSchema,
  hoursBlockSchema,
  testimonialsBlockSchema,
  faqBlockSchema,
  leadFormBlockSchema,
  contactBlockSchema,
  ctaBlockSchema,
])

export const landingMetaSchema = z.object({
  seoTitle: shortText(70),
  seoDescription: shortText(180),
  keywords: z.string().trim().max(240).optional(),
  ogImageUrl: landingUrlSchema.optional(),
  noindex: z.boolean().default(false),
})

export const landingThemeSchema = z.object({
  tone: z.enum(['light', 'dark']).default('light'),
  primary: landingHexColorSchema,
  accent: landingHexColorSchema,
  surface: landingHexColorSchema,
  font: z.enum(['sans', 'serif']).default('sans'),
  radius: z.enum(['sm', 'md', 'lg']).default('lg'),
})

export const landingBusinessSchema = z.object({
  name: shortText(120),
  tagline: z.string().trim().max(160).optional(),
  whatsapp: landingPhoneSchema.optional(),
  phone: landingPhoneSchema.optional(),
  email: landingEmailSchema.optional(),
  address: z.string().trim().max(180).optional(),
  city: z.string().trim().max(80).optional(),
  mapsQuery: z.string().trim().max(160).optional(),
  socials: z
    .object({
      instagram: landingUrlSchema.optional(),
      facebook: landingUrlSchema.optional(),
      tiktok: landingUrlSchema.optional(),
    })
    .default({}),
})

/** Todo lo que no son bloques. Se valida aparte para poder descartar bloques sueltos. */
export const landingEnvelopeSchema = z.object({
  version: z.literal(LANDING_SCHEMA_VERSION),
  meta: landingMetaSchema,
  theme: landingThemeSchema,
  business: landingBusinessSchema,
})

export const landingPageContentSchema = z
  .object({
    version: z.literal(LANDING_SCHEMA_VERSION),
    meta: landingMetaSchema,
    theme: landingThemeSchema,
    business: landingBusinessSchema,
    blocks: z.array(landingBlockSchema).min(1).max(MAX_BLOCKS_PER_PAGE),
  })
  .superRefine((content, ctx) => {
    const seen = new Set<string>()
    content.blocks.forEach((block, index) => {
      if (seen.has(block.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `El id de bloque "${block.id}" está duplicado.`,
          path: ['blocks', index, 'id'],
        })
      }
      seen.add(block.id)
    })
  })

export type LandingCta = z.output<typeof landingCtaSchema>
export type LandingBlock = z.output<typeof landingBlockSchema>
export type LandingPageMeta = z.output<typeof landingMetaSchema>
export type LandingPageTheme = z.output<typeof landingThemeSchema>
export type LandingPageBusiness = z.output<typeof landingBusinessSchema>
export type LandingPageContent = z.output<typeof landingPageContentSchema>
export type LandingPageContentInput = z.input<typeof landingPageContentSchema>

/**
 * Validación estricta: se usa al guardar y al publicar.
 * Publicar nunca debe aceptar un JSON del que se pierdan bloques en silencio.
 */
export function parseLandingPageContent(raw: unknown) {
  return landingPageContentSchema.safeParse(raw)
}

/* ------------------------------------------------------------------ *
 * Versionado del JSON
 * ------------------------------------------------------------------ */

/**
 * Migradores acumulativos: la clave es la versión de origen.
 * Al crear la v2, agregar aquí `1: (raw) => ...` y subir LANDING_SCHEMA_VERSION.
 * Cada función recibe un JSON de la versión `clave` y devuelve uno de `clave + 1`.
 */
// eslint-disable-next-line no-unused-vars -- falso positivo: es un parámetro en posición de tipo
type LandingContentUpgrade = (content: Record<string, unknown>) => Record<string, unknown>

const LANDING_CONTENT_UPGRADES: Record<number, LandingContentUpgrade> = {}

export type LandingUpgradeResult =
  | { ok: true; value: unknown; upgradedFrom: number | null }
  | { ok: false; reason: string }

/**
 * Lleva un snapshot guardado a la versión que entiende el código actual.
 * Un JSON más nuevo que el código se rechaza en vez de interpretarse a medias.
 */
export function upgradeLandingContent(raw: unknown): LandingUpgradeResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'El contenido no es un objeto JSON.' }
  }

  const source = raw as Record<string, unknown>
  const version = source.version

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'El contenido no declara una versión válida.' }
  }

  if (version > LANDING_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `Contenido en versión ${version}; este código entiende hasta la ${LANDING_SCHEMA_VERSION}.`,
    }
  }

  if (version === LANDING_SCHEMA_VERSION) {
    return { ok: true, value: source, upgradedFrom: null }
  }

  let current = source
  for (let from = version; from < LANDING_SCHEMA_VERSION; from += 1) {
    const upgrade = LANDING_CONTENT_UPGRADES[from]
    if (!upgrade) {
      return { ok: false, reason: `Falta el migrador de la versión ${from} a la ${from + 1}.` }
    }
    current = { ...upgrade(current), version: from + 1 }
  }

  return { ok: true, value: current, upgradedFrom: version }
}

/* ------------------------------------------------------------------ *
 * Validación tolerante (lectura pública)
 * ------------------------------------------------------------------ */

export interface DroppedLandingBlock {
  index: number
  /** Puede venir vacío si el bloque ni declara kind. */
  kind: string
  reason: string
}

export type LandingContentReadResult =
  | { ok: true; content: LandingPageContent; dropped: DroppedLandingBlock[]; upgradedFrom: number | null }
  | { ok: false; reason: string }

/**
 * Validación tolerante: se usa al renderizar una página ya publicada.
 * Un bloque roto o de un tipo desconocido se descarta y el resto de la página se sirve igual.
 * Solo falla si el envoltorio (meta/theme/business) es inválido o si no queda ningún bloque.
 */
export function readLandingPageContent(raw: unknown): LandingContentReadResult {
  const upgraded = upgradeLandingContent(raw)
  if (!upgraded.ok) return { ok: false, reason: upgraded.reason }

  const source = upgraded.value as Record<string, unknown>
  const envelope = landingEnvelopeSchema.safeParse(source)
  if (!envelope.success) {
    const first = envelope.error.issues[0]
    const path = first?.path.join('.') || 'content'
    return { ok: false, reason: `Envoltorio inválido en ${path}: ${first?.message ?? 'desconocido'}` }
  }

  if (!Array.isArray(source.blocks)) {
    return { ok: false, reason: 'El contenido no trae un arreglo de bloques.' }
  }

  const blocks: LandingBlock[] = []
  const dropped: DroppedLandingBlock[] = []
  const seenIds = new Set<string>()

  source.blocks.slice(0, MAX_BLOCKS_PER_PAGE).forEach((rawBlock, index) => {
    const kind =
      rawBlock && typeof rawBlock === 'object' && typeof (rawBlock as Record<string, unknown>).kind === 'string'
        ? ((rawBlock as Record<string, unknown>).kind as string)
        : ''

    const parsed = landingBlockSchema.safeParse(rawBlock)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      const path = first?.path.join('.')
      dropped.push({
        index,
        kind,
        reason: path ? `${path}: ${first?.message ?? 'inválido'}` : (first?.message ?? 'inválido'),
      })
      return
    }

    if (seenIds.has(parsed.data.id)) {
      dropped.push({ index, kind, reason: `id duplicado: ${parsed.data.id}` })
      return
    }

    seenIds.add(parsed.data.id)
    blocks.push(parsed.data)
  })

  if (blocks.length === 0) {
    return { ok: false, reason: 'Ningún bloque válido en el contenido publicado.' }
  }

  return {
    ok: true,
    content: { ...envelope.data, blocks },
    dropped,
    upgradedFrom: upgraded.upgradedFrom,
  }
}

/** Primer mensaje por campo, listo para pintar errores en el editor. */
export function landingContentFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'content'
    if (!out[key]) out[key] = issue.message
  }
  return out
}

export function isLandingTemplateKey(value: unknown): value is LandingTemplateKey {
  return typeof value === 'string' && (LANDING_TEMPLATE_KEYS as readonly string[]).includes(value)
}

export function isLandingPageStatus(value: unknown): value is LandingPageStatus {
  return typeof value === 'string' && (LANDING_PAGE_STATUSES as readonly string[]).includes(value)
}

/** Normaliza un nombre de negocio a slug candidato ("Barbería El Corte" -> "barberia-el-corte"). */
export function slugifyBusinessName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/g, '')
}

export function hasLeadFormBlock(content: LandingPageContent): boolean {
  return content.blocks.some((block) => block.kind === 'leadForm' && block.visible)
}
