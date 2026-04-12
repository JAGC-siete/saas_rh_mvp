import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import HeaderBar from '../../../components/attendance/HeaderBar'
import KpiCards from '../../../components/attendance/KpiCards'
import AttendanceTablesSection from '../../../components/attendance/AttendanceTablesSection'
import TrendsChart, { type TrendData } from '../../../components/attendance/TrendsChart'
import KpiBarsChart from '../../../components/attendance/KpiBarsChart'
import { Card } from '../../../components/ui/card'
import { useCompanyContext } from '../../../lib/useCompanyContext'
import EmployeeDrawer, { type EmployeeDrawerRawPunch } from '../../../components/attendance/EmployeeDrawer'
import { useAttendanceData, calculateAttendanceRates } from '../../../lib/hooks/useAttendanceData'
import { mapAttendanceError } from '../../../lib/attendance-api'
import { getDateRange } from '../../../lib/attendance'
import { useToast } from '../../../lib/toast'
import type {
  AttendanceEmployeeApiResponse,
  AttendanceEmployeeTimelineEvent,
  AttendanceEmployeeDrawerStats,
  AttendanceEmployeeDrawerSchedule,
  AttendanceEmployeeDetail,
} from '../../../lib/attendance/dashboard-types'

function getPresetLabel(preset: string) {
  switch (preset) {
    case 'today':
      return 'de Hoy'
    case 'week':
      return 'de esta Semana'
    case 'fortnight':
      return 'de esta Quincena'
    case 'month':
      return 'de este Mes'
    case 'year':
      return 'del Año'
    default:
      return 'de Hoy'
  }
}

function barChartXLabel(preset: string) {
  switch (preset) {
    case 'today':
      return 'Hoy'
    case 'week':
      return 'Semana'
    case 'fortnight':
      return 'Quincena'
    case 'month':
      return 'Mes'
    case 'year':
      return 'Año'
    case 'custom':
      return 'Rango'
    default:
      return 'Período'
  }
}

function readQueryParam(q: Record<string, string | string[] | undefined>, key: string): string {
  const v = q[key]
  if (Array.isArray(v)) return v[0] ?? ''
  return typeof v === 'string' ? v : ''
}

