import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { 
  User, 
  Clock, 
  DollarSign, 
  BarChart3,
  Settings,
  LogOut,
  Users,
  Shield,
  Building2,
  Database,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Globe,
  Server,
  Key,
  FileText,
  Crown,
  Activity
} from 'lucide-react'

interface SuperAdminLayoutProps {
  children: React.ReactNode
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  const handleSignOut = async () => {
    await logout()
    router.push('/app/login')
  }

  // Navegación específica para Super Admin
  const superAdminNavigation = [
    {
      name: 'Super Admin Panel',
      href: '/app/admin/super-admin-dashboard',
      icon: BarChart3,
      description: 'Vista general del sistema'
    },
    {
      name: 'Empresas',
      href: '/app/admin/companies',
      icon: Building2,
      description: 'Gestión de empresas'
    },
    {
      name: 'Usuarios',
      href: '/app/admin/users',
      icon: Users,
      description: 'Usuarios del sistema'
    },
    {
      name: 'Estadísticas',
      href: '/app/admin/analytics',
      icon: TrendingUp,
      description: 'Analytics globales'
    },
    {
      name: 'Facturación',
      href: '/app/admin/billing',
      icon: CreditCard,
      description: 'Gestión de pagos'
    },
    {
      name: 'Sistema',
      href: '/app/admin/system',
      icon: Server,
      description: 'Estado del sistema'
    },
    {
      name: 'Logs',
      href: '/app/admin/logs',
      icon: FileText,
      description: 'Registros del sistema'
    },
    {
      name: 'Configuración',
      href: '/app/admin/settings',
      icon: Settings,
      description: 'Configuración global'
    },
    {
      name: 'Seguridad',
      href: '/app/admin/security',
      icon: Shield,
      description: 'Configuración de seguridad'
    },
    {
      name: 'Backup',
      href: '/app/admin/backup',
      icon: Database,
      description: 'Respaldo de datos'
    }
  ]

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Super Admin Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out shadow-xl`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700 bg-gray-900">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <Crown className="h-8 w-8 text-yellow-400" />
                <div>
                  <h1 className="text-lg font-bold text-white">Super Admin</h1>
                  <p className="text-xs text-gray-400">Humano SISU</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 text-gray-300 hover:text-white hover:bg-gray-700"
            >
              {sidebarOpen ? '←' : '→'}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {superAdminNavigation.map((item, index) => {
              const isActive = router.pathname === item.href
              return (
                <Link key={index} href={item.href} prefetch={false}>
                  <div
                    className={`group flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-yellow-500 text-gray-900 shadow-lg'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-white'
                    }`} />
                    {sidebarOpen && (
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.description}</div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-700 p-4">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900">
                      {user?.email?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-400">Super Administrador</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/app/dashboard')}
                    className="flex-1 text-xs bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                  >
                    Ver Dashboard Normal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex-1 text-xs bg-red-600 text-white border-red-600 hover:bg-red-700"
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="p-1 text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-semibold text-gray-900">
                Panel de Super Administrador
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Activity className="h-4 w-4" />
                <span>Sistema Activo</span>
              </div>
                <div className="h-6 w-px bg-gray-300" />
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('es-HN')}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
