import Head from 'next/head'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import CommunicationPanel from '../../../components/admin/CommunicationPanel'

export default function CommunicationsPage() {
  return (
    <SuperAdminGuard redirectPath="/app/admin/communications">
      <SuperAdminLayout>
        <Head>
          <title>Comunicaciones · Super Admin</title>
          <meta name="description" content="Envío de campañas y secuencias de adopción a administradores" />
        </Head>
        <div className="space-y-6 p-6">
          <header className="border-b border-white/10 pb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Comunicaciones</h1>
            <p className="mt-2 text-sm text-gray-400 max-w-3xl">
              Dispara campañas de email a segmentos de administradores (adopción, anuncios). Cada envío
              queda registrado por destinatario.
            </p>
          </header>

          <CommunicationPanel />
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
