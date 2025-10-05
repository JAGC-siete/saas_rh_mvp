import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function SuperAdminRouteRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/app/admin/super-admin-dashboard')
  }, [router])
  return (
    <>
      <Head>
        <title>Redirigiendo…</title>
        <meta name="description" content="Redirigiendo al dashboard de super administrador" />
      </Head>
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </>
  )
}

