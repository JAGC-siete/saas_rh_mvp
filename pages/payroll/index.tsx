import { useRouter } from 'next/router'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import PayrollManager from '../../components/PayrollManager'
import { GetServerSideProps } from 'next'

export default function PayrollPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Nómina</h1>
            <p className="text-gray-600">Procesa y administra las nóminas</p>
          </div>
          
          <PayrollManager />
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
