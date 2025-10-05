import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth'
import { useRouter } from 'next/router'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminStats from '../../../components/SuperAdminStats'
import EnvironmentError from '../../../components/EnvironmentError'
import ClientEnvDebug from '../../../components/ClientEnvDebug'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { 
  Building2, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Globe,
  Database,
  CreditCard,
  Clock,
  Shield
} from 'lucide-react'

interface SystemOverview {
  totalCompanies: number
  totalUsers: number
  totalEmployees: number
  activeCompanies: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  lastBackup: string
  serverUptime: string
  monthlyRevenue: number
  totalRevenue: number
}

interface RecentActivity {
  id: string
  type: 'company_created' | 'user_registered' | 'system_alert' | 'backup_completed'
  message: string
  timestamp: string
  severity?: 'info' | 'warning' | 'error'
}

export default function SuperAdminDashboard() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  
  // State
  const [systemOverview, setSystemOverview] = useState<SystemOverview>({
    totalCompanies: 0,
    totalUsers: 0,
    totalEmployees: 0,
    activeCompanies: 0,
    systemHealth: 'healthy',
    lastBackup: '',
    serverUptime: '',
    monthlyRevenue: 0,
    totalRevenue: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [envError, setEnvError] = useState(false)

  // Load dashboard data
  useEffect(() => {
    if (!loading && user) {
      loadDashboardData()
    }
  }, [loading, user])

  const loadDashboardData = async () => {
    try {
      setLoadingData(true)
      setError(null)
      setEnvError(false)

      // Load system stats and recent activity in parallel
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/recent-activity', { credentials: 'include' })
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setSystemOverview(statsData.stats)
      } else if (statsRes.status === 500) {
        // Likely environment variable issue
        setEnvError(true)
        return
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setRecentActivity(activityData.activities || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Error al cargar datos del dashboard')
      // Check if it's an environment variable issue
      if (error instanceof Error && error.message.includes('configuration')) {
        setEnvError(true)
      }
    } finally {
      setLoadingData(false)
    }
  }

  // Redirect if not super admin
  useEffect(() => {
    if (!loading && userProfile && userProfile.role !== 'super_admin') {
      router.push('/app/dashboard')
    }
  }, [loading, userProfile, router])

  if (loading || loadingData) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SuperAdminLayout>
    )
  }

  if (!user || userProfile?.role !== 'super_admin') {
    return null
  }

  // Show environment error if detected
  if (envError) {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <EnvironmentError />
          <ClientEnvDebug />
        </div>
      </SuperAdminLayout>
    )
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'company_created': return <Building2 className="h-4 w-4 text-blue-500" />
      case 'user_registered': return <Users className="h-4 w-4 text-green-500" />
      case 'system_alert': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'backup_completed': return <Database className="h-4 w-4 text-purple-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <>
      <Head>
        <title>Super Admin Dashboard - Humano SISU</title>
        <meta name="description" content="Panel de super administrador del sistema" />
      </Head>

      <SuperAdminLayout>
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Bienvenido, Super Administrador
                </h1>
                <p className="text-blue-100">
                  Panel de control del sistema multi-tenant Humano SISU
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-100">Última actualización</div>
                <div className="text-lg font-semibold">
                  {new Date().toLocaleTimeString('es-HN')}
                </div>
              </div>
            </div>
          </div>

          {/* System Statistics */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Estadísticas del Sistema
            </h2>
            <SuperAdminStats />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/app/admin/companies')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gestión de Empresas</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemOverview.totalCompanies}</div>
                <p className="text-xs text-muted-foreground">
                  Empresas registradas
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/app/admin/users')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios del Sistema</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemOverview.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Administradores activos
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/app/admin/system')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
                {getHealthIcon(systemOverview.systemHealth)}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold capitalize ${getHealthColor(systemOverview.systemHealth)}`}>
                  {systemOverview.systemHealth}
                </div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {systemOverview.serverUptime}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/app/admin/billing')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">L. {systemOverview.monthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Total: L. {systemOverview.totalRevenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Actividad Reciente</span>
                </CardTitle>
                <CardDescription>
                  Últimas acciones en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString('es-HN')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay actividad reciente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Estado del Sistema</span>
                </CardTitle>
                <CardDescription>
                  Monitoreo en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Base de Datos</span>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Conectada</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Endpoints</span>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Operativos</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Último Backup</span>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600">{systemOverview.lastBackup}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Empresas Activas</span>
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-purple-600">
                        {systemOverview.activeCompanies}/{systemOverview.totalCompanies}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SuperAdminLayout>
    </>
  )
}
