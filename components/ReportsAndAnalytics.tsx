import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '@supabase/auth-helpers-react'
import { useCompanyContext } from '../lib/useCompanyContext'
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
}

interface AttendanceTrend {
  date: string
  present: number
  absent: number
  late: number
}

const INITIAL_STATS: DashboardStats = {
  totalEmployees: 0,
  activeEmployees: 0,
  todayAttendance: 0,
  pendingPayrolls: 0,
  thisMonthLeaves: 0
}

const ATTENDANCE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  punctuality: {
    excellent: 85,
    good: 70
  }
} as const

const getCurrentMonthRange = () => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { monthStart, monthEnd }
}

const getTodayDate = () => new Date().toISOString().split('T')[0]

export default function ReportsAndAnalytics() {
  const session = useSession()
  const { companyId, loading: companyLoading } = useCompanyContext()
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS)
  const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  // Memoized values
  const today = useMemo(() => getTodayDate(), [])
  const { monthStart, monthEnd } = useMemo(() => getCurrentMonthRange(), [])

  const fetchDashboardStats = useCallback(async () => {
    if (!companyId) {
      console.log('⚠️ No company ID available, skipping fetch')
      return
    }
    
    try {
      setLoading(true)
      console.log('📊 Fetching dashboard stats for company:', companyId)
      
      // Total and active employees - FILTRADO POR COMPANY
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, status')
        .eq('company_id', companyId)
      
      if (employeesError) throw employeesError

      const totalEmployees = employees?.length || 0
      const activeEmployees = employees?.filter((emp: any) => emp.status === 'active').length || 0
      console.log('👥 Employees found:', totalEmployees, 'active:', activeEmployees)

      // Today's attendance - FILTRADO POR COMPANY
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('date', today)
        .eq('company_id', companyId)
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
        thisMonthLeaves
      })

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }, [today, monthStart, monthEnd, companyId]) // Agregar companyId

  const fetchAttendanceTrends = useCallback(async () => {
    if (!companyId) return
    
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('date, status, check_in')
        .eq('company_id', companyId) // Filtrar por company
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .order('date')

      if (error) throw error

      // Group by date and count statuses
      const trendMap = new Map<string, { present: number; absent: number; late: number }>()
      
      data?.forEach((record: any) => {
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
  }, [dateRange.startDate, dateRange.endDate, companyId]) // Agregar companyId como dependencia

  useEffect(() => {
    if (session?.user && companyId && !companyLoading) {
      console.log('🔄 Refreshing dashboard for company:', companyId)
      fetchDashboardStats()
      fetchAttendanceTrends()
    }
  }, [session, companyId, companyLoading, fetchDashboardStats, fetchAttendanceTrends])

  const downloadCSV = useCallback((data: any[], filename: string) => {
    if (data && data.length > 0) {
      // Convert to CSV
      const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object')
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => 
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
  }, [])

  const exportReport = useCallback(async (type: 'attendance' | 'payroll' | 'employees') => {
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
          filename = `payroll_report_${today}.csv`
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
            .eq('company_id', companyId) // Filtrar por company
            .order('first_name')

          data = employeeData
          filename = `employees_report_${today}.csv`
          break
      }

      // Ensure data is not null before downloading
      if (data && data.length > 0) {
        downloadCSV(data, filename)
      } else {
        console.warn('No data to export')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }, [dateRange.startDate, dateRange.endDate, today, companyId, downloadCSV]) // Agregar companyId

  const formatPercentage = useCallback((value: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }, [])

  const getAttendanceColor = useCallback((rate: number, type: 'attendance' | 'punctuality' = 'attendance') => {
    const thresholds = type === 'punctuality' ? ATTENDANCE_THRESHOLDS.punctuality : ATTENDANCE_THRESHOLDS
    if (rate >= thresholds.excellent) return 'text-emerald-400'
    if (rate >= thresholds.good) return 'text-orange-400'
    return 'text-red-400'
  }, [])

  const handleDateRangeChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }, [])

  const recentTrends = useMemo(() => 
    attendanceTrends.slice(-10),
    [attendanceTrends]
  )

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
          <h2 className="text-xl font-semibold text-white">Reportes y Analítica</h2>
          <p className="text-gray-300">Análisis de datos y métricas de recursos humanos</p>
        </div>

        <div className="flex space-x-3">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
            className="px-3 py-2 border border-white/20 bg-white/10 rounded-md text-sm text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
            className="px-3 py-2 border border-white/20 bg-white/10 rounded-md text-sm text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-brand-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-white">{stats.activeEmployees}</h3>
              <p className="text-sm text-gray-300">Empleados Activos</p>
              <p className="text-xs text-gray-400">de {stats.totalEmployees} total</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-white">{stats.todayAttendance}</h3>
              <p className="text-sm text-gray-300">Asistencias Hoy</p>
              <p className="text-xs text-gray-400">
                {formatPercentage(stats.todayAttendance, stats.activeEmployees)} del total
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-orange-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-white">{stats.pendingPayrolls}</h3>
              <p className="text-sm text-gray-300">Nóminas Pendientes</p>
              <p className="text-xs text-gray-400">Por procesar</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-8 w-8 text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-white">{stats.thisMonthLeaves}</h3>
              <p className="text-sm text-gray-300">Permisos Este Mes</p>
              <p className="text-xs text-gray-400">Aprobados</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance Trends */}
      <Card variant="glass" className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Tendencias de Asistencia</h3>
          <ChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        
        {recentTrends.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2 text-sm font-medium text-gray-300">
              <div>Fecha</div>
              <div>Presentes</div>
              <div>Ausentes</div>
              <div>Tardanzas</div>
              <div>Total</div>
              <div>% Asistencia</div>
              <div>% Puntualidad</div>
            </div>
            
            {recentTrends.map((trend) => {
              const total = trend.present + trend.absent + trend.late
              const attendanceRate = total > 0 ? ((trend.present + trend.late) / total * 100) : 0
              const punctualityRate = total > 0 ? (trend.present / total * 100) : 0
              
              return (
                <div key={trend.date} className="grid grid-cols-7 gap-2 text-sm py-2 border-b border-white/10">
                  <div className="text-gray-300">{new Date(trend.date).toLocaleDateString('es-HN')}</div>
                  <div className="text-emerald-400 font-medium">{trend.present}</div>
                  <div className="text-red-400 font-medium">{trend.absent}</div>
                  <div className="text-orange-400 font-medium">{trend.late}</div>
                  <div className="font-medium text-white">{total}</div>
                  <div className={`font-medium ${getAttendanceColor(attendanceRate)}`}>
                    {attendanceRate.toFixed(1)}%
                  </div>
                  <div className={`font-medium ${getAttendanceColor(punctualityRate, 'punctuality')}`}>
                    {punctualityRate.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No hay datos de asistencia para el período seleccionado
          </div>
        )}
      </Card>

      {/* Export Reports */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Exportar Reportes</h3>
            <p className="text-gray-300">Descarga reportes en formato CSV</p>
          </div>
          <DocumentChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => exportReport('attendance')}
            variant="outline"
            className="flex items-center justify-center space-x-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <ClockIcon className="h-5 w-5" />
            <span>Reporte de Asistencia</span>
          </Button>
          
          <Button
            onClick={() => exportReport('payroll')}
            variant="outline"
            className="flex items-center justify-center space-x-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <CurrencyDollarIcon className="h-5 w-5" />
            <span>Reporte de Nómina</span>
          </Button>
          
          <Button
            onClick={() => exportReport('employees')}
            variant="outline"
            className="flex items-center justify-center space-x-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <UsersIcon className="h-5 w-5" />
            <span>Reporte de Empleados</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
