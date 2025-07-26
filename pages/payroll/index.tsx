import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseSession } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'
import PayrollManager from '../../components/PayrollManager'

export default function PayrollPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Nómina</h1>
          <p className="text-gray-600">Procesa y administra las nóminas</p>
        </div>
        
        <PayrollManager />
      </div>
    </DashboardLayout>
  )
}
