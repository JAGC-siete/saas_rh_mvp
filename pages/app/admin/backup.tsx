import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export default function BackupPage() {
  return (
    <>
      <Head>
        <title>Backup - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Backup</h1>
            <Card>
              <CardHeader>
                <CardTitle>Próximamente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">Placeholder para respaldo y restauración de datos.</div>
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}


