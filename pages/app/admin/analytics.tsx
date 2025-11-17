import { useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { BarChart3, Receipt, TrendingUp, Trophy, FileText, Clock } from 'lucide-react'

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
  employee_name: string
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
    { id: 'records' as const, name: 'Historial de Nómina', icon: Receipt }
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-HN', {
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
      approved: 'bg-blue-500/20 text-blue-300',
      paid: 'bg-green-500/20 text-green-300'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
        {status}
      </span>
    )
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
                          ? 'border-brand-400 text-white'
                          : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
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
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {runsPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRunsPage(prev => prev + 1)}
                          disabled={runs.length < 20}
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
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {recordsPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecordsPage(prev => prev + 1)}
                          disabled={records.length < 20}
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
