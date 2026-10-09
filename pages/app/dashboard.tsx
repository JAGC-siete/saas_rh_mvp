import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../lib/auth'
import { useCompanyMoney } from '../../lib/hooks/useCompanyMoney'
import { isDeduccionesOnlyAccess } from '../../lib/security/deducciones-access'
import { HONDURAS_TIMEZONE } from '../../lib/timezone'
import { useDashboardOverview } from '../../components/dashboard/useDashboardOverview'
import { PanelSkeleton, shortDate } from '../../components/dashboard/shared'
import PendingStrip from '../../components/dashboard/PendingStrip'
import KpiTiles from '../../components/dashboard/KpiTiles'
import AttendanceChart from '../../components/dashboard/AttendanceChart'
import PayrollCostChart from '../../components/dashboard/PayrollCostChart'
import MissingToday from '../../components/dashboard/MissingToday'
import PayrollRuns from '../../components/dashboard/PayrollRuns'
import HrCalendar from '../../components/dashboard/HrCalendar'
import DepartmentBreakdown from '../../components/dashboard/DepartmentBreakdown'

const WARNING_LABELS: Record<string, string> = {
  attendance_series: 'serie de asistencia',
  attendance_today: 'asistencia de hoy',
  open_punches: 'marcajes sin salida',
  leave_requests: 'permisos',
  corrections: 'correcciones',
  payroll: 'nómina',
  holidays: 'feriados',
}

function greeting() {
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: HONDURAS_TIMEZONE }))
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando dashboard">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {[0, 1, 2, 3].map((i) => (
          <PanelSkeleton key={i} height="h-36" />
        ))}
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {[0, 1, 2, 3].map((i) => (
          <PanelSkeleton key={i} height="h-28" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <PanelSkeleton height="h-72" />
        <PanelSkeleton height="h-72" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const { userProfile, loading: authLoading } = useAuth()
  const { format } = useCompanyMoney()
  const deduccionesOnly = !!userProfile && isDeduccionesOnlyAccess(userProfile.role, userProfile.permissions)
  const { data, error, loading, reload } = useDashboardOverview(!authLoading && !!userProfile && !deduccionesOnly)

  useEffect(() => {
    if (deduccionesOnly) router.replace('/app/deducciones')
  }, [deduccionesOnly, router])

  const firstName = userProfile?.name?.trim().split(/\s+/)[0]
  const isManagerScope = data?.scope.kind === 'departments'
  const scopeLabel = isManagerScope ? 'tu equipo' : 'toda la empresa'
  const formatMoney = (n: number) => format(n, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-12 font-montserrat">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {greeting()}
                {firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="text-sm text-slate-300 first-letter:uppercase">
                {data ? shortDate(data.today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ' '}
                {data && ` · ${isManagerScope ? `Tu equipo · ${data.scope.employeeCount} personas` : `${data.scope.employeeCount} empleados activos`}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={reload}
                disabled={loading}
                aria-label="Actualizar dashboard"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/70 text-slate-200 hover:bg-white/10 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              </button>
              {data?.access.payroll && (
                <Link
                  href="/app/payroll"
                  className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Generar planilla
                </Link>
              )}
            </div>
          </header>

          {error && !data && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-5 py-4 text-sm text-orange-100">
              No se pudo cargar el dashboard: {error}
              <button type="button" onClick={reload} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15">
                Reintentar
              </button>
            </div>
          )}

          {!data && !error && <DashboardSkeleton />}

          {data && (
            <>
              {data.warnings.length > 0 && (
                <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
                  Algunos bloques no se pudieron cargar ({data.warnings.map((w) => WARNING_LABELS[w] ?? w).join(', ')}). El resto está al día.
                </p>
              )}

              <PendingStrip items={data.pending} />
              <KpiTiles data={data} formatMoney={formatMoney} />

              <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))]">
                <AttendanceChart series={data.attendance.series} scopeLabel={scopeLabel} />
                {data.payroll?.costTrend && <PayrollCostChart trend={data.payroll.costTrend} formatMoney={formatMoney} />}
              </div>

              <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))]">
                <MissingToday items={data.attendance.missingToday} total={data.attendance.missingTodayTotal} />
                {data.payroll && (
                  <PayrollRuns runs={data.payroll.runs} nextPayment={data.payroll.nextPayment} formatMoney={formatMoney} />
                )}
                <HrCalendar events={data.calendar} />
              </div>

              <DepartmentBreakdown departments={data.departments} />
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
