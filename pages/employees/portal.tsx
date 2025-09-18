import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import EmployeeLogin from '../../components/employee-portal/EmployeeLogin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { 
  UserIcon, 
  ClockIcon, 
  CurrencyDollarIcon, 
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { clientLogger } from '../../lib/logger-client'

interface EmployeeSession {
  sessionToken: string
  employee: {
    id: string
    name: string
    dni_masked: string
    role: string
    department?: string
  }
  expiresAt: string
}

interface EmployeeProfile {
  employee: {
    id: string
    name: string
    dni_masked: string
    role: string
    email?: string
    phone?: string
    hire_date?: string
    department?: {
      id: string
      name: string
    }
    work_schedule?: {
      id: string
      name: string
      [key: string]: any
    }
    base_salary_masked: boolean
    status: string
  }
}

interface AttendanceSummary {
  summary: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    totalHours: number
    averageHours: number
  }
}

export default function EmployeePortal() {
  const [session, setSession] = useState<EmployeeSession | null>(null)
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'payroll'>('profile')
  const router = useRouter()

  // Check for existing session on load
  useEffect(() => {
    checkExistingSession()
  }, [])

  // Fetch data when session is available
  useEffect(() => {
    if (session) {
      fetchEmployeeData()
    }
  }, [session])

  const checkExistingSession = async () => {
    try {
      // Check if we have a Supabase session
      const response = await fetch('/api/employees/me', {
        credentials: 'include' // Include cookies for Supabase Auth
      })

      if (response.ok) {
        const data = await response.json()
        const employeeData = data.employee
        
        // Store employee data and create session object
        localStorage.setItem('employee_data', JSON.stringify(employeeData))
        
        setSession({
          sessionToken: 'supabase_managed',
          employee: employeeData,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours from now
        })
      } else {
        // No valid session, clear any stored data
        clearSession()
      }
    } catch (error) {
      console.error('Error checking session:', error)
      clearSession()
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployeeData = async () => {
    if (!session) return

    try {
      // Fetch profile (Supabase Auth handles authentication via cookies)
      const profileResponse = await fetch('/api/employees/me', {
        credentials: 'include'
      })

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData)
      }

      // Fetch attendance summary
      const attendanceResponse = await fetch('/api/employees/me/attendance?limit=1', {
        credentials: 'include'
      })

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        setAttendanceSummary(attendanceData)
      }

    } catch (error) {
      console.error('Error fetching employee data:', error)
    }
  }

  const handleLoginSuccess = (sessionData: EmployeeSession) => {
    setSession(sessionData)
    clientLogger.info('Employee portal access', {
      employeeId: sessionData.employee.id,
      employeeName: sessionData.employee.name
    })
    
    // Wait a bit for cookies to be set, then fetch data
    setTimeout(() => {
      fetchEmployeeData()
    }, 1000)
  }

  const handleLogout = async () => {
    try {
      // Call logout API (Supabase Auth handles session cleanup)
      await fetch('/api/employees/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearSession()
      router.reload()
    }
  }

  const clearSession = () => {
    // Only clear employee data - Supabase Auth handles its own cookies
    localStorage.removeItem('employee_data')
    setSession(null)
    setProfile(null)
    setAttendanceSummary(null)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificado'
    return new Date(dateString).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getAttendancePercentage = () => {
    if (!attendanceSummary?.summary.totalDays) return 0
    return Math.round((attendanceSummary.summary.presentDays / attendanceSummary.summary.totalDays) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
      </div>
    )
  }

  if (!session) {
    return <EmployeeLogin onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Portal de Empleados</h1>
                <p className="text-sm text-gray-300">Paragon Honduras</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{session.employee.name}</p>
                <p className="text-xs text-gray-300">{session.employee.role}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bienvenido, {session.employee.name.split(' ')[0]}
          </h2>
          <p className="text-gray-300">
            Acceda a su información personal, asistencia y más.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-strong">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Asistencia del Mes</p>
                  <p className="text-2xl font-bold text-white">
                    {getAttendancePercentage()}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CalendarDaysIcon className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Días Trabajados</p>
                  <p className="text-2xl font-bold text-white">
                    {attendanceSummary?.summary.presentDays || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Horas Totales</p>
                  <p className="text-2xl font-bold text-white">
                    {Math.round((attendanceSummary?.summary.totalHours || 0) * 10) / 10}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          {[
            { id: 'profile', label: 'Mi Perfil', icon: UserIcon },
            { id: 'attendance', label: 'Mi Asistencia', icon: ClockIcon },
            { id: 'payroll', label: 'Mi Nómina', icon: CurrencyDollarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'profile' && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-white">Información Personal</CardTitle>
                <CardDescription className="text-gray-300">
                  Sus datos personales y de contacto
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Nombre Completo</label>
                        <p className="text-white font-medium">{profile.employee.name}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">DNI</label>
                        <p className="text-white font-medium">{profile.employee.dni_masked}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">Cargo</label>
                        <p className="text-white font-medium">{profile.employee.role}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">Departamento</label>
                        <p className="text-white font-medium">
                          {profile.employee.department?.name || 'Sin asignar'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Email</label>
                        <p className="text-white font-medium">{profile.employee.email || 'No especificado'}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">Teléfono</label>
                        <p className="text-white font-medium">{profile.employee.phone || 'No especificado'}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">Fecha de Contratación</label>
                        <p className="text-white font-medium">{formatDate(profile.employee.hire_date)}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400">Horario de Trabajo</label>
                        <p className="text-white font-medium">
                          {profile.employee.work_schedule?.name || 'Sin asignar'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'attendance' && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-white">Mi Asistencia</CardTitle>
                <CardDescription className="text-gray-300">
                  Registro de asistencia del mes actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Funcionalidad en Desarrollo
                  </h3>
                  <p className="text-gray-300">
                    Pronto podrá ver su historial detallado de asistencia
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'payroll' && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-white">Mi Nómina</CardTitle>
                <CardDescription className="text-gray-300">
                  Información sobre sus pagos y deducciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CurrencyDollarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Funcionalidad en Desarrollo
                  </h3>
                  <p className="text-gray-300">
                    Pronto podrá consultar sus recibos de pago
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
