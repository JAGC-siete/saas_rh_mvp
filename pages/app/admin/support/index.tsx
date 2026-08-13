import Head from 'next/head'
import SuperAdminGuard from '../../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../../components/SuperAdminLayout'
import AgentConsole from '../../../../components/support/AgentConsole'

export default function AdminSupportPage() {
  return (
    <SuperAdminGuard redirectPath="/app/admin/support">
      <SuperAdminLayout>
        <Head>
          <title>Soporte · Super Admin</title>
        </Head>
        <div className="space-y-6">
          <header className="border-b border-white/10 pb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Cola de soporte</h1>
            <p className="mt-2 text-sm text-gray-400 max-w-3xl">
              Tickets de todas las empresas. Arrastra el flujo por estado, responde, agrega notas internas y
              ajusta prioridad.
            </p>
          </header>

          <AgentConsole />
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
