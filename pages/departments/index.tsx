import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseSession } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'
import DepartmentManager from '../../components/DepartmentManager'

export default function DepartmentsPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Departamentos</h1>
          <p className="text-gray-600">Organiza y administra los departamentos de la empresa</p>
        </div>
        
        <DepartmentManager />
      </div>
    </DashboardLayout>
  )
}
