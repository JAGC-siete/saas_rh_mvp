

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useSupabaseSession } from '../lib/hooks/useSession'

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
}

interface Department {
  id: string
  name: string
}

interface WorkSchedule {
  id: string
  name: string
}

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [certificateLoading, setCertificateLoading] = useState(false)

  const { user } = useSupabaseSession()
  const userId = user?.id

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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Get user profile
      if (!userId) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setUserProfile(profile)

      if (!profile) return

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name')

      if (employeesError) throw employeesError
      setEmployees(employeesData || [])

      // Fetch departments
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name')

      if (deptError) throw deptError
      setDepartments(departmentsData || [])

      // Fetch work schedules
      const { data: schedulesData, error: schedError } = await supabase
        .from('work_schedules')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name')

      if (schedError) throw schedError
      setWorkSchedules(schedulesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!userId) throw new Error('User not authenticated')

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
      fetchData()
      
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const updateEmployeeStatus = async (employeeId: string, status: string) => {
    try {
      if (!userId) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('employees')
        .update({ status })
        .eq('id', employeeId)

      if (error) throw error
      fetchData()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.dni.includes(searchTerm) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Active</span>
      case 'inactive':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Inactive</span>
      case 'terminated':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Terminated</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>
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

  const generateWorkCertificate = async (employee: Employee) => {
    try {
      setCertificateLoading(true)
      
      const format = (document.getElementById('certificateFormat') as HTMLSelectElement)?.value || 'pdf'
      const certificateType = (document.getElementById('certificateType') as HTMLSelectElement)?.value || 'general'
      const purpose = (document.getElementById('certificatePurpose') as HTMLInputElement)?.value || 'Constancia de trabajo'
      const additionalInfo = (document.getElementById('certificateAdditionalInfo') as HTMLTextAreaElement)?.value || ''

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

      if (format === 'pdf') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `constancia_trabajo_${employee.employee_code}_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `constancia_trabajo_${employee.employee_code}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      setShowCertificateModal(false)
      setSelectedEmployee(null)
    } catch (error) {
      console.error('Error generating work certificate:', error)
      alert('Error al generar la constancia de trabajo')
    } finally {
      setCertificateLoading(false)
    }
  }

  const openCertificateModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowCertificateModal(true)
  }

  if (loading && employees.length === 0) {
    return <div className="flex justify-center py-8">Loading employees...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage your team members and their information</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <Input
            type="text"
            placeholder="Search employees by name, code, DNI, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Add Employee Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Employee</CardTitle>
            <CardDescription>Enter the employee&apos;s information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Code
                </label>
                <Input
                  value={formData.employee_code}
                  onChange={(e) => setFormData({...formData, employee_code: e.target.value})}
                  placeholder="EMP001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DNI
                </label>
                <Input
                  value={formData.dni}
                  onChange={(e) => setFormData({...formData, dni: e.target.value})}
                  placeholder="0801-1990-12345"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+504 9999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  placeholder="Software Developer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {/* eslint-disable-next-line react/jsx-key */}
                  {departments.map((dept, index) => (
                    <option key={`dept-${index}`} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Schedule
                </label>
                <select
                  value={formData.work_schedule_id}
                  onChange={(e) => setFormData({...formData, work_schedule_id: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Schedule</option>
                  {/* eslint-disable-next-line react/jsx-key */}
                  {workSchedules.map((schedule, index) => (
                    <option key={`schedule-${index}`} value={schedule.id}>{schedule.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Salary (HNL)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.base_salary}
                  onChange={(e) => setFormData({...formData, base_salary: e.target.value})}
                  placeholder="25000.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hire Date
                </label>
                <Input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                  placeholder="Banco Atlántida"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Account
                </label>
                <Input
                  value={formData.bank_account}
                  onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                  placeholder="12345678901"
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Employee'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>
            {filteredEmployees.length} of {employees.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Employee</th>
                  <th className="text-left py-3 px-4">Position</th>
                  <th className="text-left py-3 px-4">Department</th>
                  <th className="text-left py-3 px-4">Salary</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line react/jsx-key */}
                {filteredEmployees.map((employee, index) => (
                  <tr key={`employee-${index}`} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-gray-500">
                          {employee.employee_code} • DNI: {employee.dni}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email} • {employee.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{employee.position}</div>
                      <div className="text-sm text-gray-500 capitalize">{employee.role}</div>
                    </td>
                    <td className="py-3 px-4">
                      {employee.department_id ? 
                        departments.find(d => d.id === employee.department_id)?.name || 'No Department' 
                        : 'No Department'
                      }
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {formatCurrency(employee.base_salary)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(employee.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCertificateModal(employee)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        >
                          📄 Constancia
                        </Button>
                        {employee.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateEmployeeStatus(employee.id, 'inactive')}
                          >
                            Deactivate
                          </Button>
                        )}
                        {employee.status === 'inactive' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateEmployeeStatus(employee.id, 'active')}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No employees found matching your search.' : 'No employees added yet.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Constancia de Trabajo */}
      {showCertificateModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Generar Constancia de Trabajo</h3>
              <button
                onClick={() => {
                  setShowCertificateModal(false)
                  setSelectedEmployee(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Empleado:</strong> {selectedEmployee.name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Código:</strong> {selectedEmployee.employee_code}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formato
                </label>
                <select
                  id="certificateFormat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="pdf"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Constancia
                </label>
                <select
                  id="certificateType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="general"
                >
                  <option value="general">General</option>
                  <option value="salario">Salario</option>
                  <option value="antiguedad">Antigüedad</option>
                  <option value="buena_conducta">Buena Conducta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Propósito
                </label>
                <input
                  type="text"
                  id="certificatePurpose"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Constancia de trabajo"
                  defaultValue="Constancia de trabajo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Información Adicional (opcional)
                </label>
                <textarea
                  id="certificateAdditionalInfo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Información adicional que desee incluir..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => generateWorkCertificate(selectedEmployee)}
                  disabled={certificateLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {certificateLoading ? 'Generando...' : 'Generar Constancia'}
                </Button>
                <Button
                  onClick={() => {
                    setShowCertificateModal(false)
                    setSelectedEmployee(null)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
