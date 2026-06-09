import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import EnvironmentError from '../../../components/EnvironmentError'
import ClientEnvDebug from '../../../components/ClientEnvDebug'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import {
  Activity,
  AlertCircle,
  Building2,
  CreditCard,
  Database,
  FileText,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  serviceStatusColorClass,
  serviceStatusLabel,
  type CommercialStats,
  type PlatformServiceStatus,
  type ServiceStatus,
  type SystemHealthStatus,
  type TenantStats,
  type VentasBankConfigStatus,
} from '../../../lib/admin/system-stats'

interface SystemStats {
  totalCompanies: number
  totalUsers: number
  totalEmployees: number
  activeCompanies: number
  inactiveCompanies: number
  totalRevenue: number
  monthlyRevenue: number
  systemHealth: SystemHealthStatus
  lastBackup: string | null
  serverUptime: string
  services?: PlatformServiceStatus
  revenueSource?: string
  commercial?: CommercialStats
  ventasBank?: VentasBankConfigStatus
  tenants?: TenantStats
}

interface RecentActivity {
  id: string
  type: 'company_created' | 'user_registered' | 'employee_registered' | 'payment_recorded' | 'system_alert' | 'backup_completed'
  message: string
  timestamp: string
  severity?: 'info' | 'warning' | 'error'
}

const EMPTY_STATS: SystemStats = {
  totalCompanies: 0,
  totalUsers: 0,
  totalEmployees: 0,
  activeCompanies: 0,
  inactiveCompanies: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  systemHealth: 'healthy',
  lastBackup: null,
  serverUptime: '',
  services: {
    database: 'unknown',
    apis: 'unknown',
    authentication: 'unknown',
    reports: 'unknown',
  },
  commercial: {
    available: false,
    quotesSent30d: 0,
    quotesPendingPayment: 0,
    quotesDepositReceived30d: 0,
    pipelineQuotedTotalHnl: 0,
    depositsMonthCount: 0,
    depositsMonthTotalHnl: 0,
    quotesWithoutCompany: 0,
    paymentsWithoutQuote: 0,
    conversionRate30d: null,
  },
  ventasBank: {
    configured: false,
    hasClientName: false,
    hasClientDni: false,
    hasBacAccount: false,
    hasBanpaisAccount: false,
    hasAtlantidaAccount: false,
  },
  tenants: {
    paidActiveCompanies: 0,
    trialCompanies: 0,
    inactiveCompanies: 0,
    paidActiveEmployees: 0,
    trialEmployees: 0,
  },
}

