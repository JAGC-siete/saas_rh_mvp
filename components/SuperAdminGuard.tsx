import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'

interface SuperAdminGuardProps {
  children: ReactNode
  redirectPath?: string
}

export default function SuperAdminGuard({ children, redirectPath }: SuperAdminGuardProps) {
  const { userProfile, loading, user } = useAuth()
  const router = useRouter()
  const [profileChecked, setProfileChecked] = useState(false)
  const [localProfile, setLocalProfile] = useState<any>(null)

  const target = useMemo(() => {
    if (redirectPath) return redirectPath
    if (router.isReady) return router.asPath || '/app/admin'
    return '/app/admin'
  }, [redirectPath, router.isReady, router.asPath])

  // Try to get profile from localStorage as fallback
  useEffect(() => {
    if (typeof window === 'undefined' || profileChecked) return

    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsed = JSON.parse(userData)
        console.log('🔍 SuperAdminGuard: Found user in localStorage', {
          email: parsed.email,
          role: parsed.role,
          id: parsed.id
        })
        setLocalProfile(parsed)
        setProfileChecked(true)
      } else {
        setProfileChecked(true)
      }
    } catch (e) {
      console.error('❌ SuperAdminGuard: Error reading localStorage', e)
      setProfileChecked(true)
    }
  }, [profileChecked])

  useEffect(() => {
    if (!router.isReady) return

    // If still loading auth, wait
    if (loading) {
      console.log('⏳ SuperAdminGuard: Auth still loading...')
      return
    }

    // If no user at all, redirect to login
    if (!user) {
      console.log('❌ SuperAdminGuard: No user, redirecting to login')
      router.replace(`/app/login?redirect=${encodeURIComponent(target)}`)
      return
    }

    // Determine effective profile (from useAuth or localStorage fallback)
    const effectiveProfile = userProfile || localProfile

    // If we have user but no profile yet, wait a bit more (max 3 seconds)
    if (!effectiveProfile && user) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ SuperAdminGuard: Profile not loaded after timeout, checking localStorage')
        // Try one more time to get from localStorage
        if (typeof window !== 'undefined') {
          try {
            const userData = localStorage.getItem('user')
            if (userData) {
              const parsed = JSON.parse(userData)
              if (parsed.role === 'super_admin') {
                console.log('✅ SuperAdminGuard: Using localStorage profile as fallback')
                // Don't redirect, let it render with localStorage data
                return
              }
            }
          } catch (e) {
            // Ignore
          }
        }
        console.error('❌ SuperAdminGuard: No profile found, redirecting to login')
        router.replace(`/app/login?redirect=${encodeURIComponent(target)}`)
      }, 3000)

      return () => clearTimeout(timeout)
    }

    // If profile loaded but not super_admin, redirect
    if (effectiveProfile && effectiveProfile.role !== 'super_admin') {
      console.log('❌ SuperAdminGuard: User is not super_admin, redirecting', {
        role: effectiveProfile.role,
        userId: effectiveProfile.id,
        email: effectiveProfile.email
      })
      router.replace('/app/dashboard')
      return
    }

    // If we have super_admin profile, log success
    if (effectiveProfile && effectiveProfile.role === 'super_admin') {
      console.log('✅ SuperAdminGuard: Access granted', {
        role: effectiveProfile.role,
        userId: effectiveProfile.id,
        email: effectiveProfile.email,
        source: userProfile ? 'useAuth' : 'localStorage'
      })
    }
  }, [userProfile, loading, router, target, user, localProfile, profileChecked])

  // Show loading while checking auth
  if (!router.isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  // If no user, show loading (redirect will happen in useEffect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  // Determine effective profile
  const effectiveProfile = userProfile || localProfile

  // If user exists but profile not loaded yet, wait a bit
  if (!effectiveProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Cargando perfil de usuario...</p>
        </div>
      </div>
    )
  }

  // If profile loaded but not super_admin, show loading (redirect will happen)
  if (effectiveProfile.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // All checks passed, render children
  return <>{children}</>
}


