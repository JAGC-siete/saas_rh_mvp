import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useSupabaseSession } from '../lib/hooks/useSession'
import { useEmployeeSearch } from '../lib/hooks/useEmployeeSearch'
import { Pagination } from './ui/pagination'
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react'
import EmployeeRow from './EmployeeRow'
import CertificateModal from './CertificateModal'
import AddEmployeeForm from './AddEmployeeForm'
import { Employee } from '../lib/types/employee'

interface Department {
  id: string
  name: string
}

interface WorkSchedule {
  id: string
  name: string
  monday_start?: string
  monday_end?: string
  tuesday_start?: string
  tuesday_end?: string
  wednesday_start?: string
  wednesday_end?: string
  thursday_start?: string
  thursday_end?: string
  friday_start?: string
  friday_end?: string
  saturday_start?: string
  saturday_end?: string
  sunday_start?: string
  sunday_end?: string
}

export default function EmployeeManager() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const { user } = useSupabaseSession()
  const userId = user?.id

  // Use the new employee search hook
  const {
    employees,
    loading,
    error,
    pagination,
    searchParams,
    setSearchParams,
    refreshData
  } = useEmployeeSearch()

  // Form state
  const [formData, setFormData] = useState({
    employee_code: '',
    dni: '',
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    position: '',
    base_salary: '',
    hire_date: '',
    department_id: '',
    work_schedule_id: '',
    bank_name: '',
    bank_account: '',
  })

  // Fetch departments and work schedules
  const fetchDepartmentsAndSchedules = useCallback(async () => {
    if (!userId) return

    try {
      // Get user profile first
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', userId)
        .single()

      setUserProfile(profile)
      if (!profile) return

      // Fetch departments and schedules in parallel
      const [departmentsResult, schedulesResult] = await Promise.allSettled([
        supabase
          .from('departments')
          .select('id, name')
          .eq('company_id', profile.company_id)
          .order('name'),
        supabase
          .from('work_schedules')
          .select('id, name')
          .eq('company_id', profile.company_id)
          .order('name')
      ])

      const departmentsData = departmentsResult.status === 'fulfilled' ? departmentsResult.value.data : []
      const schedulesData = schedulesResult.status === 'fulfilled' ? schedulesResult.value.data : []

      setDepartments(departmentsData || [])
      setWorkSchedules(schedulesData || [])
    } catch (error) {
      console.error('Error fetching departments and schedules:', error)
    }
  }, [userId])

  useEffect(() => {
    fetchDepartmentsAndSchedules()
  }, [fetchDepartmentsAndSchedules])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams(prev => ({ ...prev, search: e.target.value, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }))
  }

  const handleSortChange = (sortBy: string) => {
    setSearchParams(prev => ({
      ...prev,
      sort_by: sortBy,
      sort_order: prev.sort_by === sortBy && prev.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1
    }))
  }

  const handleStatusFilter = (status: string) => {
    setSearchParams(prev => ({ ...prev, status, page: 1 }))
  }

  const handleDepartmentFilter = (departmentId: string) => {
    setSearchParams(prev => ({ 
      ...prev, 
      department_id: departmentId === 'all' ? undefined : departmentId, 
      page: 1 
    }))
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (!userId) throw new Error('Usuario no autenticado')

      const { error } = await supabase
        .from('employees')
        .insert({
          ...formData,
          company_id: userProfile.company_id,
          base_salary: parseFloat(formData.base_salary),
        })

      if (error) throw error

      // Reset form
      setFormData({
        employee_code: '',
        dni: '',
        name: '',
        email: '',
        phone: '',
        role: 'employee',
        position: '',
        base_salary: '',
        hire_date: '',
        department_id: '',
        work_schedule_id: '',
        bank_name: '',
        bank_account: '',
      })
      
      setShowAddForm(false)
      refreshData()
      
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const updateEmployeeStatus = async (employeeId: string, status: string) => {
    try {
      if (!userId) throw new Error('Usuario no autenticado')

      const { error } = await supabase
        .from('employees')
        .update({ status })
        .eq('id', employeeId)

      if (error) throw error
      refreshData()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'active':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Activo</span>
      case 'inactive':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Inactivo</span>
      case 'terminated':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Terminado</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>
    }
  }

  const getAttendanceBadge = (attendance_status: string, check_in_time?: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    switch (attendance_status) {
      case 'present':
        return (
          <div className="flex flex-col">
            <span className={`${baseClasses} bg-green-100 text-green-800`}>Presente</span>
            {check_in_time && (
              <span className="text-xs text-gray-500 mt-1">
                {new Date(check_in_time).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )
      case 'late':
        return (
          <div className="flex flex-col">
            <span className={`${baseClasses} bg-orange-100 text-orange-800`}>Tardanza</span>
            {check_in_time && (
              <span className="text-xs text-gray-500 mt-1">
                {new Date(check_in_time).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )
      case 'absent':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Ausente</span>
      case 'not_registered':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Sin registro</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Desconocido</span>
    }
  }

  const exportEmployeeReport = async () => {
    try {
      const format = (document.getElementById('reportFormat') as HTMLSelectElement)?.value || 'pdf'

      const response = await fetch('/api/reports/export-employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': format === 'pdf' ? 'application/pdf' : 'text/csv'
        },
        body: JSON.stringify({
          format,
          reportType: 'employees'
        })
      })

      if (!response.ok) {
        throw new Error('Error exportando reporte')
      }

      if (format === 'pdf') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_empleados_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_empleados_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting employee report:', error)
      alert('Error al exportar el reporte')
    }
  }

  const generateWorkCertificate = async (
    employee: Employee,
    format: string,
    certificateType: string,
    purpose: string,
    additionalInfo: string
  ) => {
    try {
      const response = await fetch('/api/reports/export-work-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': format === 'pdf' ? 'application/pdf' : 'text/csv'
        },
        body: JSON.stringify({
          employeeId: employee.id,
          format,
          certificateType,
          purpose,
          additionalInfo
        })
      })

      if (!response.ok) {
        throw new Error('Error generando constancia de trabajo')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `constancia_trabajo_${employee.employee_code}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setShowCertificateModal(false)
      setSelectedEmployee(null)
    } catch (error) {
      console.error('Error generating work certificate:', error)
      alert('Error al generar la constancia de trabajo')
    }
  }

  const openCertificateModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowCertificateModal(true)
  }

  const closeCertificateModal = () => {
    setSelectedEmployee(null)
    setShowCertificateModal(false)
  }

  if (loading && employees.length === 0) {
    return <div className="flex justify-center py-8">Cargando empleados...</div>
  }

  if (error) {
    return <div className="flex justify-center py-8 text-red-600">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Empleados</h1>
          <p className="text-gray-600">Administra los miembros de tu equipo y su información</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          Agregar Empleado
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda y Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nombre, código, DNI, posición o email..."
              value={searchParams.search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={searchParams.status}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="terminated">Terminados</option>
                <option value="all">Todos</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={searchParams.department_id || 'all'}
                onChange={(e) => handleDepartmentFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los departamentos</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-gray-500" />
              <select
                value={`${searchParams.sort_by}-${searchParams.sort_order}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-')
                  setSearchParams(prev => ({
                    ...prev,
                    sort_by: sortBy,
                    sort_order: sortOrder as 'asc' | 'desc',
                    page: 1
                  }))
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name-asc">Nombre (A-Z)</option>
                <option value="name-desc">Nombre (Z-A)</option>
                <option value="employee_code-asc">Código (A-Z)</option>
                <option value="employee_code-desc">Código (Z-A)</option>
                <option value="position-asc">Posición (A-Z)</option>
                <option value="position-desc">Posición (Z-A)</option>
                <option value="base_salary-asc">Salario (Menor-Mayor)</option>
                <option value="base_salary-desc">Salario (Mayor-Menor)</option>
              </select>
            </div>

            {/* Refresh Button */}
            <Button
              onClick={refreshData}
              size="sm"
              variant="outline"
              disabled={loading}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              {loading ? 'Actualizando...' : '🔄 Actualizar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Employee Form */}
      {showAddForm && (
        <AddEmployeeForm
          formData={formData}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
          onCancel={() => setShowAddForm(false)}
          departments={departments}
          workSchedules={workSchedules}
          loading={loading}
        />
      )}

      {/* Export Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Reportes de Empleados</CardTitle>
          <CardDescription>
            Genera reportes detallados de empleados en PDF o CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formato
              </label>
              <select 
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue="pdf"
                id="reportFormat"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <Button 
              onClick={exportEmployeeReport}
              className="bg-green-600 hover:bg-green-700"
            >
              Exportar Reporte
            </Button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <strong>Reporte incluye:</strong> Lista completa de empleados, departamentos, salarios y estadísticas
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Directorio de Empleados</CardTitle>
              <CardDescription>
                {pagination.totalItems} empleados encontrados • Página {pagination.currentPage} de {pagination.totalPages}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Empleado</th>
                  <th className="text-left py-3 px-4">Posición</th>
                  <th className="text-left py-3 px-4">Departamento</th>
                  <th className="text-left py-3 px-4">Salario</th>
                  <th className="text-left py-3 px-4">Estado</th>
                  <th className="text-left py-3 px-4">Asistencia</th>
                  <th className="text-left py-3 px-4">Horario</th>
                  <th className="text-left py-3 px-4">🏆 Puntos</th>
                  <th className="text-left py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    onUpdateStatus={updateEmployeeStatus}
                    onOpenCertificateModal={openCertificateModal}
                    formatCurrency={formatCurrency}
                    getStatusBadge={getStatusBadge}
                    getAttendanceBadge={getAttendanceBadge}
                  />
                ))}
              </tbody>
            </table>

            {employees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchParams.search ? 'No se encontraron empleados que coincidan con la búsqueda.' : 'No hay empleados registrados.'}
              </div>
            )}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      {/* Modal de Constancia de Trabajo */}
      {showCertificateModal && (
        <CertificateModal
          employee={selectedEmployee}
          onClose={closeCertificateModal}
          onGenerate={generateWorkCertificate}
        />
      )}
    </div>
  )
}