export default function AttendanceDashboardApp() {
  const router = useRouter()
  const toast = useToast()
  const [preset, setPreset] = useState('today')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [from, setFrom] = useState<string | undefined>(undefined)
  const [to, setTo] = useState<string | undefined>(undefined)
  const [urlSynced, setUrlSynced] = useState(false)
  const [drawer, setDrawer] = useState<{
    open: boolean
    name: string
    events: AttendanceEmployeeTimelineEvent[]
    rawPunches?: EmployeeDrawerRawPunch[]
    periodLabel?: string
    employeeData?: AttendanceEmployeeDetail
    stats?: AttendanceEmployeeDrawerStats
    schedule?: AttendanceEmployeeDrawerSchedule
  }>({
    open: false,
    name: '',
    events: [],
    rawPunches: [],
    periodLabel: undefined,
    employeeData: undefined,
    stats: undefined,
    schedule: undefined,
  })
  const { companyId } = useCompanyContext()
  const [trends, setTrends] = useState<TrendData[]>([])
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [trendsError, setTrendsError] = useState<string | null>(null)
  const [trendsRetryTick, setTrendsRetryTick] = useState(0)
  const [showDistribution, setShowDistribution] = useState(false)
  useEffect(() => {
    if (!router.isReady || urlSynced) return
    const q = router.query as Record<string, string | undefined>
    if (q.preset) setPreset(q.preset)
    if (q.employee_id) setSelectedEmployeeId(q.employee_id)
    if (q.role) setSelectedRole(q.role)
    if (q.department_id) setSelectedDepartmentId(q.department_id)
    if (q.preset === 'custom' && q.from && q.to) {
      setFrom(q.from.includes('T') ? q.from : `${q.from}T00:00:00.000Z`)
      setTo(q.to.includes('T') ? q.to : `${q.to}T23:59:59.999Z`)
    }
    setUrlSynced(true)
  }, [router.isReady, router.query, urlSynced])

  useEffect(() => {
    if (!urlSynced || !router.isReady) return

    const next: Record<string, string> = { preset }
    if (selectedEmployeeId) next.employee_id = selectedEmployeeId
    if (selectedRole) next.role = selectedRole
    if (selectedDepartmentId) next.department_id = selectedDepartmentId
    if (preset === 'custom' && from && to) {
      next.from = from.slice(0, 10)
      next.to = to.slice(0, 10)
    }

    const q = router.query
    const samePreset = (readQueryParam(q, 'preset') || 'today') === (next.preset || 'today')
    const sameEmp = readQueryParam(q, 'employee_id') === (next.employee_id || '')
    const sameRole = readQueryParam(q, 'role') === (next.role || '')
    const sameDept = readQueryParam(q, 'department_id') === (next.department_id || '')
    const nextFrom = preset === 'custom' && from ? from.slice(0, 10) : ''
    const nextTo = preset === 'custom' && to ? to.slice(0, 10) : ''
    const sameFrom = readQueryParam(q, 'from') === nextFrom
    const sameTo = readQueryParam(q, 'to') === nextTo

    if (samePreset && sameEmp && sameRole && sameDept && sameFrom && sameTo) return

    router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true })
  }, [
    preset,
    selectedEmployeeId,
    selectedRole,
    selectedDepartmentId,
    from,
    to,
    urlSynced,
    router.isReady,
    router.pathname,
    router.query,
    router,
  ])

  const { kpis, absent, early, late, outsideSchedule, lastUpdated, loading, error } =
    useAttendanceData(preset, selectedEmployeeId, selectedRole, from, to, selectedDepartmentId)

  const {
    total,
    llegadas,
    asistenciaPct,
    puntualidadSobreLlegadasPct,
    tempranosSobreLlegadasPct,
    tardesSobreLlegadasPct,
  } = calculateAttendanceRates(kpis)

  useEffect(() => {
    if (!companyId) {
      setTrends([])
      setTrendsLoading(false)
      setTrendsError(null)
      return
    }

    const ac = new AbortController()
    let cancelled = false

    const loadTrends = async () => {
      setTrendsLoading(true)
      setTrendsError(null)
      try {
        const range =
          preset === 'custom' && from && to
            ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
            : ''
        const trendsUrl =
          `/api/reports/attendance-trends?preset=${preset}` +
          (selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : '') +
          (selectedRole ? `&role=${encodeURIComponent(selectedRole)}` : '') +
          (selectedDepartmentId ? `&department_id=${selectedDepartmentId}` : '') +
          range

        const res = await fetch(trendsUrl, { credentials: 'include', signal: ac.signal })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          const msg =
            typeof json?.error === 'string'
              ? json.error
              : typeof json?.message === 'string'
                ? json.message
                : `Error ${res.status}`
          throw new Error(msg)
        }
        if (json?.success && Array.isArray(json.data)) {
          setTrends(json.data)
        } else {
          throw new Error('No se pudieron interpretar las tendencias')
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        if (!cancelled) {
          setTrends([])
          setTrendsError((e as Error).message || 'Error al cargar tendencias')
        }
      } finally {
        if (!cancelled && !ac.signal.aborted) setTrendsLoading(false)
      }
    }

    loadTrends()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [
    companyId,
    selectedEmployeeId,
    selectedRole,
    selectedDepartmentId,
    preset,
    from,
    to,
    trendsRetryTick,
  ])

  const handlePresetChange = (p: string) => {
    setPreset(p)
    if (p === 'custom' && !from && !to) {
      const { from: weekFrom, to: weekTo } = getDateRange('week')
      setFrom(weekFrom)
      setTo(weekTo)
    }
  }
  const handleRangeChange = (f: string, t: string) => {
    setFrom(f ? `${f}T00:00:00.000Z` : undefined)
    setTo(t ? `${t}T23:59:59.999Z` : undefined)
  }

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
  }

  const handleExport = async (format: string) => {
    try {
      const searchParams = new URLSearchParams()
      searchParams.set('preset', preset)
      searchParams.set('formato', format === 'xlsx' ? 'excel' : format)
      if (selectedEmployeeId) searchParams.set('employee_id', selectedEmployeeId)
      if (selectedRole) searchParams.set('role', selectedRole)
      if (selectedDepartmentId) searchParams.set('department_id', selectedDepartmentId)

      if (preset === 'custom' && from && to) {
        searchParams.set('startDate', from.split('T')[0])
        searchParams.set('endDate', to.split('T')[0])
      }

      const url = `/api/attendance/export?${searchParams.toString()}`

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          Accept:
            format === 'pdf'
              ? 'application/pdf'
              : format === 'csv'
                ? 'text/csv'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(errorData.error || errorData.message || `Error ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      const employeePart = selectedEmployeeId ? '_empleado' : ''
      const datePart = new Date().toLocaleString('sv-SE', { timeZone: 'America/Tegucigalpa' }).split(' ')[0]
      const fileExtension = format === 'xlsx' ? 'xlsx' : format
      const fileName = `asistencia_${preset}${employeePart}_${datePart}.${fileExtension}`
      link.download = fileName

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: unknown) {
      const errorMessage = mapAttendanceError(err)
      toast.error('Exportación', errorMessage)
    }
  }

  const handleEmployeeClick = async (id: string, name: string) => {
    try {
      const employeeUrl = `/api/attendance/employee/${id}?preset=${preset}`
      const res = await fetch(employeeUrl, { credentials: 'include' })
      const data = (await res.json()) as AttendanceEmployeeApiResponse

      if (!res.ok) {
        toast.error(
          'Empleado',
          typeof data?.error === 'string' ? data.error : `No se pudo cargar el detalle (${res.status})`
        )
        return
      }

      setDrawer({
        open: true,
        name: data.employee?.name || name,
        events: Array.isArray(data.timeline) ? data.timeline : [],
        rawPunches: Array.isArray(data.raw_punches) ? data.raw_punches : [],
        periodLabel: getPresetLabel(preset),
        employeeData: data.employee,
        stats: data.stats,
        schedule: data.schedule,
      })
    } catch (err: unknown) {
      toast.error('Empleado', mapAttendanceError(err))
    }
  }

  const closeDrawer = useCallback(() => {
    setDrawer({
      open: false,
      name: '',
      events: [],
      rawPunches: [],
      periodLabel: undefined,
      employeeData: undefined,
      stats: undefined,
      schedule: undefined,
    })
  }, [])

  const tablesSectionKey = `${preset}-${selectedEmployeeId}-${selectedRole}-${selectedDepartmentId}-${from ?? ''}-${to ?? ''}`

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <header className="border-b border-white/10 pb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Asistencia</h1>
            <p className="mt-2 text-sm text-gray-400 max-w-3xl">
              Resumen operativo del período y filtros seleccionados: presentes, ausencias, llegadas y
              excepciones. Las cifras y exportaciones reflejan los registros que envía el reloj a la
              aplicación (entrada y salida en tiempo casi real).
            </p>
          </header>

          <HeaderBar
            preset={preset}
            onPresetChange={handlePresetChange}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeChange={handleEmployeeChange}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            selectedDepartmentId={selectedDepartmentId}
            onDepartmentChange={setSelectedDepartmentId}
            lastUpdated={lastUpdated}
            onExport={handleExport}
            loading={loading}
            from={from}
            to={to}
            onRangeChange={handleRangeChange}
          />

          <section aria-labelledby="attendance-summary-heading" className="space-y-4">
            <h2 id="attendance-summary-heading" className="sr-only">
              Resumen del período
            </h2>
            <KpiCards
              presentes={kpis?.presentes ?? 0}
              ausentes={kpis?.ausentes ?? 0}
              temprano={kpis?.tempranos ?? 0}
              tarde={kpis?.tardes ?? 0}
              presetLabel={` ${getPresetLabel(preset)}`}
              asistenciaPct={asistenciaPct}
              puntualidadSobreLlegadasPct={puntualidadSobreLlegadasPct}
              tempranosSobreLlegadasPct={tempranosSobreLlegadasPct}
              tardesSobreLlegadasPct={tardesSobreLlegadasPct}
              total={total}
              llegadas={llegadas}
              loading={loading}
            />

            <Card variant="glass" className="border border-white/10">
              <button
                type="button"
                onClick={() => setShowDistribution((v) => !v)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition-colors rounded-xl"
                aria-expanded={showDistribution}
                aria-controls="attendance-distribution-panel"
                id="attendance-distribution-toggle"
              >
                <span className="flex items-center gap-2 text-base font-semibold text-white">
                  <ChartBarIcon className="h-6 w-6 text-gray-300 shrink-0" aria-hidden />
                  Distribución de asistencia
                </span>
                {showDistribution ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400 shrink-0" aria-hidden />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 shrink-0" aria-hidden />
                )}
              </button>
              <div
                id="attendance-distribution-panel"
                role="region"
                aria-labelledby="attendance-distribution-toggle"
                hidden={!showDistribution}
                className={showDistribution ? 'px-4 sm:px-5 pb-5 pt-0' : 'hidden'}
              >
                <KpiBarsChart
                  kpis={kpis}
                  loading={loading}
                  barLabel={barChartXLabel(preset)}
                />
              </div>
            </Card>
          </section>

          <AttendanceTablesSection
            key={tablesSectionKey}
            absent={absent}
            early={early}
            late={late}
            outsideSchedule={outsideSchedule}
            presetLabel={getPresetLabel(preset)}
            onSelectEmployee={handleEmployeeClick}
          />

          <Card variant="glass" className="border border-white/10">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex flex-wrap items-center gap-2">
                <ArrowTrendingUpIcon className="h-6 w-6 text-gray-300 shrink-0" aria-hidden />
                <span>Tendencias de asistencia {getPresetLabel(preset)}</span>
                {selectedEmployeeId && (
                  <span className="text-sm text-gray-400 font-normal">· Empleado seleccionado</span>
                )}
                {selectedRole && (
                  <span className="text-sm text-gray-400 font-normal">· {selectedRole}</span>
                )}
                {selectedDepartmentId && (
                  <span className="text-sm text-gray-400 font-normal">· Departamento filtrado</span>
                )}
              </h3>
              <TrendsChart
                trends={trends}
                loading={trendsLoading}
                error={trendsError}
                onRetry={() => setTrendsRetryTick((n) => n + 1)}
              />
              {trends.length === 0 && !trendsLoading && !trendsError && (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4 font-medium">Sin datos en este rango.</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                      onClick={() => setPreset('week')}
                    >
                      <CalendarDaysIcon className="h-4 w-4" aria-hidden />
                      Últimos 7 días
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                      onClick={() => setPreset('month')}
                    >
                      <CalendarDaysIcon className="h-4 w-4" aria-hidden />
                      Este mes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        <EmployeeDrawer
          open={drawer.open}
          onClose={closeDrawer}
          name={drawer.name}
          events={drawer.events}
          periodLabel={drawer.periodLabel}
          rawPunches={drawer.rawPunches}
          employeeData={drawer.employeeData}
          stats={drawer.stats}
          schedule={drawer.schedule}
        />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
