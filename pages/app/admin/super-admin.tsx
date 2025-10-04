import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth'
import { useRouter } from 'next/router'
import Head from 'next/head'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { 
  Users, 
  Building2, 
  Shield, 
  Plus,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Building,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Company {
  id: string
  name: string
  subdomain: string
  plan_type: string
  is_active: boolean
  created_at: string
  employee_count?: number
}

interface User {
  id: string
  email: string
  role: string
  company_id: string
  company_name?: string
  is_active: boolean
  last_login: string
  created_at: string
}

export default function SuperAdminPanel() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  
  // State
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'create'>('companies')
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Forms
  const [companyForm, setCompanyForm] = useState({
    name: '',
    subdomain: '',
    plan_type: 'basic',
    admin_email: '',
    admin_password: ''
  })

  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    role: 'company_admin',
    company_id: ''
  })

  // Auth check - same as employees dashboard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/app/login')
      return
    }
    
    // Super admin role check
    if (!loading && user && userProfile && userProfile.role !== 'super_admin') {
      console.warn('Non-super-admin user attempted to access super-admin panel', {
        userId: user.id,
        userRole: userProfile.role
      })
      router.push('/app/dashboard')
      return
    }
  }, [user, loading, router, userProfile])

  // Load data - same as employees dashboard
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoadingData(true)
      setError(null)

      // Load companies and users in parallel
      const [companiesRes, usersRes] = await Promise.all([
        fetch('/api/admin/companies', { credentials: 'include' }),
        fetch('/api/admin/users', { credentials: 'include' })
      ])

      if (!companiesRes.ok || !usersRes.ok) {
        throw new Error('Error loading data')
      }

      const companiesData = await companiesRes.json()
      const usersData = await usersRes.json()

      setCompanies(companiesData.companies || [])
      setUsers(usersData.users || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Error al cargar datos del sistema')
    } finally {
      setLoadingData(false)
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(companyForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error creating company')
      }

      setSuccess('Empresa creada exitosamente')
      setCompanyForm({ name: '', subdomain: '', plan_type: 'basic', admin_email: '', admin_password: '' })
      setShowCreateCompany(false)
      loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear empresa')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error creating user')
      }

      setSuccess('Usuario creado exitosamente')
      setUserForm({ email: '', password: '', role: 'company_admin', company_id: '' })
      setShowCreateUser(false)
      loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear usuario')
    }
  }

  const handleToggleCompany = async (companyId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !isActive })
      })

      if (!response.ok) throw new Error('Error updating company')

      setSuccess(`Empresa ${!isActive ? 'activada' : 'desactivada'} exitosamente`)
      loadData()
    } catch (error) {
      setError('Error al actualizar empresa')
    }
  }

  const handleToggleUser = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !isActive })
      })

      if (!response.ok) throw new Error('Error updating user')

      setSuccess(`Usuario ${!isActive ? 'activado' : 'desactivado'} exitosamente`)
      loadData()
    } catch (error) {
      setError('Error al actualizar usuario')
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>Super Admin Panel - Sistema HR</title>
        <meta name="description" content="Panel de super administrador" />
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Crown className="h-8 w-8 text-yellow-600" />
                Super Admin Panel
              </h1>
              <p className="text-gray-600">Gestión completa del sistema multi-tenant</p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-600">
                {userProfile?.role === 'super_admin' ? 'Super Administrador' : 
                 userProfile?.role === 'company_admin' ? 'Admin de Empresa' :
                 userProfile?.role === 'hr_manager' ? 'HR Manager' :
                 userProfile?.role === 'employee' ? 'Empleado' : userProfile?.role || 'Usuario'}
              </span>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-5 w-5" />
                  <span>{error}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setError(null)}
                    className="ml-auto"
                  >
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {success && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span>{success}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSuccess(null)}
                    className="ml-auto"
                  >
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'companies'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="h-4 w-4 inline mr-2" />
              Empresas ({companies.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Usuarios ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Crear Nuevo
            </button>
          </div>

          {/* Companies Tab */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Gestión de Empresas</h2>
                <Button onClick={() => setShowCreateCompany(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Empresa
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                  <Card key={company.id} className={`${!company.is_active ? 'opacity-60' : ''}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {company.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {company.is_active ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>
                        <div className="space-y-1">
                          <p>Subdominio: {company.subdomain}</p>
                          <p>Plan: {company.plan_type}</p>
                          <p>Empleados: {company.employee_count || 0}</p>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleCompany(company.id, company.is_active)}
                        >
                          {company.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Gestión de Usuarios</h2>
                <Button onClick={() => setShowCreateUser(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50">
                        <tr>
                          <th className="text-left p-4 font-medium">Usuario</th>
                          <th className="text-left p-4 font-medium">Rol</th>
                          <th className="text-left p-4 font-medium">Empresa</th>
                          <th className="text-left p-4 font-medium">Estado</th>
                          <th className="text-left p-4 font-medium">Último Login</th>
                          <th className="text-left p-4 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{user.email}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'super_admin' ? 'bg-yellow-100 text-yellow-800' :
                                user.role === 'company_admin' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role === 'super_admin' ? 'Super Admin' :
                                 user.role === 'company_admin' ? 'Admin Empresa' :
                                 user.role === 'hr_manager' ? 'HR Manager' : user.role}
                              </span>
                            </td>
                            <td className="p-4 text-gray-600">
                              {user.company_name || 'N/A'}
                            </td>
                            <td className="p-4">
                              {user.is_active ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  Activo
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-3 w-3" />
                                  Inactivo
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-gray-600 text-sm">
                              {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleToggleUser(user.id, user.is_active)}
                                >
                                  {user.is_active ? 'Desactivar' : 'Activar'}
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Company */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Crear Nueva Empresa
                  </CardTitle>
                  <CardDescription>
                    Crea una nueva empresa con su administrador inicial
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de la Empresa
                      </label>
                      <input
                        type="text"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subdominio
                      </label>
                      <input
                        type="text"
                        value={companyForm.subdomain}
                        onChange={(e) => setCompanyForm({...companyForm, subdomain: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="empresa-ejemplo"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plan
                      </label>
                      <select
                        value={companyForm.plan_type}
                        onChange={(e) => setCompanyForm({...companyForm, plan_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="basic">Básico</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email del Administrador
                      </label>
                      <input
                        type="email"
                        value={companyForm.admin_email}
                        onChange={(e) => setCompanyForm({...companyForm, admin_email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña del Administrador
                      </label>
                      <input
                        type="password"
                        value={companyForm.admin_password}
                        onChange={(e) => setCompanyForm({...companyForm, admin_password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        minLength={8}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <Building className="h-4 w-4 mr-2" />
                      Crear Empresa
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Create User */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Crear Nuevo Usuario
                  </CardTitle>
                  <CardDescription>
                    Agrega un nuevo usuario a una empresa existente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email del Usuario
                      </label>
                      <input
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        minLength={8}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rol
                      </label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="company_admin">Administrador de Empresa</option>
                        <option value="hr_manager">HR Manager</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Empleado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa
                      </label>
                      <select
                        value={userForm.company_id}
                        onChange={(e) => setUserForm({...userForm, company_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Seleccionar empresa...</option>
                        {companies.filter(c => c.is_active).map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Crear Usuario
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  )
}

