import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '@supabase/auth-helpers-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

// Simple icon components as placeholders
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197V9a3 3 0 00-6 0v2.25" />
  </svg>
)

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CurrencyDollarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const CalendarDaysIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const DocumentChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  todayAttendance: number
  pendingPayrolls: number
  thisMonthLeaves: number
  avgHoursWorked: number
}

interface AttendanceTrend {
  date: string
  present: number
  absent: number
  late: number
}

export default function ReportsAndAnalytics() {
  const session = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    todayAttendance: 0,
    pendingPayrolls: 0,
    thisMonthLeaves: 0,
    avgHoursWorked: 0
  })
  const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (session?.user) {
      fetchDashboardStats()
      fetchAttendanceTrends()
    }
  }, [session, dateRange])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Total and active employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, status')
      
      if (employeesError) throw employeesError

      const totalEmployees = employees?.length || 0
      const activeEmployees = employees?.filter(emp => emp.status === 'active').length || 0

      // Today's attendance
      const today = new Date().toISOString().split('T')[0]
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('date', today)
        .not('check_in', 'is', null)

      if (attendanceError) throw attendanceError

      const todayAttendance = attendance?.length || 0

      // Pending payrolls
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payroll_records')
        .select('id')
        .eq('status', 'draft')

      if (payrollsError) throw payrollsError

      const pendingPayrolls = payrolls?.length || 0

      // This month's leave requests
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
      
      const { data: leaves, error: leavesError } = await supabase
        .from('leave_requests')
        .select('id')
        .gte('start_date', monthStart)
        .lte('end_date', monthEnd)
        .eq('status', 'approved')

      if (leavesError) throw leavesError

      const thisMonthLeaves = leaves?.length || 0

      setStats({
        totalEmployees,
        activeEmployees,
        todayAttendance,
        pendingPayrolls,
        thisMonthLeaves,
        avgHoursWorked: 8.2 // Placeholder calculation
      })

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceTrends = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('date, status, check_in')
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .order('date')

      if (error) throw error

      // Group by date and count statuses
      const trendMap = new Map<string, { present: number; absent: number; late: number }>()
      
      data?.forEach(record => {
        const date = record.date
        if (!trendMap.has(date)) {
          trendMap.set(date, { present: 0, absent: 0, late: 0 })
        }
        
        const trend = trendMap.get(date)!
        if (record.status === 'present') {
          trend.present++
        } else if (record.status === 'absent') {
          trend.absent++
        } else if (record.status === 'late') {
          trend.late++
        }
      })

      const trends = Array.from(trendMap.entries()).map(([date, counts]) => ({
        date,
        ...counts
      }))

      setAttendanceTrends(trends)
    } catch (error) {
      console.error('Error fetching attendance trends:', error)
    }
  }

  const exportReport = async (type: 'attendance' | 'payroll' | 'employees') => {
    try {
      let data, filename

      switch (type) {
        case 'attendance':
          const { data: attendanceData } = await supabase
            .from('attendance_records')
            .select(`
              date,
              check_in,
              check_out,
              status,
              late_minutes,
              employee:employees(first_name, last_name, employee_code)
            `)
            .gte('date', dateRange.startDate)
            .lte('date', dateRange.endDate)
            .order('date', { ascending: false })

          data = attendanceData
          filename = `attendance_report_${dateRange.startDate}_${dateRange.endDate}.csv`
          break

        case 'payroll':
          const { data: payrollData } = await supabase
            .from('payroll_records')
            .select(`
              period_start,
              period_end,
              gross_salary,
              net_salary,
              status,
              employee:employees(first_name, last_name, employee_code)
            `)
            .order('period_start', { ascending: false })

          data = payrollData
          filename = `payroll_report_${new Date().toISOString().split('T')[0]}.csv`
          break

        case 'employees':
          const { data: employeeData } = await supabase
            .from('employees')
            .select(`
              first_name,
              last_name,
              email,
              employee_code,
              position,
              hire_date,
              status,
              base_salary,
              department:departments(name)
            `)
            .order('first_name')

          data = employeeData
          filename = `employees_report_${new Date().toISOString().split('T')[0]}.csv`
          break
      }

      if (data && data.length > 0) {
        // Convert to CSV
        const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object')
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header]
              return typeof value === 'string' ? `"${value}"` : value
            }).join(',')
          )
        ].join('\n')

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reportes y Analítica</h2>
          <p className="text-gray-600">Análisis de datos y métricas de recursos humanos</p>
        </div>

        <div className="flex space-x-3">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{stats.activeEmployees}</h3>
              <p className="text-sm text-gray-600">Empleados Activos</p>
              <p className="text-xs text-gray-500">de {stats.totalEmployees} total</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{stats.todayAttendance}</h3>
              <p className="text-sm text-gray-600">Asistencias Hoy</p>
              <p className="text-xs text-gray-500">
                {formatPercentage(stats.todayAttendance, stats.activeEmployees)} del total
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{stats.pendingPayrolls}</h3>
              <p className="text-sm text-gray-600">Nóminas Pendientes</p>
              <p className="text-xs text-gray-500">Por procesar</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{stats.thisMonthLeaves}</h3>
              <p className="text-sm text-gray-600">Permisos Este Mes</p>
              <p className="text-xs text-gray-500">Aprobados</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance Trends */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Tendencias de Asistencia</h3>
          <ChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        
        {attendanceTrends.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2 text-sm font-medium text-gray-700">
              <div>Fecha</div>
              <div>Presentes</div>
              <div>Ausentes</div>
              <div>Tardanzas</div>
              <div>Total</div>
              <div>% Asistencia</div>
              <div>% Puntualidad</div>
            </div>
            
            {attendanceTrends.slice(-10).map((trend) => {
              const total = trend.present + trend.absent + trend.late
              const attendanceRate = total > 0 ? ((trend.present + trend.late) / total * 100).toFixed(1) : '0'
              const punctualityRate = total > 0 ? (trend.present / total * 100).toFixed(1) : '0'
              
              return (
                <div key={trend.date} className="grid grid-cols-7 gap-2 text-sm py-2 border-b border-gray-100">
                  <div>{new Date(trend.date).toLocaleDateString('es-HN')}</div>
                  <div className="text-green-600 font-medium">{trend.present}</div>
                  <div className="text-red-600 font-medium">{trend.absent}</div>
                  <div className="text-orange-600 font-medium">{trend.late}</div>
                  <div className="font-medium">{total}</div>
                  <div className={`font-medium ${parseFloat(attendanceRate) >= 90 ? 'text-green-600' : parseFloat(attendanceRate) >= 75 ? 'text-orange-600' : 'text-red-600'}`}>
                    {attendanceRate}%
                  </div>
                  <div className={`font-medium ${parseFloat(punctualityRate) >= 85 ? 'text-green-600' : parseFloat(punctualityRate) >= 70 ? 'text-orange-600' : 'text-red-600'}`}>
                    {punctualityRate}%
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay datos de asistencia para el período seleccionado
          </div>
        )}
      </Card>

      {/* Export Reports */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Exportar Reportes</h3>
            <p className="text-gray-600">Descarga reportes en formato CSV</p>
          </div>
          <DocumentChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => exportReport('attendance')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            <ClockIcon className="h-5 w-5" />
            <span>Reporte de Asistencia</span>
          </Button>
          
          <Button
            onClick={() => exportReport('payroll')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            <CurrencyDollarIcon className="h-5 w-5" />
            <span>Reporte de Nómina</span>
          </Button>
          
          <Button
            onClick={() => exportReport('employees')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            <UsersIcon className="h-5 w-5" />
            <span>Reporte de Empleados</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
