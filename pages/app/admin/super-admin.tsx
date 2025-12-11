import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import SuperAdminGuard from '../../../components/SuperAdminGuard'

export default function SuperAdminRouteRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/app/admin')
  }, [router])
  return (
    <>
      <Head>
        <title>Redirigiendo…</title>
        <meta name="description" content="Redirigiendo al dashboard de super administrador" />
      </Head>
      <SuperAdminGuard redirectPath="/app/admin/super-admin">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SuperAdminGuard>
    </>
  )
}

