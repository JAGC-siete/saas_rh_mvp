import { GetServerSideProps } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useSession } from '@supabase/auth-helpers-react'
import DashboardLayout from '../../components/DashboardLayout'
import CompanySettings from '../../components/CompanySettings'

export default function SettingsPage() {
  const session = useSession()

  if (!session) {
    return <div>Redirecting...</div>
  }

  return (
    <DashboardLayout>
      <CompanySettings />
    </DashboardLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }

  return {
    props: {
      initialSession: session,
    },
  }
}
