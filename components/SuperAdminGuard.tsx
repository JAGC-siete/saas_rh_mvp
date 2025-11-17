import { ReactNode, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'

interface SuperAdminGuardProps {
  children: ReactNode
  redirectPath?: string
}

export default function SuperAdminGuard({ children, redirectPath }: SuperAdminGuardProps) {
  const { userProfile, loading } = useAuth()
  const router = useRouter()

  const target = useMemo(() => {
    if (redirectPath) return redirectPath
    if (router.isReady) return router.asPath || '/app/admin'
    return '/app/admin'
  }, [redirectPath, router.isReady, router.asPath])

  useEffect(() => {
    if (!router.isReady || loading) return

    if (!userProfile) {
      router.replace(`/app/login?redirect=${encodeURIComponent(target)}`)
      return
    }

    if (userProfile.role !== 'super_admin') {
      router.replace('/app/dashboard')
    }
  }, [userProfile, loading, router, target])

  if (!router.isReady || loading || !userProfile || userProfile.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <>{children}</>
}


