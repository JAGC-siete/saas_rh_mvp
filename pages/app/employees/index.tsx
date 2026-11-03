import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import EmployeeManager from '../../../components/EmployeeManager'
import { useTranslations } from 'next-intl'

export default function EmployeesPage() {
  const t = useTranslations('employees')
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('pageTitle')}</h1>
            <p className="text-gray-300">{t('pageSubtitle')}</p>
          </div>

          <EmployeeManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
