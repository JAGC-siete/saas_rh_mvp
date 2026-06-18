/**
 * Company logo storage helpers (HR_BUCKET/companies/{id}/branding/)
 */

export const COMPANY_LOGO_BUCKET = 'HR_BUCKET'

export const ALLOWED_LOGO_MIME_TYPES = ['image/jpeg', 'image/png'] as const
export type LogoMimeType = (typeof ALLOWED_LOGO_MIME_TYPES)[number]

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export interface CompanyBrandingMetadata {
  logo_storage_path?: string
  logo_mime_type?: string
  logo_updated_at?: string
}

export interface CompanyReportsMetadata {
  branding?: CompanyBrandingMetadata
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidLogoMimeType(mime: string): mime is LogoMimeType {
  return (ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(mime)
}

export function extFromLogoMime(mime: string): '.png' | '.jpg' {
  return mime === 'image/png' ? '.png' : '.jpg'
}

export function generateCompanyLogoPath(companyId: string, mimeType: string): string {
  if (!UUID_RE.test(companyId)) {
    throw new Error('Invalid company_id format')
  }
  if (!isValidLogoMimeType(mimeType)) {
    throw new Error('Invalid logo mime type')
  }
  return `companies/${companyId}/branding/logo${extFromLogoMime(mimeType)}`
}

export function isCompanyLogoStoragePath(path: string, companyId: string): boolean {
  return path === `companies/${companyId}/branding/logo.png`
    || path === `companies/${companyId}/branding/logo.jpg`
}

export function parseReportsMetadata(raw: unknown): CompanyReportsMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const obj = raw as Record<string, unknown>
  const brandingRaw = obj.branding
  if (!brandingRaw || typeof brandingRaw !== 'object' || Array.isArray(brandingRaw)) {
    return {}
  }
  const b = brandingRaw as Record<string, unknown>
  return {
    branding: {
      logo_storage_path:
        typeof b.logo_storage_path === 'string' ? b.logo_storage_path : undefined,
      logo_mime_type: typeof b.logo_mime_type === 'string' ? b.logo_mime_type : undefined,
      logo_updated_at: typeof b.logo_updated_at === 'string' ? b.logo_updated_at : undefined,
    },
  }
}

export function mergeLogoIntoReportsMetadata(
  prev: unknown,
  logo: CompanyBrandingMetadata | null
): CompanyReportsMetadata {
  if (!logo || !logo.logo_storage_path) {
    return {}
  }
  return {
    branding: {
      logo_storage_path: logo.logo_storage_path,
      logo_mime_type: logo.logo_mime_type,
      logo_updated_at: logo.logo_updated_at ?? new Date().toISOString(),
    },
  }
}
