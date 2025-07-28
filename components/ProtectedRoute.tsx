import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'hr' | 'manager')[]
}

export function ProtectedRoute({ children, allowedRoles = ['admin', 'hr', 'manager'] }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/')
        return
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, loading, router, allowedRoles])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render children if not authenticated or authorized
  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null
  }

  return <>{children}</>
}
