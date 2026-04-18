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
  CalendarDaysIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  UsersIcon,
  GiftIcon,
  BanknotesIcon,
  CalculatorIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'
import { TrophyIcon } from '@heroicons/react/24/solid'
import NotificationBell from './ui/NotificationBell'
import { normalizePermissionsToCanonical } from '../lib/security/canonical-permissions'

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
  /**
   * Feature flags derived from the company's plan + per-company overrides
   * (resolved via has_feature() in the DB). `null` while loading so items with
   * a mapped feature_key are shown optimistically and hidden only once we know
   * the plan excludes them.
   */
  const [companyFeatures, setCompanyFeatures] = useState<Record<string, boolean> | null>(null)
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
        // #region agent log
        fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'25b418',runId:'pre-fix',hypothesisId:'H1',location:'components/DashboardLayout.tsx:fetchUserPermissions(entry)',message:'Entered fetchUserPermissions',data:{hasUserProfile:!!userProfile,userIdPresent:!!user?.id,path:typeof window!=='undefined'?window.location.pathname:null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        
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
          const canonical = normalizePermissionsToCanonical(normalizedRole, rawPermissions)
          const isAdmin = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'admin'].includes(normalizedRole)
          // #region agent log
          fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'25b418',runId:'pre-fix',hypothesisId:'H2',location:'components/DashboardLayout.tsx:userProfileBranch',message:'Computed canonical permissions (userProfile branch)',data:{normalizedRole,hasRawPermissions:!!userProfile.permissions,rawPermissionKeys:Object.keys(rawPermissions||{}).slice(0,50),can_view_settings:canonical.can_view_settings,can_manage_settings:canonical.can_manage_settings,can_view_reports:canonical.can_view_reports,isAdmin},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log

          const permissions: UserPermissions = {
            dashboard: true,
            employees: true,
            departments: true,
            attendance: true,
            leave: true,
            payroll: true,
            reports: canonical.can_view_reports,
            gamification: true,
            settings: canonical.can_view_settings,
            admin: isAdmin,
            affiliates: true // Show affiliates link to all users
          }
          // #region agent log
          fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'25b418',runId:'pre-fix',hypothesisId:'H3',location:'components/DashboardLayout.tsx:userProfileBranch(setUserPermissions)',message:'Setting UI permissions (userProfile branch)',data:{settings:permissions.settings,reports:permissions.reports,admin:permissions.admin},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
          
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
        // CRITICAL: Pick the current user's profile (not the newest one in the company)
        const profile = (profiles || []).find((p: any) => p?.id === user?.id) || profiles?.[0]
        
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
        
        const canonical = normalizePermissionsToCanonical(normalizedRole, rawPermissions)
        const isAdmin = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'admin'].includes(normalizedRole)
        // #region agent log
        fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'25b418',runId:'pre-fix',hypothesisId:'H4',location:'components/DashboardLayout.tsx:apiProfileBranch',message:'Computed canonical permissions (API profile branch)',data:{normalizedRole,rawPermissionKeys:Object.keys(rawPermissions||{}).slice(0,50),can_view_settings:canonical.can_view_settings,can_manage_settings:canonical.can_manage_settings,can_view_reports:canonical.can_view_reports,isAdmin,selectedProfileId:profile?.id===user?.id?'self':'other'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log

        console.log('🔐 Permission checks:', { isAdmin, normalizedRole, can_view_settings: canonical.can_view_settings, can_view_reports: canonical.can_view_reports })

        // Construir objeto de permisos final - FORZAR settings y admin basado en rol
        const permissions: UserPermissions = {
          dashboard: true,
          employees: true,
          departments: true,
          attendance: true,
          leave: true,
          payroll: true,
          reports: canonical.can_view_reports,
          gamification: true,
          // Canonical can_* keys decide UX visibility (backend remains source of truth)
          settings: canonical.can_view_settings,
          admin: isAdmin,
          affiliates: true // Show affiliates link to all users
        }
        // #region agent log
        fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'25b418',runId:'pre-fix',hypothesisId:'H5',location:'components/DashboardLayout.tsx:apiProfileBranch(setUserPermissions)',message:'Setting UI permissions (API profile branch)',data:{settings:permissions.settings,reports:permissions.reports,admin:permissions.admin},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        
        console.log('✅ Final permissions FORCED by role:', {
          originalRole: profile.role,
          normalizedRole,
          permissions,
          isAdmin,
          settingsValue: permissions.settings,
          adminValue: permissions.admin,
          note: 'settings/reports are derived from canonical can_* (with legacy mapping)'
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

  // Pull effective feature flags (plan + overrides) from the backend so the
  // sidebar hides modules the company doesn't have access to.
  useEffect(() => {
    let cancelled = false
    const fetchFeatures = async () => {
      if (!user?.id) return
      try {
        const res = await fetch('/api/me/features', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) setCompanyFeatures({})
          return
        }
        const data = await res.json()
        if (!cancelled) setCompanyFeatures(data?.features || {})
      } catch (err) {
        console.warn('Error fetching company features', err)
        if (!cancelled) setCompanyFeatures({})
      }
    }
    fetchFeatures()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const handleSignOut = async () => {
    await logout()
    router.push('/app/login')
  }

  // Navigation: `permission` gates by role (from user_profiles.permissions / canonical keys),
  // `feature_key` gates by the company plan (via has_feature()). Leaving feature_key
  // undefined means the item is always visible to users who have the permission.
  const navigationItems: Array<{
    name: string
    href: string
    icon: any
    permission: keyof UserPermissions
    feature_key?: string
  }> = [
    { name: 'Dashboard',        href: '/app/dashboard',            icon: ChartBarIcon,          permission: 'dashboard' },
    { name: 'Empleados',        href: '/app/employees',            icon: UsersIcon,             permission: 'employees',  feature_key: 'employees' },
    { name: 'Departamentos',    href: '/app/departments',          icon: UsersIcon,             permission: 'departments', feature_key: 'departments' },
    { name: 'Asistencia',       href: '/app/attendance/dashboard', icon: ClockIcon,             permission: 'attendance',  feature_key: 'attendance' },
    { name: 'Permisos',         href: '/app/leave',                icon: UserIcon,              permission: 'leave' },
    { name: 'Nómina',           href: '/app/payroll',              icon: CurrencyDollarIcon,    permission: 'payroll',     feature_key: 'payroll' },
    { name: 'Cesantías',        href: '/app/cesantias',            icon: ScaleIcon,             permission: 'payroll',     feature_key: 'cesantias' },
    { name: 'Deducciones',      href: '/app/deducciones',          icon: BanknotesIcon,         permission: 'payroll',     feature_key: 'deducciones' },
    { name: '13 & 14 Salario',  href: '/app/13-14-salario',        icon: GiftIcon,              permission: 'payroll',     feature_key: 'decimo_13_14' },
    { name: 'Reportes',         href: '/app/reports',              icon: DocumentChartBarIcon,  permission: 'reports',     feature_key: 'reports' },
    { name: 'Contabilidad',     href: '/app/accounting',           icon: CalculatorIcon,        permission: 'settings',    feature_key: 'contabilidad' },
    // { name: 'Gamificación',  href: '/app/gamification',         icon: TrophyIcon,            permission: 'gamification' },
    // { name: 'Programa de Afiliados', href: '/app/affiliates',   icon: CurrencyDollarIcon,    permission: 'affiliates' },
    { name: 'Parametros',       href: '/app/settings',             icon: Cog6ToothIcon,         permission: 'settings' },
  ]

  // Filtrar navegación basada en permisos (rol) + features (plan/overrides).
  const filteredNavigation = navigationItems.filter(item => {
    if (loadingPermissions) return true // Mostrar todo mientras carga

    const hasPermission = userPermissions[item.permission as keyof UserPermissions]
    // Role-based gate: hide only on explicit false (undefined = show).
    if (hasPermission === false) {
      console.log(`🚫 Filtering out (role): ${item.name}`, {
        permission: item.permission,
        value: hasPermission,
        allPermissions: userPermissions
      })
      return false
    }

    // Plan-based gate via has_feature(). Skip while loading the matrix to avoid
    // a flash of an empty sidebar.
    if (item.feature_key && companyFeatures !== null) {
      const enabled = companyFeatures[item.feature_key]
      if (enabled === false) {
        return false
      }
    }

    return true
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
            <div className="text-sm font-semibold text-white/90">
              {sidebarOpen ? 'SISU' : 'S'}
            </div>
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
        <div className="sticky top-0 z-40 border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="h-16 px-4 flex items-center justify-end">
            <NotificationBell />
          </div>
        </div>
        <main className="h-full">
          {children}
        </main>
      </div>
      
    </div>
  )
} 