import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseSession } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'
import CompanySettings from '../../components/CompanySettings'

export default function SettingsPage() {
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
      <CompanySettings />
    </DashboardLayout>
  )
}
