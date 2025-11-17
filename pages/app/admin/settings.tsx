import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Configuración - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Configuración</h1>
            <Card>
              <CardHeader>
                <CardTitle>Próximamente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">Placeholder para configuración global.</div>
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}


