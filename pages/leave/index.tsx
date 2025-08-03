import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import LeaveManager from '../../components/LeaveManager'
import { GetServerSideProps } from 'next'

export default function LeavePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
            <p className="text-gray-600">Administra las solicitudes de permisos</p>
          </div>
          
          <LeaveManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {}
  }
}
