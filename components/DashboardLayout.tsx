import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { 
  UserIcon, 
  ClockIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  UsersIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { TrophyIcon } from '@heroicons/react/24/solid'
import { supabase } from '../lib/supabase'

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface UserPermissions {
  dashboard?: boolean
  employees?: boolean
  departments?: boolean
  attendance?: boolean
  leave?: boolean
  payroll?: boolean
  reports?: boolean
  gamification?: boolean
  settings?: boolean
  admin?: boolean
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({})
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const router = useRouter()

  // Obtener permisos del usuario
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user?.id) return
      
      try {
        setLoadingPermissions(true)
        console.log('🔍 Fetching permissions for user:', user.id, user.email)
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('permissions, role')
          .eq('id', user.id)
          .single()
        
        console.log('📋 Permissions query result:', { data, error })

        if (error || !data) {
          if (error) {
            console.error('Error fetching user permissions:', error)
          } else {
            console.warn('No user profile data found, using default permissions')
          }
          // Usar permisos por defecto si hay error o no hay data
          setUserPermissions({
            dashboard: true,
            employees: true,
            departments: true,
            attendance: true,
            leave: true,
            payroll: true,
            reports: true,
            gamification: true,
            settings: false,
            admin: false
          })
        } else {
          // Verificar que data.permissions existe antes de usarlo
          const permissions = data.permissions || {
            dashboard: true,
            employees: true,
            departments: true,
            attendance: true,
            leave: true,
            payroll: true,
            reports: true,
            gamification: true,
            settings: false,
            admin: false
          }
          
          // Determinar permiso de admin basado en el rol
          const isAdmin = ['super_admin', 'company_admin', 'hr_manager'].includes(data.role || '')
          permissions.admin = isAdmin
          
          setUserPermissions(permissions)
        }
      } catch (error) {
        console.error('Error in fetchUserPermissions:', error)
        // Usar permisos por defecto si hay error
        setUserPermissions({
          dashboard: true,
          employees: true,
          departments: true,
          attendance: true,
          leave: true,
          payroll: true,
          reports: true,
          gamification: true,
          settings: false
        })
      } finally {
        setLoadingPermissions(false)
      }
    }

    fetchUserPermissions()
  }, [user?.id])

  const handleSignOut = async () => {
    await logout()
    router.push('/app/login')
  }

  // Definir navegación con permisos
  const navigationItems = [
    { name: 'Dashboard', href: '/app/dashboard', icon: ChartBarIcon, permission: 'dashboard' },
    { name: 'Empleados', href: '/app/employees', icon: UsersIcon, permission: 'employees' },
    { name: 'Departamentos', href: '/app/departments', icon: UsersIcon, permission: 'departments' },
    { name: 'Asistencia', href: '/app/attendance/dashboard', icon: ClockIcon, permission: 'attendance' },
    { name: 'Permisos', href: '/app/leave', icon: UserIcon, permission: 'leave' },
    { name: 'Nómina', href: '/app/payroll', icon: CurrencyDollarIcon, permission: 'payroll' },
    { name: 'Reportes', href: '/app/reports', icon: ChartBarIcon, permission: 'reports' },
    { name: 'Gamificación', href: '/app/gamification', icon: TrophyIcon, permission: 'gamification' },
    { name: 'Administración', href: '/app/admin', icon: ShieldCheckIcon, permission: 'admin' },
    { name: 'Configuración', href: '/app/settings', icon: Cog6ToothIcon, permission: 'settings' },
  ]

  // Filtrar navegación basada en permisos
  const filteredNavigation = navigationItems.filter(item => {
    if (loadingPermissions) return true // Mostrar todo mientras carga
    return userPermissions[item.permission as keyof UserPermissions] !== false
  })

  return (
    <div className="h-screen flex overflow-hidden bg-app">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} glass-strong border-r border-white/10 transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Header (sin logo) */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
            <div />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 text-gray-200 hover:text-white hover:bg-white/10"
            >
              {sidebarOpen ? '←' : '→'}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredNavigation.map((item, index) => {
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={`nav-${index}`}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand-900 text-white'
                      : 'text-gray-200 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={(e) => {
                    // Add explicit handling to ensure clicks are properly processed
                    e.stopPropagation()
                  }}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-brand-400' : 'text-gray-300 group-hover:text-brand-400'
                    }`}
                  />
                  {sidebarOpen && item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="flex-shrink-0 border-t border-white/10 p-4">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-brand-900 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                    <p className="text-xs text-gray-300">Usuario</p>
                  </div>
                </div>
                <Button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 text-white bg-red-600 hover:bg-red-700 border-red-600"
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="h-8 w-8 rounded-full bg-brand-900 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  title="Cerrar sesión"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="h-full">
          {children}
        </main>
      </div>
    </div>
  )
} 