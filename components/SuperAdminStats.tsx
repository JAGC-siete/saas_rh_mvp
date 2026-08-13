import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Activity,
  DollarSign,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface TenantStats {
  paidActiveCompanies: number
  trialCompanies: number
  inactiveCompanies: number
  paidActiveEmployees: number
  trialEmployees: number
}

interface SystemStats {
  totalCompanies: number
  totalUsers: number
  totalEmployees: number
  activeCompanies: number
  inactiveCompanies: number
  tenants?: TenantStats
  totalRevenue: number
  monthlyRevenue: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  lastBackup: string | null
  serverUptime: string
}

export default function SuperAdminStats() {
  const [stats, setStats] = useState<SystemStats>({
    totalCompanies: 0,
    totalUsers: 0,
    totalEmployees: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    systemHealth: 'healthy',
    lastBackup: null,
    serverUptime: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stats', { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Paid active companies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Empresas de paga</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.tenants?.paidActiveCompanies ?? stats.activeCompanies}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalCompanies} totales · {stats.tenants?.trialCompanies ?? 0} trial ·{' '}
            {stats.tenants?.inactiveCompanies ?? stats.inactiveCompanies} inactivas
          </p>
        </CardContent>
      </Card>

      {/* Total Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            Administradores del sistema
          </p>
        </CardContent>
      </Card>

      {/* Paid employees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Empleados de paga</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.tenants?.paidActiveEmployees ?? stats.totalEmployees).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.tenants?.trialEmployees ?? 0} en empresas trial (excluidos)
          </p>
        </CardContent>
      </Card>

      {/* Monthly Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">L. {stats.monthlyRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Pagos manuales: L. {stats.totalRevenue.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
          {getHealthIcon(stats.systemHealth)}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold capitalize ${getHealthColor(stats.systemHealth)}`}>
            {stats.systemHealth}
          </div>
          <p className="text-xs text-muted-foreground">
            Último backup: {stats.lastBackup || 'Sin registros'}
          </p>
        </CardContent>
      </Card>

      {/* Server Uptime */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tiempo Activo</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.serverUptime}</div>
          <p className="text-xs text-muted-foreground">
            Sin interrupciones
          </p>
        </CardContent>
      </Card>

      {/* Trial sandbox */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Empresas trial</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{stats.tenants?.trialCompanies ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            Sandbox separado de clientes de paga
          </p>
        </CardContent>
      </Card>

      {/* Growth Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Crecimiento</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">+12.5%</div>
          <p className="text-xs text-muted-foreground">
            Nuevas empresas este mes
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
