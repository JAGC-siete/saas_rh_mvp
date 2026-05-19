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
  Activity,
  Mail,
  Layers
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
      href: '/app/admin',
      icon: BarChart3,
      description: 'Vista general del sistema'
    },
    {
      name: 'Ventas',
      href: '/app/admin/ventas-config',
      icon: DollarSign,
      description: 'Configurar /ventas'
    },
    {
      name: 'Afiliados',
      href: '/app/admin/affiliates',
      icon: Users,
      description: 'Gestión de afiliados'
    },
    {
      name: 'Mail List',
      href: '/app/admin/mail-list',
      icon: Mail,
      description: 'Gestión de suscripciones'
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
      name: 'Planes y módulos',
      href: '/app/admin/plan-features',
      icon: Layers,
      description: 'Segmentación por categoría de servicio'
    },
    {
      name: 'Permisos de campo',
      href: '/app/admin/role-field-permissions',
      icon: Key,
      description: 'Salario y campos sensibles por rol'
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
    },
    {
      name: 'Tablas de Impuestos',
      href: '/app/admin/tax-brackets',
      icon: FileText,
      description: 'Gestión de tablas ISR por año'
    }
  ]

  return (
    <div className="min-h-screen flex overflow-hidden bg-app text-white relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_45%),_radial-gradient(circle_at_bottom,_rgba(59,130,246,0.2),_transparent_50%)]" />

      {/* Super Admin Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} relative glass-strong border-r border-white/10 transition-all duration-300 ease-in-out shadow-glass`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 bg-white/5 backdrop-blur-lg">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <Crown className="h-8 w-8 text-amber-300" />
                <div>
                  <h1 className="text-lg font-bold text-white">Super Admin</h1>
                  <p className="text-xs text-white/70">Humano SISU</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 text-white/70 hover:text-white hover:bg-white/10"
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
                        ? 'bg-white/90 text-slate-900 shadow-lg'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-slate-900' : 'text-white/50 group-hover:text-white'
                    }`} />
                    {sidebarOpen && (
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-white/60">{item.description}</div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-white/10 p-4">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-900">
                      {user?.email?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-white/60">Super Administrador</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/app/dashboard')}
                    className="flex-1 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    Ver Dashboard Normal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex-1 text-xs bg-rose-500/90 text-white border-rose-400 hover:bg-rose-500"
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-900">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="p-1 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Bar */}
        <header className="glass border border-white/10 shadow-glass">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Crown className="h-6 w-6 text-amber-300" />
                <h2 className="text-xl font-semibold text-white">
                  Panel de Super Administrador
                </h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-white/70">
                  <Activity className="h-4 w-4" />
                  <span>Sistema Activo</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div className="text-sm text-white/70">
                  {new Date().toLocaleDateString('es-HN', { timeZone: 'America/Tegucigalpa' })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8 relative">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(800px_400px_at_80%_0%,rgba(255,255,255,0.08),transparent),radial-gradient(700px_500px_at_0%_50%,rgba(59,130,246,0.12),transparent)]" />
          <div className="relative space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
