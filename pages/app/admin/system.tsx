import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export default function SystemPage() {
  return (
    <>
      <Head>
        <title>Sistema - Admin</title>
      </Head>
      <SuperAdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Estado del Sistema</h1>
          <Card>
            <CardHeader>
              <CardTitle>Pruebas de salud</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Placeholder para health checks de DB, storage, functions.</div>
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    </>
  )
}


