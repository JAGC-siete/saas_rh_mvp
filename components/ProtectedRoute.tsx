import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseSession } from '../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading: sessionLoading } = useSupabaseSession()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false) // ✅ Factor VI: Stateless durante build

  // ✅ Factor VI: Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // ✅ Solo ejecutar redirección en el cliente
    if (isClient && !sessionLoading && !session) {
      router.push('/')
    }
  }, [session, sessionLoading, router, isClient])

  // ✅ Durante SSR/build, renderizar loading
  if (!isClient || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Si no hay sesión, no renderizar nada (el useEffect redirigirá)
  if (!session) {
    return null
  }

  return <>{children}</>
}
