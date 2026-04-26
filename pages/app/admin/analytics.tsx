import { useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { BarChart3, Receipt, TrendingUp, Trophy, FileText, Clock } from 'lucide-react'
import { formatDateOnlyForHonduras } from '../../../lib/timezone'

interface PayrollRun {
  id: string
  company_id: string
  company_name: string
  year: number
  month: number
  quincena: number
  tipo: string
  status: string
  employee_count: number
  total_gross: number
  total_net: number
  created_at: string
  updated_at: string
}

interface PayrollRecord {
  id: string
  employee_id: string
  employee_name: string
  employee_code: string
  company_id: string
  company_name: string
  period_start: string
  period_end: string
  period_type: string
  gross_salary: number
  total_deductions: number
  net_salary: number
  status: string
  paid_at: string | null
  created_at: string
}

interface Company {
  id: string
  name: string
}

interface GamificationScore {
  id: string
  employee_id: string
  employee_name: string
  employee_code: string
  company_id: string
  company_name: string
  total_points: number
  weekly_points: number
  monthly_points: number
  achievements_count: number
  rank: number
  punctuality_streak?: number
}

interface LeaveRequest {
  id: string
  employee_name: string
  company_name: string
  leave_type_name: string
  leave_type_color: string
  start_date: string
  end_date: string
  days_requested: number
  status: string
  reason: string
}

interface AttendanceRecord {
  id: string
  employee_id: string
  employee_name: string
  employee_code: string
  company_id: string | null
  company_name: string
  date: string
  check_in: string | null
  check_out: string | null
  late_minutes: number
  status: string
}

export default function AnalyticsPage() {
  const { addNotification } = useNotificationContext()
  const [activeTab, setActiveTab] = useState<'runs' | 'records' | 'gamification' | 'leave' | 'attendance'>('runs')

  // Gamification state
  const [scores, setScores] = useState<GamificationScore[]>([])
  const [loadingScores, setLoadingScores] = useState(true)
  const [scoresError, setScoresError] = useState<string | null>(null)
  const [scoresFilters, setScoresFilters] = useState({
    company_id: '',
    min_points: ''
  })
  const [scoresPage, setScoresPage] = useState(1)
  const [scoresTotal, setScoresTotal] = useState(0)

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loadingLeaveRequests, setLoadingLeaveRequests] = useState(true)
  const [leaveRequestsError, setLeaveRequestsError] = useState<string | null>(null)
  const [leaveFilters, setLeaveFilters] = useState({
    company_id: '',
    status: '',
    start_date: '',
    end_date: ''
  })
  const [leavePage, setLeavePage] = useState(1)
  const [leaveTotal, setLeaveTotal] = useState(0)
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null)

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(true)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)
  const [attendanceFilters, setAttendanceFilters] = useState({
    company_id: '',
    status: '',
    start_date: '',
    end_date: ''
  })
  const [attendancePage, setAttendancePage] = useState(1)
  const [attendanceTotal, setAttendanceTotal] = useState(0)

  // Payroll Runs state
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [runsFilters, setRunsFilters] = useState({
    company_id: '',
    year: new Date().getFullYear().toString(),
    month: '',
    status: ''
  })
  const [runsPage, setRunsPage] = useState(1)
  const [runsTotal, setRunsTotal] = useState(0)

  // Payroll Records state
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [recordsFilters, setRecordsFilters] = useState({
    company_id: '',
    employee_id: '',
    start_date: '',
    end_date: '',
    status: ''
  })
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsTotal, setRecordsTotal] = useState(0)

  // Companies for filters
  const [companies, setCompanies] = useState<Company[]>([])

  const tabs = [
    { id: 'runs' as const, name: 'Ejecuciones de Nómina', icon: BarChart3 },
    { id: 'records' as const, name: 'Historial de Nómina', icon: Receipt },
    { id: 'gamification' as const, name: 'Gamificación', icon: Trophy },
    { id: 'leave' as const, name: 'Solicitudes de Permisos', icon: FileText },
    { id: 'attendance' as const, name: 'Asistencia', icon: Clock }
  ]

  // Load companies for filters
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch('/api/admin/companies', { credentials: 'include' })
        if (!res.ok) throw new Error('Error cargando empresas')
        const data = await res.json()
        setCompanies(data.companies || [])
      } catch (err: any) {
        console.error('Error loading companies:', err)
      }
    }
    loadCompanies()
  }, [])

  // Load payroll runs
  useEffect(() => {
    if (activeTab !== 'runs') return
    const loadRuns = async () => {
      try {
        setLoadingRuns(true)
        setRunsError(null)
        const params = new URLSearchParams()
        if (runsFilters.company_id) params.set('company_id', runsFilters.company_id)
        if (runsFilters.year) params.set('year', runsFilters.year)
        if (runsFilters.month) params.set('month', runsFilters.month)
        if (runsFilters.status) params.set('status', runsFilters.status)
        params.set('page', String(runsPage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/analytics/payroll-runs?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando ejecuciones de nómina')
        const data = await res.json()
        setRuns(data.data || [])
        setRunsTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setRunsError(err.message || 'Error cargando ejecuciones')
      } finally {
        setLoadingRuns(false)
      }
    }
    loadRuns()
  }, [activeTab, runsFilters, runsPage])

  // Load payroll records
  useEffect(() => {
    if (activeTab !== 'records') return
    const loadRecords = async () => {
      try {
        setLoadingRecords(true)
        setRecordsError(null)
        const params = new URLSearchParams()
        if (recordsFilters.company_id) params.set('company_id', recordsFilters.company_id)
        if (recordsFilters.employee_id) params.set('employee_id', recordsFilters.employee_id)
        if (recordsFilters.start_date) params.set('start_date', recordsFilters.start_date)
        if (recordsFilters.end_date) params.set('end_date', recordsFilters.end_date)
        if (recordsFilters.status) params.set('status', recordsFilters.status)
        params.set('page', String(recordsPage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/analytics/payroll-records?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando historial de nómina')
        const data = await res.json()
        setRecords(data.data || [])
        setRecordsTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setRecordsError(err.message || 'Error cargando historial')
      } finally {
        setLoadingRecords(false)
      }
    }
    loadRecords()
  }, [activeTab, recordsFilters, recordsPage])

  // Load gamification scores
  useEffect(() => {
    if (activeTab !== 'gamification') return
    const loadScores = async () => {
      try {
        setLoadingScores(true)
        setScoresError(null)
        const params = new URLSearchParams()
        if (scoresFilters.company_id) params.set('company_id', scoresFilters.company_id)
        if (scoresFilters.min_points) params.set('min_points', scoresFilters.min_points)
        params.set('page', String(scoresPage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/analytics/gamification/scores?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando scores de gamificación')
        const data = await res.json()
        setScores(data.data || [])
        setScoresTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setScoresError(err.message || 'Error cargando scores')
      } finally {
        setLoadingScores(false)
      }
    }
    loadScores()
  }, [activeTab, scoresFilters, scoresPage])

  // Load leave requests
  useEffect(() => {
    if (activeTab !== 'leave') return
    const loadLeaveRequests = async () => {
      try {
        setLoadingLeaveRequests(true)
        setLeaveRequestsError(null)
        const params = new URLSearchParams()
        if (leaveFilters.company_id) params.set('company_id', leaveFilters.company_id)
        if (leaveFilters.status) params.set('status', leaveFilters.status)
        if (leaveFilters.start_date) params.set('start_date', leaveFilters.start_date)
        if (leaveFilters.end_date) params.set('end_date', leaveFilters.end_date)
        params.set('page', String(leavePage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/analytics/leave-requests?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando solicitudes de permisos')
        const data = await res.json()
        setLeaveRequests(data.data || [])
        setLeaveTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setLeaveRequestsError(err.message || 'Error cargando solicitudes')
      } finally {
        setLoadingLeaveRequests(false)
      }
    }
    loadLeaveRequests()
  }, [activeTab, leaveFilters, leavePage])

  // Load attendance records
  useEffect(() => {
    if (activeTab !== 'attendance') return
    const loadAttendance = async () => {
      try {
        setLoadingAttendance(true)
        setAttendanceError(null)
        const params = new URLSearchParams()
        if (attendanceFilters.company_id) params.set('company_id', attendanceFilters.company_id)
        if (attendanceFilters.status) params.set('status', attendanceFilters.status)
        if (attendanceFilters.start_date) params.set('start_date', attendanceFilters.start_date)
        if (attendanceFilters.end_date) params.set('end_date', attendanceFilters.end_date)
        params.set('page', String(attendancePage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/analytics/attendance?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando registros de asistencia')
        const data = await res.json()
        setAttendance(data.data || [])
        setAttendanceTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setAttendanceError(err.message || 'Error cargando asistencia')
      } finally {
        setLoadingAttendance(false)
      }
    }
    loadAttendance()
  }, [activeTab, attendanceFilters, attendancePage])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return formatDateOnlyForHonduras(dateStr)
    }
    return new Date(dateStr).toLocaleDateString('es-HN', {
      timeZone: 'America/Tegucigalpa',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500/20 text-gray-300',
      edited: 'bg-yellow-500/20 text-yellow-300',
      authorized: 'bg-blue-500/20 text-blue-300',
      distributed: 'bg-green-500/20 text-green-300',
      paid: 'bg-green-500/20 text-green-300',
      pending: 'bg-yellow-500/20 text-yellow-300',
      rejected: 'bg-red-500/20 text-red-300',
      present: 'bg-green-500/20 text-green-300',
      absent: 'bg-red-500/20 text-red-300',
      late: 'bg-yellow-500/20 text-yellow-300'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
        {status}
      </span>
    )
  }

  const handleApproveLeave = async (requestId: string) => {
    try {
      setProcessingLeaveId(requestId)
      const res = await fetch('/api/admin/analytics/leave-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: requestId, status: 'approved' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error aprobando solicitud')
      addNotification({ type: 'success', title: 'Solicitud aprobada', message: 'La solicitud fue aprobada exitosamente' })
      setLeaveRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r))
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudo aprobar' })
    } finally {
      setProcessingLeaveId(null)
    }
  }

  const handleRejectLeave = async (requestId: string) => {
    const reason = prompt('Razón del rechazo:')
    if (!reason) return
    try {
      setProcessingLeaveId(requestId)
      const res = await fetch('/api/admin/analytics/leave-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: requestId, status: 'rejected', rejection_reason: reason })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error rechazando solicitud')
      addNotification({ type: 'success', title: 'Solicitud rechazada', message: 'La solicitud fue rechazada' })
      setLeaveRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r))
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudo rechazar' })
    } finally {
      setProcessingLeaveId(null)
    }
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    return new Date(timeStr).toLocaleTimeString('es-HN', {
      timeZone: 'America/Tegucigalpa',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMonthName = (month: number) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return months[month - 1] || month
  }

  return (
    <>
      <Head>
        <title>Estadísticas - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            {/* Header */}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Analytics globales</p>
              <h1 className="text-3xl font-semibold text-white">Estadísticas</h1>
              <p className="text-white/70">Métricas y análisis de nómina del sistema</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/20">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-amber-400 text-white'
                          : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Payroll Runs Tab */}
            {activeTab === 'runs' && (
              <div className="space-y-4">
                {/* Filters */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Empresa</label>
                        <select
                          value={runsFilters.company_id}
                          onChange={(e) => setRunsFilters({ ...runsFilters, company_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todas</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Año</label>
                        <input
                          type="number"
                          value={runsFilters.year}
                          onChange={(e) => setRunsFilters({ ...runsFilters, year: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                          placeholder="2025"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Mes</label>
                        <select
                          value={runsFilters.month}
                          onChange={(e) => setRunsFilters({ ...runsFilters, month: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todos</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>{getMonthName(m)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Estado</label>
                        <select
                          value={runsFilters.status}
                          onChange={(e) => setRunsFilters({ ...runsFilters, status: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todos</option>
                          <option value="draft">Draft</option>
                          <option value="edited">Edited</option>
                          <option value="authorized">Authorized</option>
                          <option value="distributed">Distributed</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Ejecuciones de Nómina ({runsTotal} registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingRuns ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : runsError ? (
                      <div className="text-center py-8 text-red-400">{runsError}</div>
                    ) : runs.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay ejecuciones de nómina</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Empresa</th>
                              <th className="text-left py-3 px-2">Período</th>
                              <th className="text-center py-3 px-2">Q</th>
                              <th className="text-center py-3 px-2">Tipo</th>
                              <th className="text-center py-3 px-2">Estado</th>
                              <th className="text-right py-3 px-2">Empleados</th>
                              <th className="text-right py-3 px-2">Total Bruto</th>
                              <th className="text-right py-3 px-2">Total Neto</th>
                              <th className="text-left py-3 px-2">Creado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {runs.map((run) => (
                              <tr key={run.id} className="border-b border-white/10">
                                <td className="py-3 px-2">{run.company_name}</td>
                                <td className="py-3 px-2">{getMonthName(run.month)} {run.year}</td>
                                <td className="text-center py-3 px-2">{run.quincena}</td>
                                <td className="text-center py-3 px-2">
                                  <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300">
                                    {run.tipo}
                                  </span>
                                </td>
                                <td className="text-center py-3 px-2">{getStatusBadge(run.status)}</td>
                                <td className="text-right py-3 px-2">{run.employee_count}</td>
                                <td className="text-right py-3 px-2">{formatCurrency(run.total_gross)}</td>
                                <td className="text-right py-3 px-2 font-semibold">{formatCurrency(run.total_net)}</td>
                                <td className="py-3 px-2 text-white/70 text-xs">{formatDate(run.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingRuns && runs.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRunsPage(prev => Math.max(1, prev - 1))}
                          disabled={runsPage === 1}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {runsPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRunsPage(prev => prev + 1)}
                          disabled={runs.length < 20}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Payroll Records Tab */}
            {activeTab === 'records' && (
              <div className="space-y-4">
                {/* Filters */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Empresa</label>
                        <select
                          value={recordsFilters.company_id}
                          onChange={(e) => setRecordsFilters({ ...recordsFilters, company_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todas</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Desde</label>
                        <input
                          type="date"
                          value={recordsFilters.start_date}
                          onChange={(e) => setRecordsFilters({ ...recordsFilters, start_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={recordsFilters.end_date}
                          onChange={(e) => setRecordsFilters({ ...recordsFilters, end_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Historial de Nómina ({recordsTotal} registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingRecords ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : recordsError ? (
                      <div className="text-center py-8 text-red-400">{recordsError}</div>
                    ) : records.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay registros de nómina</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Empleado</th>
                              <th className="text-left py-3 px-2">Empresa</th>
                              <th className="text-left py-3 px-2">Período</th>
                              <th className="text-right py-3 px-2">Bruto</th>
                              <th className="text-right py-3 px-2">Deducciones</th>
                              <th className="text-right py-3 px-2">Neto</th>
                              <th className="text-center py-3 px-2">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.map((record) => (
                              <tr key={record.id} className="border-b border-white/10">
                                <td className="py-3 px-2">
                                  <div>{record.employee_name}</div>
                                  <div className="text-xs text-white/60">{record.employee_code}</div>
                                </td>
                                <td className="py-3 px-2">{record.company_name}</td>
                                <td className="py-3 px-2 text-sm">
                                  {formatDate(record.period_start)} - {formatDate(record.period_end)}
                                </td>
                                <td className="text-right py-3 px-2">{formatCurrency(record.gross_salary)}</td>
                                <td className="text-right py-3 px-2 text-red-400">
                                  {formatCurrency(record.total_deductions)}
                                </td>
                                <td className="text-right py-3 px-2 font-semibold">
                                  {formatCurrency(record.net_salary)}
                                </td>
                                <td className="text-center py-3 px-2">{getStatusBadge(record.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingRecords && records.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecordsPage(prev => Math.max(1, prev - 1))}
                          disabled={recordsPage === 1}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {recordsPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecordsPage(prev => prev + 1)}
                          disabled={records.length < 20}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Gamification Tab */}
            {activeTab === 'gamification' && (
              <div className="space-y-4">
                {/* Filters */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Empresa</label>
                        <select
                          value={scoresFilters.company_id}
                          onChange={(e) => setScoresFilters({ ...scoresFilters, company_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todas</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Puntos Mínimos</label>
                        <input
                          type="number"
                          value={scoresFilters.min_points}
                          onChange={(e) => setScoresFilters({ ...scoresFilters, min_points: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Leaderboard de Gamificación ({scoresTotal} registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingScores ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : scoresError ? (
                      <div className="text-center py-8 text-red-400">{scoresError}</div>
                    ) : scores.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay scores de gamificación</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Rank</th>
                              <th className="text-left py-3 px-2">Empleado</th>
                              <th className="text-left py-3 px-2">Empresa</th>
                              <th className="text-right py-3 px-2">Puntos Totales</th>
                              <th className="text-right py-3 px-2">Semanal</th>
                              <th className="text-right py-3 px-2">Mensual</th>
                              <th className="text-right py-3 px-2">Racha</th>
                              <th className="text-right py-3 px-2">Logros</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scores.map((score) => (
                              <tr key={score.id} className="border-b border-white/10">
                                <td className="py-3 px-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    score.rank === 1 ? 'bg-yellow-500/20 text-yellow-300' :
                                    score.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                                    score.rank === 3 ? 'bg-orange-500/20 text-orange-300' :
                                    'bg-white/5 text-white/70'
                                  }`}>
                                    #{score.rank}
                                  </span>
                                </td>
                                <td className="py-3 px-2">
                                  <div>{score.employee_name}</div>
                                  <div className="text-xs text-white/60">{score.employee_code}</div>
                                </td>
                                <td className="py-3 px-2">{score.company_name}</td>
                                <td className="text-right py-3 px-2 font-semibold text-amber-300">
                                  {score.total_points.toLocaleString()}
                                </td>
                                <td className="text-right py-3 px-2">{score.weekly_points}</td>
                                <td className="text-right py-3 px-2">{score.monthly_points}</td>
                                <td className="text-right py-3 px-2">{score.punctuality_streak ?? 0} días</td>
                                <td className="text-right py-3 px-2">{score.achievements_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingScores && scores.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScoresPage(prev => Math.max(1, prev - 1))}
                          disabled={scoresPage === 1}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {scoresPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScoresPage(prev => prev + 1)}
                          disabled={scores.length < 20}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Leave Requests Tab */}
            {activeTab === 'leave' && (
              <div className="space-y-4">
                {/* Filters */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Empresa</label>
                        <select
                          value={leaveFilters.company_id}
                          onChange={(e) => setLeaveFilters({ ...leaveFilters, company_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todas</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Estado</label>
                        <select
                          value={leaveFilters.status}
                          onChange={(e) => setLeaveFilters({ ...leaveFilters, status: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todos</option>
                          <option value="pending">Pendiente</option>
                          <option value="approved">Aprobado</option>
                          <option value="rejected">Rechazado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Desde</label>
                        <input
                          type="date"
                          value={leaveFilters.start_date}
                          onChange={(e) => setLeaveFilters({ ...leaveFilters, start_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={leaveFilters.end_date}
                          onChange={(e) => setLeaveFilters({ ...leaveFilters, end_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Solicitudes de Permisos ({leaveTotal} registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingLeaveRequests ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : leaveRequestsError ? (
                      <div className="text-center py-8 text-red-400">{leaveRequestsError}</div>
                    ) : leaveRequests.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay solicitudes de permisos</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Empleado</th>
                              <th className="text-left py-3 px-2">Empresa</th>
                              <th className="text-left py-3 px-2">Tipo</th>
                              <th className="text-left py-3 px-2">Período</th>
                              <th className="text-center py-3 px-2">Días</th>
                              <th className="text-center py-3 px-2">Estado</th>
                              <th className="text-center py-3 px-2">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaveRequests.map((request) => (
                              <tr key={request.id} className="border-b border-white/10">
                                <td className="py-3 px-2">{request.employee_name}</td>
                                <td className="py-3 px-2">{request.company_name}</td>
                                <td className="py-3 px-2">
                                  <span 
                                    className="px-2 py-1 rounded-full text-xs font-medium"
                                    style={{ backgroundColor: `${request.leave_type_color}20`, color: request.leave_type_color }}
                                  >
                                    {request.leave_type_name}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-sm">
                                  {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                </td>
                                <td className="text-center py-3 px-2">{request.days_requested}</td>
                                <td className="text-center py-3 px-2">{getStatusBadge(request.status)}</td>
                                <td className="text-center py-3 px-2">
                                  {request.status === 'pending' && (
                                    <div className="flex gap-2 justify-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApproveLeave(request.id)}
                                        disabled={processingLeaveId === request.id}
                                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                                      >
                                        Aprobar
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRejectLeave(request.id)}
                                        disabled={processingLeaveId === request.id}
                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                      >
                                        Rechazar
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingLeaveRequests && leaveRequests.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeavePage(prev => Math.max(1, prev - 1))}
                          disabled={leavePage === 1}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {leavePage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeavePage(prev => prev + 1)}
                          disabled={leaveRequests.length < 20}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                {/* Filters */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Empresa</label>
                        <select
                          value={attendanceFilters.company_id}
                          onChange={(e) => setAttendanceFilters({ ...attendanceFilters, company_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todas</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Estado</label>
                        <select
                          value={attendanceFilters.status}
                          onChange={(e) => setAttendanceFilters({ ...attendanceFilters, status: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todos</option>
                          <option value="present">Presente</option>
                          <option value="absent">Ausente</option>
                          <option value="late">Tarde</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Desde</label>
                        <input
                          type="date"
                          value={attendanceFilters.start_date}
                          onChange={(e) => setAttendanceFilters({ ...attendanceFilters, start_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={attendanceFilters.end_date}
                          onChange={(e) => setAttendanceFilters({ ...attendanceFilters, end_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Registros de Asistencia ({attendanceTotal} registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingAttendance ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : attendanceError ? (
                      <div className="text-center py-8 text-red-400">{attendanceError}</div>
                    ) : attendance.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay registros de asistencia</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Empleado</th>
                              <th className="text-left py-3 px-2">Empresa</th>
                              <th className="text-left py-3 px-2">Fecha</th>
                              <th className="text-left py-3 px-2">Entrada</th>
                              <th className="text-left py-3 px-2">Salida</th>
                              <th className="text-right py-3 px-2">Min. Tarde</th>
                              <th className="text-center py-3 px-2">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendance.map((record) => (
                              <tr key={record.id} className="border-b border-white/10">
                                <td className="py-3 px-2">
                                  <div>{record.employee_name}</div>
                                  <div className="text-xs text-white/60">{record.employee_code}</div>
                                </td>
                                <td className="py-3 px-2">{record.company_name}</td>
                                <td className="py-3 px-2">{formatDate(record.date)}</td>
                                <td className="py-3 px-2">{formatTime(record.check_in)}</td>
                                <td className="py-3 px-2">{formatTime(record.check_out)}</td>
                                <td className={`text-right py-3 px-2 ${record.late_minutes > 0 ? 'text-yellow-400' : 'text-white/70'}`}>
                                  {record.late_minutes > 0 ? `${record.late_minutes} min` : '-'}
                                </td>
                                <td className="text-center py-3 px-2">{getStatusBadge(record.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingAttendance && attendance.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAttendancePage(prev => Math.max(1, prev - 1))}
                          disabled={attendancePage === 1}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {attendancePage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAttendancePage(prev => prev + 1)}
                          disabled={attendance.length < 20}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}
