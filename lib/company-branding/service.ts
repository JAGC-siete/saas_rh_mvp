import type { SupabaseClient } from '@supabase/supabase-js'
import {
  COMPANY_LOGO_BUCKET,
  generateCompanyLogoPath,
  isCompanyLogoStoragePath,
  mergeLogoIntoReportsMetadata,
  parseReportsMetadata,
  type CompanyBrandingMetadata,
} from './storage'

export async function loadCompanyBranding(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyBrandingMetadata | null> {
  const { data, error } = await supabase
    .from('company_metadata')
    .select('reports_metadata')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) throw error
  const parsed = parseReportsMetadata(data?.reports_metadata)
  return parsed.branding?.logo_storage_path ? parsed.branding : null
}

export async function saveCompanyLogoMetadata(
  supabase: SupabaseClient,
  companyId: string,
  logo: CompanyBrandingMetadata
): Promise<void> {
  const { data: existing, error: readErr } = await supabase
    .from('company_metadata')
    .select('reports_metadata')
    .eq('company_id', companyId)
    .maybeSingle()

  if (readErr) throw readErr

  const merged = mergeLogoIntoReportsMetadata(existing?.reports_metadata, logo)

  const { error } = await supabase.from('company_metadata').upsert(
    {
      company_id: companyId,
      reports_metadata: merged,
    },
    { onConflict: 'company_id' }
  )

  if (error) throw error
}

export async function clearCompanyLogoMetadata(
  supabase: SupabaseClient,
  companyId: string
): Promise<string | null> {
  const branding = await loadCompanyBranding(supabase, companyId)
  const oldPath = branding?.logo_storage_path ?? null

  const { data: existing, error: readErr } = await supabase
    .from('company_metadata')
    .select('reports_metadata')
    .eq('company_id', companyId)
    .maybeSingle()

  if (readErr) throw readErr

  const merged = mergeLogoIntoReportsMetadata(existing?.reports_metadata, null)

  const { error } = await supabase.from('company_metadata').upsert(
    {
      company_id: companyId,
      reports_metadata: merged,
    },
    { onConflict: 'company_id' }
  )

  if (error) throw error
  return oldPath
}

export async function createLogoSignedPreviewUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export async function removeLogoFromStorage(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  await supabase.storage.from(COMPANY_LOGO_BUCKET).remove([storagePath])
}

export function buildLogoMetadata(
  companyId: string,
  mimeType: string,
  storagePath?: string
): { storagePath: string; metadata: CompanyBrandingMetadata } {
  const path = storagePath ?? generateCompanyLogoPath(companyId, mimeType)
  if (!isCompanyLogoStoragePath(path, companyId)) {
    throw new Error('Invalid logo storage path for company')
  }
  return {
    storagePath: path,
    metadata: {
      logo_storage_path: path,
      logo_mime_type: mimeType,
      logo_updated_at: new Date().toISOString(),
    },
  }
}
