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
          <div className="space-y-6 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Respaldo de datos</p>
              <h1 className="text-3xl font-semibold text-white">Backup</h1>
              <p className="text-white/70">
                Respaldo y restauración de datos
              </p>
            </div>
            <Card variant="glass" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Próximamente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-white/70">Placeholder para respaldo y restauración de datos.</div>
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}


