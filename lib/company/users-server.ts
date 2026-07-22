import { createAdminClient } from '../supabase/server'

export async function loadCompanyEffectiveFeatures(
  companyId: string
): Promise<Record<string, boolean>> {
  const admin = createAdminClient()
  const [{ data: catalog }, { data: effective }] = await Promise.all([
    admin.from('feature_catalog').select('feature_key'),
    admin
      .from('v_company_effective_features')
      .select('feature_key, is_enabled')
      .eq('company_id', companyId),
  ])

  const features: Record<string, boolean> = {}
  for (const row of catalog || []) {
    features[(row as { feature_key: string }).feature_key] = false
  }
  for (const row of effective || []) {
    const r = row as { feature_key: string; is_enabled: boolean }
    features[r.feature_key] = !!r.is_enabled
  }
  return features
}

/** Evita barrer todo Auth: getUserById por id de perfil. */
export async function fetchAuthMetadataByUserIds(
  adminClient: ReturnType<typeof createAdminClient>,
  userIds: string[],
  chunkSize = 15
): Promise<Map<string, { email: string; last_sign_in_at: string | null }>> {
  const out = new Map<string, { email: string; last_sign_in_at: string | null }>()
  const unique = [...new Set(userIds)]
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (uid) => {
        try {
          const { data, error } = await adminClient.auth.admin.getUserById(uid)
          if (error || !data?.user) return
          const u = data.user
          out.set(u.id, {
            email: u.email || '',
            last_sign_in_at: u.last_sign_in_at ?? null,
          })
        } catch {
          // omit missing
        }
      })
    )
  }
  return out
}
