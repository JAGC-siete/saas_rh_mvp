import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/auth'
import { createClient } from '../../lib/supabase/client'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'

export default function AttendanceIndex() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUserRole = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      try {
        // Fetch user profile to determine role
        const { data: profile } = await (supabase as any)
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // Role-based redirection
        if (profile?.role === 'company_admin' || profile?.role === 'super_admin') {
          // Admins go to attendance dashboard
          router.push('/app/attendance/dashboard')
        } else {
          // Employees go to attendance registration
          router.push('/attendance/register')
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        // Default fallback to registration
        router.push('/attendance/register')
      } finally {
        setLoading(false)
      }
    }

    checkUserRole()
  }, [user, authLoading, router])

  if (loading || authLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Redirigiendo...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return null
}
