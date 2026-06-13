export type RecursoStatus = 'draft' | 'published'

export interface RecursoInput {
  slug: string
  title: string
  description: string
  content: string
  datePublished?: string
  dateModified?: string
  image?: string
  author?: string
  status: RecursoStatus
}

export interface RecursoAdminItem {
  id: string
  slug: string
  title: string
  description: string
  content: string
  datePublished: string
  dateModified?: string
  image?: string
  author?: string
  status: RecursoStatus
  createdAt: string
  updatedAt: string
}

const SLUG_MAX_LENGTH = 80
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

/** Normalize a title or slug into a URL-safe slug. */
export function normalizeSlug(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
}

export function isValidRecursoStatus(status: unknown): status is RecursoStatus {
  return status === 'draft' || status === 'published'
}

export function validateRecursoInput(
  input: Partial<RecursoInput>,
  options?: { requireContent?: boolean }
): { valid: true; data: RecursoInput } | { valid: false; error: string } {
  const requireContent = options?.requireContent ?? true

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) {
    return { valid: false, error: 'El título es obligatorio' }
  }

  const rawSlug = typeof input.slug === 'string' && input.slug.trim()
    ? input.slug.trim()
    : normalizeSlug(title)
  const slug = normalizeSlug(rawSlug)
  if (!slug) {
    return { valid: false, error: 'El slug es obligatorio' }
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { valid: false, error: 'El slug solo puede contener letras minúsculas, números y guiones' }
  }

  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const content = typeof input.content === 'string' ? input.content : ''
  if (requireContent && !content.trim()) {
    return { valid: false, error: 'El contenido es obligatorio' }
  }

  const status = input.status ?? 'draft'
  if (!isValidRecursoStatus(status)) {
    return { valid: false, error: 'El estado debe ser draft o published' }
  }

  const datePublished =
    typeof input.datePublished === 'string' && input.datePublished.trim()
      ? input.datePublished.trim()
      : new Date().toISOString()

  const parsed: RecursoInput = {
    slug,
    title,
    description,
    content,
    datePublished,
    status,
  }

  if (typeof input.dateModified === 'string' && input.dateModified.trim()) {
    parsed.dateModified = input.dateModified.trim()
  }
  if (typeof input.image === 'string' && input.image.trim()) {
    parsed.image = input.image.trim()
  }
  if (typeof input.author === 'string' && input.author.trim()) {
    parsed.author = input.author.trim()
  }

  return { valid: true, data: parsed }
}
