import { ReactNode, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'

interface SuperAdminGuardProps {
  children: ReactNode
  redirectPath?: string
}

export default function SuperAdminGuard({ children, redirectPath }: SuperAdminGuardProps) {
  const { userProfile, loading, user } = useAuth()
  const router = useRouter()

  const target = useMemo(() => {
    if (redirectPath) return redirectPath
    if (router.isReady) return router.asPath || '/app/admin'
    return '/app/admin'
  }, [redirectPath, router.isReady, router.asPath])

  useEffect(() => {
    if (!router.isReady || loading) return

    // If no user at all, redirect to login
    if (!user) {
      router.replace(`/app/login?redirect=${encodeURIComponent(target)}`)
      return
    }

    // If user exists but profile is still loading, wait
    if (!userProfile && user) {
      // Give it a moment for profile to load from localStorage or API
      return
    }

    // If profile loaded but not super_admin, redirect
    if (userProfile && userProfile.role !== 'super_admin') {
      console.log('User is not super_admin, redirecting to dashboard', {
        role: userProfile.role,
        userId: userProfile.id
      })
      router.replace('/app/dashboard')
      return
    }

    // If we have user but no profile yet, try to get it from localStorage
    if (user && !userProfile && typeof window !== 'undefined') {
      try {
        const userData = localStorage.getItem('user')
        if (userData) {
          const parsed = JSON.parse(userData)
          if (parsed.role === 'super_admin') {
            // Profile will be loaded by useAuth, just wait
            return
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [userProfile, loading, router, target, user])

  // Show loading while checking auth
  if (!router.isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If no user, show loading (redirect will happen in useEffect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If user exists but profile not loaded yet, wait a bit
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If profile loaded but not super_admin, show loading (redirect will happen)
  if (userProfile.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // All checks passed, render children
  return <>{children}</>
}


