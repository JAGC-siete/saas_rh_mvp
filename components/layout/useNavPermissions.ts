import { useEffect, useState } from 'react'
import type { NavPermissions } from '../../lib/navigation/sidebar'
import {
  PESSIMISTIC_PERMISSIONS,
  RESOLVING_PERMISSIONS,
  computeNavPermissions,
  type ProfileLike,
} from '../../lib/navigation/permissions'

// Caché a nivel de módulo: cada página monta su propio DashboardLayout; sin esto el menú
// recalcula desde cero y los ítems protegidos "aparecen" en cada navegación.
const permissionCache = new Map<string, NavPermissions>()
const featureCache = new Map<string, Record<string, boolean>>()

export function useNavPermissions(userId: string | undefined, userProfile: ProfileLike | null) {
  const cached = userId ? permissionCache.get(userId) : undefined
  const [permissions, setPermissions] = useState<NavPermissions>(cached ?? RESOLVING_PERMISSIONS)
  const [resolving, setResolving] = useState(!cached)
  const [features, setFeatures] = useState<Record<string, boolean> | null>(
    userId ? featureCache.get(userId) ?? null : null
  )

  useEffect(() => {
    if (!userId) {
      setResolving(false)
      return
    }
    let cancelled = false
    const apply = (p: NavPermissions) => {
      permissionCache.set(userId, p)
      if (!cancelled) {
        setPermissions(p)
        setResolving(false)
      }
    }

    if (userProfile) {
      apply(computeNavPermissions(userProfile))
      return () => {
        cancelled = true
      }
    }

    ;(async () => {
      try {
        const res = await fetch('/api/user-profiles')
        if (!res.ok) return apply(PESSIMISTIC_PERMISSIONS)
        const { profiles } = await res.json()
        // El perfil del usuario actual, no el más reciente de la empresa.
        const profile = (profiles || []).find((p: ProfileLike) => p?.id === userId) || profiles?.[0]
        apply(profile ? computeNavPermissions(profile) : PESSIMISTIC_PERMISSIONS)
      } catch {
        apply(PESSIMISTIC_PERMISSIONS)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, userProfile])

  // Funcionalidades del plan + overrides por empresa (has_feature()).
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/features', { credentials: 'include' })
        const data = res.ok ? await res.json() : null
        const next = (data?.features || {}) as Record<string, boolean>
        featureCache.set(userId, next)
        if (!cancelled) setFeatures(next)
      } catch {
        if (!cancelled) setFeatures({})
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { permissions, features, resolving }
}
