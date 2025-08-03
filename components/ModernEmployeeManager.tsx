import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ModernDashboardLayout from './ModernDashboardLayout'
import { StatsCard, MetricCard, QuickActionCard } from './ui/modern-cards'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye,
  Mail,
  Phone,
  Calendar,
  Building,
  UserCheck,
  UserX
} from 'lucide-react'

interface Employee {
  id: string
  company_id: string
  employee_code: string
  dni: string
  name: string
  email: string
  phone: string
  role: string
  position: string
  base_salary: number
  hire_date: string
  status: string
  bank_name: string
  bank_account: string
  department_id?: string
  departments?: {
    name: string
  }
}

interface Department {
  id: string
  name: string
}

export default function ModernEmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0
  })

  // Form state
  const [formData, setFormData] = useState({
    employee_code: '',
    dni: '',
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    position: '',
    base_salary: 0,
    hire_date: '',
    status: 'active',
    bank_name: '',
    bank_account: '',
    department_id: ''
  })

  useEffect(() => {
    fetchEmployees()
    fetchDepartments()
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments (name)
        `)
        .order('created_at', { ascending: false })

      if (data) {
        setEmployees(data)
        calculateStats(data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data } = await supabase
        .from('departments')
        .select('*')
        .order('name')

      if (data) {
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const calculateStats = (employeeData: Employee[]) => {
    const total = employeeData.length
    const active = employeeData.filter(emp => emp.status === 'active').length
    const inactive = total - active
    
    // Calculate new employees this month
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const newThisMonth = employeeData.filter(emp => {
      const hireDate = new Date(emp.hire_date)
      return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear
    }).length

    setStats({ total, active, inactive, newThisMonth })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('employees')
        .insert([{
          ...formData,
          company_id: userProfile?.company_id,
          base_salary: Number(formData.base_salary)
        }])

      if (!error) {
        setShowAddForm(false)
        setFormData({
          employee_code: '',
          dni: '',
          name: '',
          email: '',
          phone: '',
          role: 'employee',
          position: '',
          base_salary: 0,
          hire_date: '',
          status: 'active',
          bank_name: '',
          bank_account: '',
          department_id: ''
        })
        fetchEmployees()
      }
    } catch (error) {
      console.error('Error adding employee:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.dni.includes(searchTerm) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-400/10 text-green-400">
          <UserCheck className="w-3 h-3 mr-1" />
          Activo
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-400/10 text-red-400">
        <UserX className="w-3 h-3 mr-1" />
        Inactivo
      </span>
    )
  }

  if (loading && employees.length === 0) {
    return (
      <ModernDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400" />
        </div>
      </ModernDashboardLayout>
    )
  }

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Gestión de Empleados</h1>
            <p className="text-zinc-400 mt-1">
              Administra la información de los empleados de tu empresa
            </p>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)}
            variant="modern"
            className="h-12"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Empleado
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Empleados"
            value={stats.total}
            icon={Users}
            description="Empleados registrados en el sistema"
          />
          <StatsCard
            title="Empleados Activos"
            value={stats.active}
            icon={UserCheck}
            description={`${Math.round((stats.active / stats.total) * 100) || 0}% del total`}
          />
          <StatsCard
            title="Empleados Inactivos"
            value={stats.inactive}
            icon={UserX}
            description="Empleados dados de baja"
          />
          <StatsCard
            title="Nuevos este Mes"
            value={stats.newThisMonth}
            icon={Calendar}
            description="Contrataciones recientes"
          />
        </div>

        {/* Search and Filters */}
        <MetricCard title="Buscar Empleados">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre, código, DNI o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:border-zinc-600"
              />
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Ver todo
            </Button>
          </div>
        </MetricCard>

        {/* Add Employee Form */}
        {showAddForm && (
          <MetricCard title="Agregar Nuevo Empleado">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Código de Empleado
                  </label>
                  <Input
                    type="text"
                    name="employee_code"
                    value={formData.employee_code}
                    onChange={handleInputChange}
                    required
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    DNI
                  </label>
                  <Input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    required
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nombre Completo
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Teléfono
                  </label>
                  <Input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Posición
                  </label>
                  <Input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Salario Base
                  </label>
                  <Input
                    type="number"
                    name="base_salary"
                    value={formData.base_salary}
                    onChange={handleInputChange}
                    required
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Fecha de Contratación
                  </label>
                  <Input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleInputChange}
                    required
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Departamento
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-zinc-600 focus:outline-none"
                  >
                    <option value="">Seleccionar departamento</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button type="submit" variant="modern" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Empleado'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </MetricCard>
        )}

        {/* Employees Table */}
        <MetricCard title={`Empleados (${filteredEmployees.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Empleado</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Código</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Posición</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Departamento</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Estado</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                    <td className="py-3 px-4">
                      <div>
                        <div className="text-sm font-medium text-zinc-100">{employee.name}</div>
                        <div className="text-xs text-zinc-400 flex items-center mt-1">
                          <Mail className="h-3 w-3 mr-1" />
                          {employee.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-300">
                      {employee.employee_code}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-300">
                      {employee.position}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-300">
                      {employee.departments?.name || 'Sin asignar'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {getStatusBadge(employee.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MetricCard>
      </div>
    </ModernDashboardLayout>
  )
}
