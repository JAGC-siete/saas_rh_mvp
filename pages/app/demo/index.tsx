import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import DemoFooter from '../../../components/DemoFooter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import EmployeeManager from '../../../components/EmployeeManager'
import AttendanceManager from '../../../components/AttendanceManager'
import PayrollManager from '../../../components/PayrollManager'
import ReportsManager from '../../../components/ReportsManager'
import { ChartBarIcon, UsersIcon, ClockIcon, CurrencyDollarIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface DemoStats {
  totalEmployees: number
  activeEmployees: number
  presentToday: number
  lateToday: number
  totalPayroll: number
  attendanceRate: number
}

export default function Demo() {
  const [stats, setStats] = useState<DemoStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    totalPayroll: 0,
    attendanceRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [mswReady, setMswReady] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const router = useRouter()

  // Initialize demo mode
  useEffect(() => {
    // In demo mode, we use dedicated API endpoints
    // No need for MSW anymore
    setMswReady(true)
  }, [])

  // Load demo stats when MSW is ready
  useEffect(() => {
    if (!mswReady) return

    const loadDemoStats = async () => {
      setLoading(true)
      try {
        console.log('🔄 Loading demo statistics...')
        
        // Load employees using demo API
        const employeesResponse = await fetch('/api/demo/employees')
        console.log('📊 Employees response:', employeesResponse.status)
        const employeesData = await employeesResponse.json()
        const employees = employeesData.data || []

        // Load attendance for today using demo API
        const today = new Date().toISOString().split('T')[0]
        const attendanceResponse = await fetch(`/api/demo/attendance?from=${today}&to=${today}`)
        console.log('📊 Attendance response:', attendanceResponse.status)
        const attendanceData = await attendanceResponse.json()
        const todayAttendance = attendanceData.data || []

        // Load payroll using demo API
        const payrollResponse = await fetch('/api/demo/payroll')
        console.log('📊 Payroll response:', payrollResponse.status)
        const payrollData = await payrollResponse.json()
        const payroll = payrollData.data

        // Calculate stats
        const totalEmployees = employees.length
        const activeEmployees = employees.filter((emp: any) => emp.status === 'active').length
        const presentToday = todayAttendance.length
        const lateToday = todayAttendance.filter((att: any) => att.late_minutes > 0).length
        const totalPayroll = payroll ? payroll.totals.net : 0
        const attendanceRate = activeEmployees > 0 ? (presentToday / activeEmployees) * 100 : 0

        setStats({
          totalEmployees,
          activeEmployees,
          presentToday,
          lateToday,
          totalPayroll,
          attendanceRate: Math.round(attendanceRate)
        })
        
        console.log('✅ Demo statistics loaded:', { totalEmployees, activeEmployees, presentToday, totalPayroll })
      } catch (error) {
        console.error('Error loading demo stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDemoStats()
  }, [mswReady])

  if (!mswReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Iniciando demo...</p>
        </div>
      </div>
    )
  }

  const DemoBanner = () => (
    <div className="glass-strong border-b border-white/10 text-white p-4 text-center">
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-semibold">Demo — Datos de ejemplo. Nada se guarda.</span>
      </div>
      <p className="text-sm opacity-90 mt-1">
        Explora todas las funciones con datos reales anonimizados
      </p>
    </div>
  )

  const DashboardContent = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Empleados</CardTitle>
            <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{loading ? '...' : stats.totalEmployees}</div>
            <p className="text-xs text-gray-300">
              {stats.activeEmployees} activos
            </p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Presentes Hoy</CardTitle>
            <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{loading ? '...' : stats.presentToday}</div>
            <p className="text-xs text-gray-300">
              {stats.attendanceRate}% asistencia
            </p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Llegadas Tarde</CardTitle>
            <svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{loading ? '...' : stats.lateToday}</div>
            <p className="text-xs text-gray-300">
              Empleados tarde hoy
            </p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Nómina Actual</CardTitle>
            <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : `L ${stats.totalPayroll.toLocaleString()}`}
            </div>
            <p className="text-xs text-gray-300">
              Quincenal actual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button 
          className="h-auto p-6 flex-col space-y-2" 
          variant="outline"
          onClick={() => setActiveTab('employees')}
        >
          <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <span className="font-medium">Gestionar Empleados</span>
        </Button>

        <Button 
          className="h-auto p-6 flex-col space-y-2" 
          variant="outline"
          onClick={() => setActiveTab('attendance')}
        >
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="font-medium">Control Asistencia</span>
        </Button>

        <Button 
          className="h-auto p-6 flex-col space-y-2" 
          variant="outline"
          onClick={() => setActiveTab('payroll')}
        >
          <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <span className="font-medium">Gestionar Nómina</span>
        </Button>

        <Button 
          className="h-auto p-6 flex-col space-y-2" 
          variant="outline"
          onClick={() => setActiveTab('reports')}
        >
          <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="font-medium">Ver Reportes</span>
        </Button>
      </div>

      {/* Call to Action */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">¿Te gusta lo que ves?</h3>
              <p className="text-gray-300 mt-1">
                Solicita tu demo personalizada con tus propios datos
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => window.open('https://wa.me/50433651991?text=Hola,%20quiero%20mi%20demo%20personalizada%20de%20Humano%20SISU', '_blank')}
            >
              Solicitar Demo Real
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'employees':
        return <EmployeeManager />
      case 'attendance':
        return <AttendanceManager />
      case 'payroll':
        return <PayrollManager />
      case 'reports':
        return <ReportsManager />
      default:
        return <DashboardContent />
    }
  }

  return (
    <>
      <Head>
        <title>Demo Interactivo - Humano SISU</title>
        <meta name="description" content="Demo interactivo del sistema de recursos humanos Humano SISU" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <DemoBanner />
        
        <div className="flex">
          {/* Demo Sidebar */}
          <div className="w-64 glass-strong border-r border-white/10">
            <nav className="mt-8 space-y-1">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
                { id: 'employees', name: 'Empleados', icon: UsersIcon },
                { id: 'attendance', name: 'Asistencia', icon: ClockIcon },
                { id: 'payroll', name: 'Nómina', icon: CurrencyDollarIcon },
                { id: 'reports', name: 'Reportes', icon: DocumentTextIcon }
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-4 py-2 text-left text-sm font-medium ${
                      activeTab === item.id
                        ? 'bg-white/20 text-white border-r-2 border-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                )
              })}
            </nav>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-8">
            {renderContent()}
          </div>
        </div>
        
        <DemoFooter />
      </div>
    </>
  )
}