export default function AdminDashboard() {
  const { userProfile } = useAuth()
  const [systemStats, setSystemStats] = useState<SystemStats>(EMPTY_STATS)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [envError, setEnvError] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      setStatsError(null)
      setEnvError(false)

      // Load stats and recent activity in parallel
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/recent-activity', { credentials: 'include' })
      ])

      const statsPayload = await statsRes.json().catch(() => null)

      if (!statsRes.ok) {
        if (statsRes.status === 500) {
          setEnvError(true)
        }
        throw new Error(statsPayload?.error || 'No se pudieron cargar las estadísticas')
      }

      setSystemStats(statsPayload?.stats || EMPTY_STATS)

      // Load recent activity if available
      if (activityRes.ok) {
        const activityPayload = await activityRes.json().catch(() => null)
        setRecentActivity(activityPayload?.activities || [])
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
      setStatsError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    if (userProfile?.role === 'super_admin') {
      fetchStats()
    }
  }, [userProfile?.role, fetchStats])

  const quickActions = [
    {
      title: 'Gestión de Empresas',
      description: 'Administrar tenants y suscripciones',
      href: '/app/admin/companies',
      icon: Building2
    },
    {
      title: 'Usuarios del Sistema',
      description: 'Control de super admins y company admins',
      href: '/app/admin/users',
      icon: Users
    },
    {
      title: 'Facturación',
      description: 'Planes, cobros y facturas',
      href: '/app/admin/billing',
      icon: CreditCard
    },
    {
      title: 'Seguridad',
      description: 'RLS, permisos y auditorías',
      href: '/app/admin/security',
      icon: Shield
    },
    {
      title: 'Estado del Sistema',
      description: 'Salud global y uptime',
      href: '/app/admin/system',
      icon: Server
    },
    {
      title: 'Logs y Auditoría',
      description: 'Eventos recientes e incidentes',
      href: '/app/admin/logs',
      icon: FileText
    }
  ]

  const healthBadge = (() => {
    switch (systemStats.systemHealth) {
      case 'warning':
        return 'text-amber-100 bg-amber-500/20 border border-amber-300/40'
      case 'critical':
        return 'text-rose-100 bg-rose-500/20 border border-rose-400/40'
      default:
        return 'text-emerald-100 bg-emerald-500/20 border border-emerald-300/40'
    }
  })()

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'company_created': return <Building2 className="h-4 w-4 text-blue-400" />
      case 'user_registered': return <Users className="h-4 w-4 text-green-400" />
      case 'employee_registered': return <Users className="h-4 w-4 text-cyan-400" />
      case 'payment_recorded': return <CreditCard className="h-4 w-4 text-emerald-400" />
      case 'system_alert': return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'backup_completed': return <Database className="h-4 w-4 text-purple-400" />
      default: return <Activity className="h-4 w-4 text-white/50" />
    }
  }

  const renderServiceRow = (label: string, icon: ReactNode, status: ServiceStatus | undefined) => {
    const resolved = status || 'unknown'
    return (
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          {icon} {label}
        </span>
        <span className={`font-semibold ${serviceStatusColorClass(resolved)}`}>
          {serviceStatusLabel(resolved)}
        </span>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Panel de Administración - Humano SISU</title>
        <meta
          name="description"
          content="Panel principal para operaciones multi-tenant y super administración"
        />
      </Head>

      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Panel global</p>
                <h1 className="text-3xl font-semibold text-white">Administración Central</h1>
                <p className="text-white/70">
                  Controla empresas, usuarios, facturación y salud del sistema
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white">
                <Shield className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-medium tracking-wide">
                  {userProfile?.role === 'super_admin' ? 'Super Admin' : 'Acceso restringido'}
                </span>
              </div>
            </div>

            {envError ? (
              <div className="space-y-6">
                <EnvironmentError />
                <ClientEnvDebug />
              </div>
            ) : (
              <>
                {statsError && (
                  <Card className="border-red-200/40 bg-red-500/10 text-red-50">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{statsError}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={fetchStats} className="border-white/30 text-white hover:bg-white/10">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reintentar
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {systemStats.ventasBank && !systemStats.ventasBank.configured && (
                  <Card className="border-amber-400/30 bg-amber-500/10 text-amber-50">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                      <div className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          <strong>VENTAS_BANK_* no configurado en este entorno.</strong> Los correos de
                          cotización salen sin datos bancarios ni instrucciones del 50%. Configure al menos{' '}
                          <code className="text-xs">VENTAS_BANK_BAC_ACCOUNT</code> en Railway.
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                  Clientes de paga
                </p>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                  {[
                    {
                      label: 'Empresas activas (de paga)',
                      value: systemStats.tenants?.paidActiveCompanies ?? systemStats.activeCompanies,
                      sublabel: `${systemStats.totalCompanies} totales · ${systemStats.tenants?.inactiveCompanies ?? systemStats.inactiveCompanies} inactivas`,
                      icon: Building2
                    },
                    {
                      label: 'Usuarios admin',
                      value: systemStats.totalUsers,
                      sublabel: 'Super admins y company admins',
                      icon: Users
                    },
                    {
                      label: 'Empleados (de paga)',
                      value: (systemStats.tenants?.paidActiveEmployees ?? systemStats.totalEmployees).toLocaleString(),
                      sublabel: 'Solo empresas con plan basic/premium/enterprise',
                      icon: Activity
                    },
                    {
                      label: 'Ingresos mensuales',
                      value: `L. ${systemStats.monthlyRevenue.toLocaleString()}`,
                      sublabel: `Acumulado (pagos manuales): L. ${systemStats.totalRevenue.toLocaleString()}`,
                      icon: CreditCard
                    }
                  ].map((card, index) => (
                    <Card key={card.label} variant="glass" className="border-white/10">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                        <card.icon className="h-4 w-4 text-white/70" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {loadingStats && index !== 3 ? '…' : card.value}
                        </div>
                        <p className="text-xs text-white/70">{card.sublabel}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-3">
                    Entornos trial (sandbox)
                  </p>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-2xl">
                    {[
                      {
                        label: 'Empresas en trial',
                        value: systemStats.tenants?.trialCompanies ?? 0,
                        sublabel: 'plan_type=trial, is_active=true',
                        icon: Building2,
                      },
                      {
                        label: 'Empleados en trial',
                        value: (systemStats.tenants?.trialEmployees ?? 0).toLocaleString(),
                        sublabel: 'No incluidos en métricas de paga',
                        icon: Users,
                      },
                    ].map((card) => (
                      <Card key={card.label} variant="glass" className="border-white/10 border-dashed">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-white/80">{card.label}</CardTitle>
                          <card.icon className="h-4 w-4 text-white/50" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white/90">
                            {loadingStats ? '…' : card.value}
                          </div>
                          <p className="text-xs text-white/50">{card.sublabel}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-3">
                    Pipeline comercial (cotizaciones)
                  </p>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: 'Cotizaciones enviadas (30d)',
                        value: systemStats.commercial?.available
                          ? systemStats.commercial.quotesSent30d
                          : '—',
                        sublabel: systemStats.commercial?.available
                          ? `${systemStats.commercial.quotesPendingPayment} pendientes de pago`
                          : 'Requiere migración unify_quote_billing',
                        icon: FileText,
                      },
                      {
                        label: 'Pipeline cotizado',
                        value: systemStats.commercial?.available
                          ? `L. ${systemStats.commercial.pipelineQuotedTotalHnl.toLocaleString()}`
                          : '—',
                        sublabel: 'Suma expected_total_hnl (pendientes)',
                        icon: TrendingUp,
                      },
                      {
                        label: 'Depósitos del mes',
                        value: systemStats.commercial?.available
                          ? `L. ${systemStats.commercial.depositsMonthTotalHnl.toLocaleString()}`
                          : '—',
                        sublabel: systemStats.commercial?.available
                          ? `${systemStats.commercial.depositsMonthCount} pagos (kind=deposit)`
                          : '—',
                        icon: CreditCard,
                      },
                      {
                        label: 'Conversión (30d)',
                        value:
                          systemStats.commercial?.available &&
                          systemStats.commercial.conversionRate30d != null
                            ? `${systemStats.commercial.conversionRate30d}%`
                            : systemStats.commercial?.available
                              ? '0%'
                              : '—',
                        sublabel: systemStats.commercial?.available
                          ? `${systemStats.commercial.quotesDepositReceived30d} con depósito / ${systemStats.commercial.quotesSent30d} enviadas`
                          : '—',
                        icon: Activity,
                      },
                    ].map((card) => (
                      <Card key={card.label} variant="glass" className="border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                          <card.icon className="h-4 w-4 text-white/70" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {loadingStats ? '…' : card.value}
                          </div>
                          <p className="text-xs text-white/70">{card.sublabel}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {systemStats.commercial?.available &&
                    (systemStats.commercial.quotesWithoutCompany > 0 ||
                      systemStats.commercial.paymentsWithoutQuote > 0) && (
                      <p className="mt-3 text-xs text-amber-200/90">
                        Deuda de datos: {systemStats.commercial.quotesWithoutCompany} cotización(es) sin
                        empresa · {systemStats.commercial.paymentsWithoutQuote} pago(s) sin quote_id
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <Card variant="glass" className="lg:col-span-2 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-base font-semibold">
                          Acciones rápidas
                        </CardTitle>
                        <CardDescription className="text-white/70">
                          Atajos a los módulos críticos del panel
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchStats}
                        disabled={loadingStats}
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {loadingStats ? 'Actualizando…' : 'Actualizar datos'}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {quickActions.map((action) => (
                          <Link key={action.href} href={action.href} className="block" prefetch={false}>
                            <Card
                              variant="glass"
                              className="h-full border border-white/10 transition hover:border-white/30 hover:shadow-glass"
                            >
                              <CardHeader className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                  <action.icon className="h-5 w-5 text-amber-200" />
                                  {action.title}
                                </CardTitle>
                                <CardDescription className="text-white/70">
                                  {action.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <Button
                                  variant="outline"
                                  className="w-full border-white/30 text-white hover:bg-white/10"
                                >
                                  Abrir módulo
                                </Button>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-200" />
                        Estado del Sistema
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        Monitoreo de la plataforma multi-tenant
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 border border-white/10">
                        <div>
                          <p className="text-sm font-medium text-white">Salud general</p>
                          <p className="text-xs text-white/70">
                            Último backup: {systemStats.lastBackup || 'Sin registros en data_backups'}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${healthBadge}`}>
                          {systemStats.systemHealth}
                        </span>
                      </div>
                      <div className="space-y-3 text-sm text-white/80">
                        {renderServiceRow(
                          'Base de Datos',
                          <Database className="h-4 w-4 text-emerald-200" />,
                          systemStats.services?.database
                        )}
                        {renderServiceRow(
                          'APIs',
                          <Server className="h-4 w-4 text-emerald-200" />,
                          systemStats.services?.apis
                        )}
                        {renderServiceRow(
                          'Autenticación',
                          <Shield className="h-4 w-4 text-emerald-200" />,
                          systemStats.services?.authentication
                        )}
                        {renderServiceRow(
                          'Reportes',
                          <FileText className="h-4 w-4 text-emerald-200" />,
                          systemStats.services?.reports
                        )}
                      </div>
                      <div className="rounded-md border border-dashed border-white/30 p-3">
                        <p className="text-xs uppercase tracking-wide text-white/60">
                          Tiempo activo (proceso actual)
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {systemStats.serverUptime || '—'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-200" />
                      Actividad Reciente
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      Últimas acciones en el sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivity.length > 0 ? (
                        recentActivity.slice(0, 5).map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            {getActivityIcon(activity.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">
                                {activity.message}
                              </p>
                              <p className="text-xs text-white/60">
                                {new Date(activity.timestamp).toLocaleString('es-HN', { 
                                  timeZone: 'America/Tegucigalpa',
                                  dateStyle: 'short',
                                  timeStyle: 'short'
                                })}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-white/60">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No hay actividad reciente</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}
