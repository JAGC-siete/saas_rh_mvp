import { useState } from 'react'
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
  BuildingOfficeIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { TrophyIcon } from '@heroicons/react/24/solid'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  const handleSignOut = async () => {
    await logout()
    router.push('/app/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: ChartBarIcon },
    { name: 'Empleados', href: '/app/employees', icon: UsersIcon },
    { name: 'Departamentos', href: '/app/departments', icon: BuildingOfficeIcon },
    { name: 'Asistencia', href: '/attendance/dashboard', icon: ClockIcon },
    { name: 'Permisos', href: '/app/leave', icon: UserIcon },
    { name: 'Nómina', href: '/app/payroll', icon: CurrencyDollarIcon },
    { name: 'Reportes', href: '/app/reports', icon: ChartBarIcon },
    { name: 'Gamificación', href: '/app/gamification', icon: TrophyIcon },
    { name: 'Configuración', href: '/app/settings', icon: Cog6ToothIcon },
  ]

  return (
    <div className="h-screen flex overflow-hidden bg-app">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} glass-strong border-r border-white/10 transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-8 w-8 text-brand-400" />
              </div>
              {sidebarOpen && (
                <div className="ml-3">
                  <h1 className="text-xl font-semibold text-white">HR SaaS</h1>
                </div>
              )}
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
            {navigation.map((item, index) => {
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
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-brand-900 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              {sidebarOpen && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-gray-300 truncate capitalize">
                    Employee
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="mt-3 w-full justify-start text-gray-200 hover:text-white hover:bg-white/10"
              >
                <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
} 