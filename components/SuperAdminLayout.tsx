import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import AppMeshShell from './landing/AppMeshShell'
import {
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Shield,
  Building2,
  Database,
  CreditCard,
  TrendingUp,
  Server,
  Key,
  FileText,
  BookOpen,
  Crown,
  Activity,
  Mail,
  Layers,
  LifeBuoy,
  Send,
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

  const superAdminNavigation = [
    { name: 'Super Admin Panel', href: '/app/admin', icon: BarChart3, description: 'Vista general del sistema' },
    { name: 'Ventas', href: '/app/admin/ventas-config', icon: DollarSign, description: 'Configurar /ventas' },
    { name: 'Afiliados', href: '/app/admin/affiliates', icon: Users, description: 'Gestión de afiliados' },
    { name: 'Leads marketing', href: '/app/admin/mail-list', icon: Mail, description: 'Secuencia de email y suscriptores' },
    { name: 'Comunicaciones', href: '/app/admin/communications', icon: Send, description: 'Campañas y secuencias de adopción' },
    { name: 'Recursos SEO', href: '/app/admin/recursos', icon: BookOpen, description: 'Artículos públicos en /recursos' },
    { name: 'Soporte', href: '/app/admin/support', icon: LifeBuoy, description: 'Cola de tickets de soporte' },
    { name: 'Empresas', href: '/app/admin/companies', icon: Building2, description: 'Gestión de empresas' },
    { name: 'Usuarios', href: '/app/admin/users', icon: Users, description: 'Usuarios del sistema' },
    { name: 'Estadísticas', href: '/app/admin/analytics', icon: TrendingUp, description: 'Analytics globales' },
    { name: 'Facturación', href: '/app/admin/billing', icon: CreditCard, description: 'Gestión de pagos' },
    { name: 'Planes y módulos', href: '/app/admin/plan-features', icon: Layers, description: 'Segmentación por categoría de servicio' },
    { name: 'Permisos de campo', href: '/app/admin/role-field-permissions', icon: Key, description: 'Salario y campos sensibles por rol' },
    { name: 'Sistema', href: '/app/admin/system', icon: Server, description: 'Estado del sistema' },
    { name: 'Logs', href: '/app/admin/logs', icon: FileText, description: 'Registros del sistema' },
    { name: 'Configuración', href: '/app/admin/settings', icon: Settings, description: 'Configuración global' },
    { name: 'Seguridad', href: '/app/admin/security', icon: Shield, description: 'Configuración de seguridad' },
    { name: 'Backup', href: '/app/admin/backup', icon: Database, description: 'Respaldo de datos' },
    { name: 'Tablas de Impuestos', href: '/app/admin/tax-brackets', icon: FileText, description: 'Gestión de tablas ISR por año' },
  ]

  return (
    <AppMeshShell>
      <aside
        className={`${sidebarOpen ? 'w-80' : 'w-16'} relative glass-modern border-r border-white/10 transition-all duration-300 ease-in-out shadow-glass z-20 shrink-0`}
      >
        <div className="flex flex-col h-full min-h-screen">
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 bg-white/5 backdrop-blur-lg">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <Crown className="h-8 w-8 text-amber-300" aria-hidden />
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
              aria-label={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
            >
              {sidebarOpen ? '←' : '→'}
            </Button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {superAdminNavigation.map((item) => {
              const isActive = router.pathname === item.href
              return (
                <Link key={item.href} href={item.href} prefetch={false}>
                  <div
                    className={`group flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-600/20 text-white border border-brand-400/30 shadow-sm'
                        : 'text-white/70 hover:bg-white/10 hover:text-white border border-transparent'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        isActive ? 'text-brand-400' : 'text-white/50 group-hover:text-white'
                      }`}
                      aria-hidden
                    />
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-white/60 truncate">{item.description}</div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-slate-900">
                      {user?.email?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.email}</p>
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
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">
        <header className="glass-modern border-b border-white/10 shadow-glass shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 min-w-0">
                <Crown className="h-6 w-6 text-amber-300 shrink-0" aria-hidden />
                <h2 className="text-xl font-semibold text-white truncate">Panel de Super Administrador</h2>
              </div>
              <div className="flex items-center space-x-4 shrink-0 text-sm text-white/70">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" aria-hidden />
                  <span>Sistema Activo</span>
                </div>
                <div className="h-6 w-px bg-white/20" aria-hidden />
                <time dateTime={new Date().toISOString()}>
                  {new Date().toLocaleDateString('es-HN', { timeZone: 'America/Tegucigalpa' })}
                </time>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8 relative">
          <div className="relative space-y-6">{children}</div>
        </main>
      </div>
    </AppMeshShell>
  )
}
