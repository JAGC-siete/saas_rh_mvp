import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export default function SystemPage() {
  return (
    <>
      <Head>
        <title>Sistema - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Estado del sistema</p>
              <h1 className="text-3xl font-semibold text-white">Estado del Sistema</h1>
              <p className="text-white/70">
                Monitoreo de salud y rendimiento
              </p>
            </div>
            <Card variant="glass" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Pruebas de salud</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-white/70">Placeholder para health checks de DB, storage, functions.</div>
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}


