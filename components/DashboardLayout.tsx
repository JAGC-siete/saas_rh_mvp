import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { SessionExpiryWarning, useSessionExpiryMonitor } from './SessionExpiryWarning'
import { SessionStatusIndicator } from './SessionStatusIndicator'
import { 
  UserIcon, 
  ClockIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  UsersIcon,
  GiftIcon
} from '@heroicons/react/24/outline'
import { TrophyIcon } from '@heroicons/react/24/solid'

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
  affiliates?: boolean // Add affiliates permission
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, userProfile, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Estado inicial con permisos por defecto para company_admin
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    dashboard: true,
    employees: true,
    departments: true,
    attendance: true,
    leave: true,
    payroll: true,
    reports: true,
    gamification: true,
    settings: true, // Por defecto true, se ajustará según rol
    admin: true,    // Por defecto true, se ajustará según rol
    affiliates: true // Show affiliates link to all users
  })
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const router = useRouter()
  
  // Session expiry monitoring for 90-min idle timeout
  // Note: The SessionExpiryWarning component handles this automatically
  // when added to the layout (pages/_app.tsx)

  // Obtener permisos del usuario
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user?.id) return
      
      try {
        setLoadingPermissions(true)
        console.log('🔍 Fetching permissions for user:', user.id, user.email)
        
        // Primero intentar usar userProfile del contexto de auth
        if (userProfile) {
          console.log('✅ Using userProfile from auth context:', userProfile)
          let rawPermissions: any = {}
          if (userProfile.permissions) {
            if (typeof userProfile.permissions === 'string') {
              try {
                rawPermissions = JSON.parse(userProfile.permissions)
              } catch (e) {
                console.error('Error parsing permissions JSON:', e)
                rawPermissions = {}
              }
            } else {
              rawPermissions = userProfile.permissions
            }
          }
          
          const normalizedRole = (userProfile.role || '').toString().trim().toLowerCase()
          const isAdmin = ['super_admin', 'company_admin', 'hr_manager', 'admin'].includes(normalizedRole)
          const canAccessSettings = ['super_admin', 'company_admin', 'admin'].includes(normalizedRole)
          const canAccessReports =
            ['super_admin', 'company_admin', 'hr_manager', 'manager', 'admin'].includes(normalizedRole) ||
            rawPermissions.can_view_reports === true ||
            rawPermissions.can_export_reports === true

          const permissions: UserPermissions = {
            dashboard: true,
            employees: true,
            departments: true,
            attendance: true,
            leave: true,
            payroll: true,
            reports: canAccessReports,
            gamification: true,
            settings: canAccessSettings,
            admin: isAdmin,
            affiliates: true // Show affiliates link to all users
          }
          
          setUserPermissions(permissions)
          setLoadingPermissions(false)
          return
        }
        
        // Si no hay userProfile en el contexto, usar la API
        console.log('⚠️ No userProfile in context, fetching from API...')
        const response = await fetch('/api/user-profiles')
        
        if (!response.ok) {
          console.error('Error fetching user profile from API:', response.status)
          console.warn('No user profile data found, using default permissions')
          setLoadingPermissions(false)
          return
        }
        
        const { profiles } = await response.json()
        const profile = profiles?.[0]
        
        if (!profile) {
          console.warn('No user profile data found, using default permissions')
          setLoadingPermissions(false)
          return
        }
        
        console.log('📋 Profile from API:', profile)
        
        // Parsear permissions si viene como string JSON
        let rawPermissions: any = {}
        if (profile.permissions) {
          if (typeof profile.permissions === 'string') {
            try {
              rawPermissions = JSON.parse(profile.permissions)
            } catch (e) {
              console.error('Error parsing permissions JSON:', e)
              rawPermissions = {}
            }
          } else {
            rawPermissions = profile.permissions
          }
        }
        
        console.log('📦 Raw permissions from DB:', rawPermissions)
        console.log('👤 User role:', profile.role, 'Type:', typeof profile.role)
        
        // CRÍTICO: Normalizar el rol (trim, lowercase) para comparación robusta
        const normalizedRole = (profile.role || '').toString().trim().toLowerCase()
        console.log('🔍 Normalized role:', normalizedRole)
        
        // CRÍTICO: Determinar permisos basados en el rol PRIMERO (antes del merge)
        const isAdmin = ['super_admin', 'company_admin', 'hr_manager', 'admin'].includes(normalizedRole)
        const canAccessSettings = ['super_admin', 'company_admin', 'admin'].includes(normalizedRole)
        const canAccessReports =
          ['super_admin', 'company_admin', 'hr_manager', 'manager', 'admin'].includes(normalizedRole) ||
          rawPermissions.can_view_reports === true ||
          rawPermissions.can_export_reports === true

        console.log('🔐 Permission checks:', { isAdmin, canAccessSettings, canAccessReports, normalizedRole })

        // Construir objeto de permisos final - FORZAR settings y admin basado en rol
        const permissions: UserPermissions = {
          dashboard: true,
          employees: true,
          departments: true,
          attendance: true,
          leave: true,
          payroll: true,
          reports: canAccessReports,
          gamification: true,
          // CRÍTICO: Forzar estos valores basado en rol, ignorar lo que venga de la DB
          settings: canAccessSettings,
          admin: isAdmin,
          affiliates: true // Show affiliates link to all users
        }
        
        console.log('✅ Final permissions FORCED by role:', {
          originalRole: profile.role,
          normalizedRole,
          permissions,
          isAdmin,
          canAccessSettings,
          settingsValue: permissions.settings,
          adminValue: permissions.admin,
          note: 'settings and admin are FORCED by role, ignoring DB values'
        })
        
        setUserPermissions(permissions)
      } catch (error) {
        console.error('Error in fetchUserPermissions:', error)
        // En caso de error, mantener permisos por defecto (ya están en el estado inicial)
        // No resetear a false porque puede causar que desaparezcan las opciones
        console.warn('⚠️ Error loading permissions, keeping default permissions')
      } finally {
        setLoadingPermissions(false)
      }
    }

    fetchUserPermissions()
  }, [user?.id, userProfile])

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
    { name: '13 & 14 Salario', href: '/app/13-14-salario', icon: GiftIcon, permission: 'payroll' },
    { name: 'Reportes', href: '/app/reports', icon: DocumentChartBarIcon, permission: 'reports' },
    // { name: 'Gamificación', href: '/app/gamification', icon: TrophyIcon, permission: 'gamification' },
    // { name: 'Programa de Afiliados', href: '/app/affiliates', icon: CurrencyDollarIcon, permission: 'affiliates' },
    { name: 'Parametros', href: '/app/settings', icon: Cog6ToothIcon, permission: 'settings' },
  ]

  // Filtrar navegación basada en permisos
  const filteredNavigation = navigationItems.filter(item => {
    if (loadingPermissions) return true // Mostrar todo mientras carga
    
    const hasPermission = userPermissions[item.permission as keyof UserPermissions]
    
    // CRÍTICO: Mostrar si es true, o si no está definido (asumir true por defecto)
    // SOLO ocultar si es explícitamente false
    const shouldShow = hasPermission !== false
    
    // Debug logging SOLO para items que se están filtrando
    if (!shouldShow) {
      console.log(`🚫 Filtering out: ${item.name}`, {
        permission: item.permission,
        value: hasPermission,
        type: typeof hasPermission,
        allPermissions: userPermissions
      })
    }
    
    return shouldShow
  })
  
  // Debug: mostrar navegación filtrada
  useEffect(() => {
    if (!loadingPermissions) {
      console.log('📋 Filtered navigation items:', filteredNavigation.map(item => item.name))
      console.log('🔑 Current user permissions:', userPermissions)
    }
  }, [filteredNavigation, userPermissions, loadingPermissions])

  return (
    <div className="h-screen flex overflow-hidden bg-app">
      {/* Hot zone invisible para activar hover en desktop */}
      <div className="sidebar-hover-zone" aria-hidden="true" />
      
      {/* Sidebar */}
      <div className={`dashboard-sidebar ${sidebarOpen ? 'w-64' : 'w-16'} glass-strong border-r border-white/10 transition-all duration-300 ease-in-out`}>
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
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-brand-400' : 'text-gray-300 group-hover:text-brand-400'
                    }`}
                  />
                  <span className={`nav-text-hidden whitespace-nowrap ${!sidebarOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="flex-shrink-0 border-t border-white/10 p-4 relative">
            {/* Vista completa - visible cuando sidebarOpen es true o en hover */}
            <div className={`user-section-full transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-brand-900 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                    <p className="text-xs text-gray-300">Usuario</p>
                  </div>
                </div>
                <SessionStatusIndicator />
                <Button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 text-white bg-red-600 hover:bg-red-700 border-red-600"
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
            
            {/* Vista compacta - visible cuando sidebarOpen es false y sin hover */}
            <div className={`user-section-compact transition-opacity duration-200 ${!sidebarOpen ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
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
            </div>
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