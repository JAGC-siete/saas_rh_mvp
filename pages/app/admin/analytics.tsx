import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export default function AnalyticsPage() {
  return (
    <>
      <Head>
        <title>Estadísticas - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Analytics globales</p>
              <h1 className="text-3xl font-semibold text-white">Estadísticas</h1>
              <p className="text-white/70">
                Métricas y análisis del sistema
              </p>
            </div>
            <Card variant="glass" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Próximamente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-white/70">Vista placeholder para estadísticas globales.</div>
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}


