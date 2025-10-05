import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export default function AnalyticsPage() {
  return (
    <>
      <Head>
        <title>Estadísticas - Admin</title>
      </Head>
      <SuperAdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Estadísticas</h1>
          <Card>
            <CardHeader>
              <CardTitle>Próximamente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Vista placeholder para estadísticas globales.</div>
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    </>
  )
}


