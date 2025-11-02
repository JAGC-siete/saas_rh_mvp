import dynamic from 'next/dynamic'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'

// Code-splitting para mejor performance
const ReportBuilder = dynamic(
  () => import('../../../components/reports/ReportBuilder'),
  {
    ssr: true,
    loading: () => (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
      </div>
    ),
  }
)

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ReportBuilder />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
