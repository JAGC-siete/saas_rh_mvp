import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export default function SecurityPage() {
  return (
    <>
      <Head>
        <title>Seguridad - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Configuración de seguridad</p>
              <h1 className="text-3xl font-semibold text-white">Seguridad</h1>
              <p className="text-white/70">
                Políticas de seguridad y autenticación
              </p>
            </div>
            <Card variant="glass" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Próximamente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-white/70">Placeholder para políticas de seguridad y 2FA.</div>
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}


