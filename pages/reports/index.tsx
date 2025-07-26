import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseSession } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'
import ReportsAndAnalytics from '../../components/ReportsAndAnalytics'

export default function ReportsPage() {
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
      <ReportsAndAnalytics />
    </DashboardLayout>
  )
}
