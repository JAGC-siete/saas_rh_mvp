import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'
import type { RoleId } from '../lib/auth/role-access'

interface AppRoleGateProps {
  /** Si el perfil existe y el rol no está en esta lista → redirect. */
  allowRoles: readonly RoleId[]
  children: React.ReactNode
  /** Ruta cliente al redirigir (default: dashboard APP). */
  redirectTo?: string
}

export default function AppRoleGate({
  allowRoles,
  children,
  redirectTo = '/app/dashboard',
}: AppRoleGateProps) {
  const { userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const raw = userProfile?.role
    const r = typeof raw === 'string' ? (raw.trim().toLowerCase() as RoleId | string) : ''
    const ok = !!(r && (allowRoles as readonly string[]).includes(r))
    if (userProfile && !ok) {
      router.replace(redirectTo)
    }
  }, [loading, userProfile, router, redirectTo, allowRoles])

  if (loading || !userProfile) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-gray-300 text-sm">
        Verificando permisos...
      </div>
    )
  }

  const r = typeof userProfile.role === 'string' ? userProfile.role.trim().toLowerCase() : ''
  if (!(r && (allowRoles as readonly string[]).includes(r))) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-gray-300 text-sm">
        Redirigiendo...
      </div>
    )
  }

  return <>{children}</>
}
