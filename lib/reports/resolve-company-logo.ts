import { createAdminClient } from '../supabase/server'
import { COMPANY_LOGO_BUCKET } from '../company-branding/storage'
import type { BrandingConfig } from './report-config-schema'

async function fetchLogoBufferFromUrl(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Resolves company logo for PDF generation.
 * Prefers private Storage path; falls back to legacy external logoUrl.
 */
export async function resolveCompanyLogoBuffer(
  branding?: BrandingConfig | null
): Promise<Buffer | null> {
  if (!branding) return null

  if (branding.logoStoragePath) {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase.storage
        .from(COMPANY_LOGO_BUCKET)
        .download(branding.logoStoragePath)
      if (error || !data) return null
      const arrayBuffer = await data.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch {
      return null
    }
  }

  if (branding.logoUrl && /^https?:\/\//i.test(branding.logoUrl)) {
    return fetchLogoBufferFromUrl(branding.logoUrl)
  }

  return null
}
