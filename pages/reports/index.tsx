import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import ReportsManager from '../../components/ReportsManager'

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ReportsManager />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
