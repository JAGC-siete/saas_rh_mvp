import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import SupportManager from '../../../components/support/SupportManager'

export default function SupportPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <header className="border-b border-white/10 pb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Soporte</h1>
            <p className="mt-2 text-sm text-gray-400 max-w-3xl">
              Reporta incidentes, da seguimiento a tus tickets y conversa con el equipo de soporte.
            </p>
          </header>

          <SupportManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
