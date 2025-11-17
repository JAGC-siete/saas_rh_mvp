import { useCallback, useEffect, useState } from 'react'
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
  Settings,
  Shield,
  Users
} from 'lucide-react'

interface SystemStats {
  totalCompanies: number
  totalUsers: number
  totalEmployees: number
  activeCompanies: number
  inactiveCompanies: number
  totalRevenue: number
  monthlyRevenue: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  lastBackup: string
  serverUptime: string
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
  lastBackup: '',
  serverUptime: ''
}

export default function AdminDashboard() {
  const { userProfile } = useAuth()
  const [systemStats, setSystemStats] = useState<SystemStats>(EMPTY_STATS)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [envError, setEnvError] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      setStatsError(null)
      setEnvError(false)

      const response = await fetch('/api/admin/stats', { credentials: 'include' })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 500) {
          setEnvError(true)
        }
        throw new Error(payload?.error || 'No se pudieron cargar las estadísticas')
      }

      setSystemStats(payload?.stats || EMPTY_STATS)
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
        return 'text-yellow-600 bg-yellow-100'
      case 'critical':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-green-600 bg-green-100'
    }
  })()

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
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Panel global</p>
                <h1 className="text-3xl font-semibold text-gray-900">Administración Central</h1>
                <p className="text-gray-600">
                  Controla empresas, usuarios, facturación y salud del sistema
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-700">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">
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
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                      <div className="flex items-center gap-2 text-sm text-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <span>{statsError}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={fetchStats}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reintentar
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                  {[
                    {
                      label: 'Empresas totales',
                      value: systemStats.totalCompanies,
                      sublabel: `${systemStats.activeCompanies} activas`,
                      icon: Building2
                    },
                    {
                      label: 'Usuarios admin',
                      value: systemStats.totalUsers,
                      sublabel: 'Super admins y company admins',
                      icon: Users
                    },
                    {
                      label: 'Empleados registrados',
                      value: systemStats.totalEmployees.toLocaleString(),
                      sublabel: 'Across all tenants',
                      icon: Activity
                    },
                    {
                      label: 'Ingresos mensuales',
                      value: `L. ${systemStats.monthlyRevenue.toLocaleString()}`,
                      sublabel: `Total: L. ${systemStats.totalRevenue.toLocaleString()}`,
                      icon: CreditCard
                    }
                  ].map((card, index) => (
                    <Card key={card.label}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                        <card.icon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {loadingStats && index !== 3 ? '…' : card.value}
                        </div>
                        <p className="text-xs text-muted-foreground">{card.sublabel}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-base font-semibold">
                          Acciones rápidas
                        </CardTitle>
                        <CardDescription>Atajos a los módulos críticos del panel</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchStats}
                        disabled={loadingStats}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {loadingStats ? 'Actualizando…' : 'Actualizar datos'}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {quickActions.map((action) => (
                          <Link key={action.href} href={action.href} className="block" prefetch={false}>
                            <Card className="h-full border border-gray-200 transition hover:border-blue-200 hover:shadow-md">
                              <CardHeader className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                  <action.icon className="h-5 w-5 text-blue-600" />
                                  {action.title}
                                </CardTitle>
                                <CardDescription>{action.description}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <Button variant="outline" className="w-full">
                                  Abrir módulo
                                </Button>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        Estado del Sistema
                      </CardTitle>
                      <CardDescription>Monitoreo de la plataforma multi-tenant</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Salud general</p>
                          <p className="text-xs text-gray-500">
                            Último backup: {systemStats.lastBackup || 'Sin registros'}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${healthBadge}`}>
                          {systemStats.systemHealth}
                        </span>
                      </div>
                      <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-green-600" /> Base de Datos
                          </span>
                          <span className="font-semibold text-green-600">Operativa</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-green-600" /> APIs
                          </span>
                          <span className="font-semibold text-green-600">Online</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-600" /> Autenticación
                          </span>
                          <span className="font-semibold text-green-600">Activa</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" /> Reportes
                          </span>
                          <span className="font-semibold text-green-600">Generando</span>
                        </div>
                      </div>
                      <div className="rounded-md border border-dashed border-gray-200 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Tiempo activo
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {systemStats.serverUptime || '—'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}
