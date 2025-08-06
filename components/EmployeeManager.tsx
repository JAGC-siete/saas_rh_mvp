import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useSupabaseSession } from '../lib/hooks/useSession'
import { debounce } from 'lodash'
import EmployeeRow from './EmployeeRow'
import CertificateModal from './CertificateModal'
import EmployeeSearch from './EmployeeSearch'
import AddEmployeeForm from './AddEmployeeForm'

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
  department_name?: string
  attendance_status?: 'present' | 'absent' | 'late' | 'not_registered'
  check_in_time?: string
  check_out_time?: string
  work_schedule?: {
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
  gamification?: {
    total_points: number
    weekly_points: number
    monthly_points: number
    achievements_count: number
  }
}

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
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

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

  const fetchData = useCallback(async (searchTerm = '') => {
    setLoading(true)
    try {
      if (!userId) return;

      // Get user profile first
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', userId)
        .single()

      setUserProfile(profile)
      if (!profile) return;

      // Build optimized employees query with minimal data first
      let employeesQuery = supabase
        .from('employees')
        .select(`
          id,
          employee_code,
          dni,
          name,
          email,
          phone,
          role,
          position,
          base_salary,
          hire_date,
          status,
          bank_name,
          bank_account,
          department_id,
          work_schedule_id,
          departments(name),
          work_schedules(id, name, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end, saturday_start, saturday_end, sunday_start, sunday_end)
        `)
        .eq('company_id', profile.company_id)
        .order('name')
        .limit(50); // Reduced limit for faster initial load

      if (searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`
        employeesQuery = employeesQuery.or(
          `name.ilike.${searchPattern},employee_code.ilike.${searchPattern},dni.ilike.${searchPattern},position.ilike.${searchPattern}`
        )
      }
      
      const { data: employeesData, error: employeesError } = await employeesQuery;
      if (employeesError) throw employeesError

      if (!employeesData || employeesData.length === 0) {
        setEmployees([])
        setDepartments([])
        setWorkSchedules([])
        return
      }

      // Show basic employee data immediately
      const basicEmployees = employeesData.map((emp: any) => ({
        ...emp,
        department_name: emp.departments?.name || 'N/A',
        attendance_status: 'not_registered' as const,
        work_schedule: emp.work_schedules,
        gamification: {
          total_points: 0,
          weekly_points: 0,
          monthly_points: 0,
          achievements_count: 0
        }
      }))
      
      setEmployees(basicEmployees)

      // Load additional data in parallel (non-blocking)
      const employeeIds = employeesData.map((e: any) => e.id)
      const today = new Date().toISOString().split('T')[0]

      Promise.allSettled([
        supabase
          .from('attendance_records')
          .select('employee_id, check_in, check_out, status')
          .in('employee_id', employeeIds)
          .eq('date', today),
        supabase
          .from('employee_scores')
          .select('employee_id, total_points, weekly_points, monthly_points')
          .in('employee_id', employeeIds),
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
      ]).then(([attendanceResult, gamificationResult, departmentsResult, schedulesResult]) => {
        // Extract data with fallbacks
        const attendanceData = attendanceResult.status === 'fulfilled' ? attendanceResult.value.data : []
        const gamificationData = gamificationResult.status === 'fulfilled' ? gamificationResult.value.data : []
        const departmentsData = departmentsResult.status === 'fulfilled' ? departmentsResult.value.data : []
        const schedulesData = schedulesResult.status === 'fulfilled' ? schedulesResult.value.data : []

        // Update employees with attendance and gamification data
        const employeesWithDetails = employeesData.map((emp: any) => {
          const attendance = attendanceData?.find((att: any) => att.employee_id === emp.id)
          const gamification = gamificationData?.find((g: any) => g.employee_id === emp.id)
          
          let attendance_status: 'present' | 'absent' | 'late' | 'not_registered' = 'not_registered'
          let check_in_time = undefined

          if (attendance) {
            if (attendance.check_in) {
              check_in_time = attendance.check_in
              const checkInTime = new Date(attendance.check_in)
              
              // Get day of week (0=Sunday, 1=Monday, etc.)
              const dayOfWeek = checkInTime.getDay()
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
              const dayName = dayNames[dayOfWeek]
              
              // Get expected start time for the day
              const expectedStartTime = emp.work_schedules?.[`${dayName}_start`]
              
              let isLate = false
              if (expectedStartTime) {
                const [expectedHour, expectedMin] = expectedStartTime.split(':').map(Number)
                const expectedMinutes = expectedHour * 60 + expectedMin
                const actualMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes()
                // 5 minute tolerance
                isLate = actualMinutes > (expectedMinutes + 5)
              }
              attendance_status = isLate ? 'late' : 'present'
            } else if (attendance.status === 'absent') {
              attendance_status = 'absent'
            }
          }

          return {
            ...emp,
            department_name: emp.departments?.name || 'N/A',
            attendance_status,
            check_in_time,
            work_schedule: emp.work_schedules,
            gamification: {
              total_points: gamification?.total_points || 0,
              weekly_points: gamification?.weekly_points || 0,
              monthly_points: gamification?.monthly_points || 0,
              achievements_count: 0 // Simplified for performance
            }
          }
        })

        // Update state with detailed data
        setEmployees(employeesWithDetails)
        setDepartments(departmentsData || [])
        setWorkSchedules(schedulesData || [])
      }).catch(error => {
        console.error('Error loading additional data:', error)
        // Keep basic data if additional queries fail
      })

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId]);

  const debouncedFetchData = useCallback(
    debounce((term: string) => fetchData(term), 300), 
    [fetchData]
  );

  useEffect(() => {
    if (userId) {
      // Load immediately on mount without debounce
      if (searchTerm === '') {
        fetchData('');
      } else {
        // Only use debounce for search
        debouncedFetchData(searchTerm);
      }
    }
    return () => {
      debouncedFetchData.cancel();
    };
  }, [searchTerm, userId, fetchData, debouncedFetchData]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
      fetchData(searchTerm)
      
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
      fetchData(searchTerm)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const filteredEmployees = employees;

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

      {/* Search */}
      <EmployeeSearch searchTerm={searchTerm} onSearchChange={handleSearchChange} />

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
                {filteredEmployees.length} de {employees.length} empleados encontrados
              </CardDescription>
            </div>
            <Button
              onClick={() => fetchData(searchTerm)}
              size="sm"
              variant="outline"
              disabled={loading}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              {loading ? 'Actualizando...' : '🔄 Actualizar'}
            </Button>
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
                {filteredEmployees.map((employee) => (
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

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No se encontraron empleados que coincidan con la búsqueda.' : 'No hay empleados registrados.'}
              </div>
            )}
          </div>
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