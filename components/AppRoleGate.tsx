import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'
import type { RoleId } from '../lib/auth/role-access'

interface AppRoleGateProps {
  /** Si el perfil existe y el rol no está en esta lista → redirect (salvo allowWhen). */
  allowRoles: readonly RoleId[]
  /** Permite acceso aunque el rol no esté en allowRoles (p. ej. manager con permiso granular). */
  allowWhen?: (userProfile: NonNullable<ReturnType<typeof useAuth>['userProfile']>) => boolean
  children: React.ReactNode
  /** Ruta cliente al redirigir (default: dashboard APP). */
  redirectTo?: string
}

export default function AppRoleGate({
  allowRoles,
  allowWhen,
  children,
  redirectTo = '/app/dashboard',
}: AppRoleGateProps) {
  const { userProfile, loading } = useAuth()
  const router = useRouter()

  const isAllowed = (profile: NonNullable<typeof userProfile>) => {
    const raw = typeof profile.role === 'string' ? profile.role.trim().toLowerCase() : ''
    const roleOk = !!(raw && (allowRoles as readonly string[]).includes(raw))
    if (roleOk) return true
    return allowWhen ? allowWhen(profile) : false
  }

  useEffect(() => {
    if (loading) return
    if (userProfile && !isAllowed(userProfile)) {
      router.replace(redirectTo)
    }
  }, [loading, userProfile, router, redirectTo, allowRoles, allowWhen])

  if (loading || !userProfile) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-gray-300 text-sm">
        Verificando permisos...
      </div>
    )
  }

  if (!isAllowed(userProfile)) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-gray-300 text-sm">
        Redirigiendo...
      </div>
    )
  }

  return <>{children}</>
}
