import { useEffect, useState } from 'react'
import { useAuth } from '../../../lib/auth'
import { useRouter } from 'next/router'
import Head from 'next/head'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { 
  Users, 
  Building2, 
  CreditCard, 
  FileText, 
  Settings, 
  Shield,
  Activity,
  Database,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!loading && (!user || !userProfile)) {
      router.push('/auth/start')
      return
    }

    if (!loading && userProfile && !['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
      router.push('/app/dashboard')
      return
    }
  }, [user, userProfile, loading, router])

  useEffect(() => {
    if (userProfile && ['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
      fetchStats()
    }
  }, [userProfile])

  const fetchStats = async () => {
    try {
      setLoadingStats(true)
      
      // Fetch basic stats from multiple endpoints
      const [employeesRes, departmentsRes, reportsRes] = await Promise.allSettled([
        fetch('/api/employees'),
        fetch('/api/departments'),
        fetch('/api/reports')
      ])

      const stats = {
        employees: { count: 0, error: null as string | null },
        departments: { count: 0, error: null as string | null },
        reports: { count: 0, error: null as string | null }
      }

      if (employeesRes.status === 'fulfilled' && employeesRes.value.ok) {
        const data = await employeesRes.value.json()
        stats.employees.count = data.employees?.length || 0
      } else {
        stats.employees.error = 'Failed to load'
      }

      if (departmentsRes.status === 'fulfilled' && departmentsRes.value.ok) {
        const data = await departmentsRes.value.json()
        stats.departments.count = data.departments?.length || 0
      } else {
        stats.departments.error = 'Failed to load'
      }

      setStats(stats)
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !userProfile || !['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
    return null
  }

  return (
    <>
      <Head>
        <title>Panel de Administración - Sistema HR</title>
        <meta name="description" content="Panel de administración del sistema de recursos humanos" />
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-gray-600">Gestiona todos los aspectos del sistema HR</p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                {userProfile.role === 'super_admin' ? 'Super Admin' : 
                 userProfile.role === 'company_admin' ? 'Admin Empresa' : 'HR Manager'}
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? '...' : stats?.employees?.error ? 'Error' : stats?.employees?.count || 0}
                </div>
                {stats?.employees?.error && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {stats.employees.error}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? '...' : stats?.departments?.error ? 'Error' : stats?.departments?.count || 0}
                </div>
                {stats?.departments?.error && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {stats.departments.error}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Activo</div>
                <p className="text-xs text-muted-foreground">Todos los servicios funcionando</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/app/employees">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Gestión de Empleados
                  </CardTitle>
                  <CardDescription>
                    Administra empleados, perfiles y asignaciones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Gestionar Empleados
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/app/departments">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-600" />
                    Departamentos
                  </CardTitle>
                  <CardDescription>
                    Organiza la estructura departamental
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Ver Departamentos
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/app/payroll">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Sistema de Nómina
                  </CardTitle>
                  <CardDescription>
                    Procesa y gestiona pagos de empleados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Gestionar Nómina
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/app/reports">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Reportes y Análisis
                  </CardTitle>
                  <CardDescription>
                    Genera reportes detallados del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Ver Reportes
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/app/settings">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    Configuración
                  </CardTitle>
                  <CardDescription>
                    Ajustes generales del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Configurar Sistema
                  </Button>
                </CardContent>
              </Link>
            </Card>

            {userProfile.role === 'super_admin' && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-red-600" />
                    Administración Avanzada
                  </CardTitle>
                  <CardDescription>
                    Herramientas de super administrador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Herramientas Avanzadas
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <div className="text-sm text-gray-600">Base de Datos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <div className="text-sm text-gray-600">APIs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <div className="text-sm text-gray-600">Autenticación</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <div className="text-sm text-gray-600">Reportes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  )
}
