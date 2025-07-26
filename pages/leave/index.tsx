import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseSession } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'
import LeaveManager from '../../components/LeaveManager'

export default function LeavePage() {
  const { session, loading: sessionLoading } = useSupabaseSession()
  const router = useRouter()

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push('/')
    }
  }, [session, sessionLoading, router])

  if (sessionLoading || !session) {
    return <div>Loading...</div>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
          <p className="text-gray-600">Administra solicitudes de permisos y vacaciones</p>
        </div>
        
        <LeaveManager />
      </div>
    </DashboardLayout>
  )
}
