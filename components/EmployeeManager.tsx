import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useSupabaseSession } from '../lib/hooks/useSession'
import EmployeeSearch from './EmployeeSearch'
import AddEmployeeForm from './AddEmployeeForm'
import EmployeeTable from './EmployeeTable'
import CertificateModal, { CertificateModalHandles } from './CertificateModal'
import type { Employee, Department, WorkSchedule } from './employeeTypes'

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)

  const { user } = useSupabaseSession()
  const userId = user?.id

  const certificateModalRef = useRef<CertificateModalHandles>(null)

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
      if (!userId) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setUserProfile(profile)

      if (!profile) return

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          *,
          work_schedules!inner(start_time, end_time)
        `)
        .eq('company_id', profile.company_id)
        .eq('status', 'active')
        .order('name')

      if (employeesError) throw employeesError

      const today = new Date().toISOString().split('T')[0]
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('employee_id, check_in, check_out, status')
        .eq('date', today)

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError)
      }

      const { data: gamificationData } = await supabase
        .from('employee_scores')
        .select('employee_id, total_points, weekly_points, monthly_points')

      const { data: achievementsData } = await supabase
        .from('employee_achievements')
        .select('employee_id, count')
        .group('employee_id')

      const employeesWithAttendance = (employeesData || []).map((emp: any) => {
        const attendance = attendanceData?.find((att: any) => att.employee_id === emp.id)
        const workSchedule = emp.work_schedules?.[0]
        const gamification = gamificationData?.find((g: any) => g.employee_id === emp.id)
        const achievements = achievementsData?.find((a: any) => a.employee_id === emp.id)

        let attendance_status: 'present' | 'absent' | 'late' | 'not_registered' = 'not_registered'
        let check_in_time = undefined
        let check_out_time = undefined

        if (attendance) {
          if (attendance.check_in) {
            check_in_time = attendance.check_in
            const checkInHour = new Date(attendance.check_in).getHours()
            const checkInMinutes = new Date(attendance.check_in).getMinutes()

            if (checkInHour > 8 || (checkInHour === 8 && checkInMinutes > 15)) {
              attendance_status = 'late'
            } else {
              attendance_status = 'present'
            }
          } else if (attendance.status === 'absent') {
            attendance_status = 'absent'
          }
        }

        return {
          ...emp,
          attendance_status,
          check_in_time,
          check_out_time,
          work_schedule: workSchedule,
          gamification: gamification ? {
            total_points: gamification.total_points || 0,
            weekly_points: gamification.weekly_points || 0,
            monthly_points: gamification.monthly_points || 0,
            achievements_count: achievements?.count || 0
          } : {
            total_points: 0,
            weekly_points: 0,
            monthly_points: 0,
            achievements_count: 0
          }
        }
      })

      setEmployees(employeesWithAttendance)

      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name')

      if (deptError) throw deptError
      setDepartments(departmentsData || [])

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

  const openCertificateModal = (employee: Employee) => {
    certificateModalRef.current?.open(employee)
  }

  if (loading && employees.length === 0) {
    return <div className="flex justify-center py-8">Loading employees...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage your team members and their information</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          Add Employee
        </Button>
      </div>

      <EmployeeSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {showAddForm && (
        <AddEmployeeForm
          formData={formData}
          setFormData={setFormData}
          loading={loading}
          onSubmit={handleSubmit}
          departments={departments}
          workSchedules={workSchedules}
          onCancel={() => setShowAddForm(false)}
        />
      )}

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

      <EmployeeTable
        employees={filteredEmployees}
        totalCount={employees.length}
        searchTerm={searchTerm}
        departments={departments}
        formatCurrency={formatCurrency}
        getStatusBadge={getStatusBadge}
        getAttendanceBadge={getAttendanceBadge}
        openCertificateModal={openCertificateModal}
        updateEmployeeStatus={updateEmployeeStatus}
        fetchData={fetchData}
      />

      <CertificateModal ref={certificateModalRef} />
    </div>
  )
}
