import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'

export default function AttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        // Obtener perfil del usuario
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'super_admin') {
          // Superadmin va al dashboard de administración
          router.push('/attendance/dashboard')
        } else {
          // Empleados van al registro de asistencia
          router.push('/attendance/register')
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        // Por defecto, ir al registro de asistencia
        router.push('/attendance/register')
      } finally {
        setLoading(false)
      }
    }

    checkUserRole()
  }, [router])

  if (loading) {
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
