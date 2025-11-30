import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { createClient } from '../../lib/supabase/client'
import DashboardLayout from '../../components/DashboardLayout'
import EmployeeManager from '../../components/EmployeeManager'
import DepartmentManager from '../../components/DepartmentManager'
import PayrollManagerNew from '../../components/PayrollManagerNew'
// Add import for user management component if exists, or create a simple one

export default function SuperAdminDashboard() {
  const { userProfile, loading } = useAuth()
    // Create Supabase client
  const supabase = createClient()

  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [activeTab, setActiveTab] = useState('companies')

  useEffect(() => {
    if (userProfile?.role === 'super_admin') {
      fetchCompanies()
    }
  }, [userProfile])

  const fetchCompanies = async () => {
    const { data } = await (supabase as any).from('companies').select('*')
    setCompanies(data || [])
    if ((data?.length ?? 0) > 0) setSelectedCompany(data?.[0]?.id ?? '')
  }

  if (loading) return <div>Loading...</div>
  if (userProfile?.role !== 'super_admin') return <div>Access denied</div>

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Superadmin Dashboard - Gestión Global SaaS</h1>
        
        {/* Tabs for sections */}
        <div className="tabs mb-4">
          <button onClick={() => setActiveTab('companies')} className={activeTab === 'companies' ? 'active' : ''}>Empresas</button>
          <button onClick={() => setActiveTab('employees')} className={activeTab === 'employees' ? 'active' : ''}>Empleados</button>
          <button onClick={() => setActiveTab('departments')} className={activeTab === 'departments' ? 'active' : ''}>Departamentos</button>
          <button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'active' : ''}>Usuarios y Permisos</button>
          <button onClick={() => setActiveTab('payrolls')} className={activeTab === 'payrolls' ? 'active' : ''}>Planillas</button>
        </div>

        {/* Company selector */}
        <select onChange={(e) => setSelectedCompany(e.target.value)} value={selectedCompany}>
          {companies.map((company: any) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>

        {activeTab === 'companies' && (
          <div>
            {/* List and CRUD for companies */}
            {/* Implement create/edit/delete companies using supabase */}
          </div>
        )}

        {activeTab === 'employees' && selectedCompany ? (
          <EmployeeManager companyId={selectedCompany} />
        ) : null}

        {activeTab === 'departments' && selectedCompany ? (
          <DepartmentManager companyId={selectedCompany} />
        ) : null}

        {activeTab === 'payrolls' && selectedCompany ? (
          <PayrollManagerNew companyId={selectedCompany} />
        ) : null}

        {activeTab === 'users' && selectedCompany ? (
          <div>
            {/* Implement user management: list users, add/remove, assign roles/permissions */}
            {/* Use supabase.from('user_profiles').select('*').eq('company_id', selectedCompany) */}
            {/* Forms for CRUD */}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
