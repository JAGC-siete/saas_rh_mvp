import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Clock, Users, Settings, Shield, LogOut, DollarSign, BarChart3, Building2, FileText, User, Calendar, Clipboard } from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../lib/auth'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [dniInput, setDniInput] = useState('')

  return (
    <ProtectedRoute>
      <Head>
        <title>HR SaaS - Panel de Control</title>
        <meta name="description" content="Panel de control del sistema de recursos humanos" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">HR</span>
              </div>
              <span className="font-semibold text-gray-900">HR SaaS</span>
            </div>
          </div>
          
          <nav className="mt-6">
            <div className="px-3">
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg mb-1">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Link>
              <Link href="/employees" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <Users className="w-4 h-4" />
                Empleados
              </Link>
              <Link href="/departments" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <Building2 className="w-4 h-4" />
                Departamentos
              </Link>
              <Link href="/attendance" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <Clock className="w-4 h-4" />
                Asistencia
              </Link>
              <Link href="/leaves" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <Clipboard className="w-4 h-4" />
                Permisos
              </Link>
              <Link href="/payroll" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <DollarSign className="w-4 h-4" />
                Nómina
              </Link>
              <Link href="/reports" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <FileText className="w-4 h-4" />
                Reportes
              </Link>
              <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <Settings className="w-4 h-4" />
                Configuración
              </Link>
            </div>
          </nav>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500">Employee</p>
              </div>
            </div>
            <Button 
              onClick={logout}
              variant="ghost"
              className="w-full justify-start mt-2 text-gray-600 hover:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-gray-50">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Panel de Control</h1>
              <p className="text-gray-600 mt-1">Bienvenido al sistema de Recursos Humanos</p>
            </div>
          </header>

          <div className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white border border-gray-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Empleados Activos</CardDescription>
                  <CardTitle className="text-3xl font-bold text-blue-600">0</CardTitle>
                  <p className="text-sm text-gray-500">de 0 total</p>
                </CardHeader>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Asistencias Hoy</CardDescription>
                  <CardTitle className="text-3xl font-bold text-green-600">0</CardTitle>
                  <p className="text-sm text-gray-500">Registros de entrada</p>
                </CardHeader>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Nóminas Pendientes</CardDescription>
                  <CardTitle className="text-3xl font-bold text-orange-600">0</CardTitle>
                  <p className="text-sm text-gray-500">Por procesar</p>
                </CardHeader>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-gray-600">Ver Reportes</CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    <span className="text-sm text-gray-600">Analítica y métricas</span>
                  </div>
                </CardHeader>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Quick Actions */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/employees/new" className="block">
                    <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900">Registrar Nuevo Empleado</h4>
                      <p className="text-sm text-gray-600">Agregar un empleado al sistema</p>
                    </div>
                  </Link>
                  <Link href="/attendance" className="block">
                    <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900">Registrar Asistencia</h4>
                      <p className="text-sm text-gray-600">Marcar entrada o salida de empleados</p>
                    </div>
                  </Link>
                  <Link href="/payroll" className="block">
                    <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900">Procesar Nómina</h4>
                      <p className="text-sm text-gray-600">Generar nómina para empleados</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>

              {/* Attendance Check-in/out */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Attendance Check-in/out</CardTitle>
                  <CardDescription className="text-gray-600">
                    Enter the last 5 digits of your DNI to record attendance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last 5 digits of DNI
                      </label>
                      <input
                        type="text"
                        value={dniInput}
                        onChange={(e) => setDniInput(e.target.value)}
                        placeholder="12345"
                        maxLength={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                      />
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Record Attendance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Summary */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Today&apos;s Summary</CardTitle>
                  <CardDescription className="text-gray-600">Real-time attendance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">0</div>
                      <div className="text-sm text-gray-600">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">0</div>
                      <div className="text-sm text-gray-600">Late</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">0</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">0</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today's Attendance Records */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Today&apos;s Attendance Records</CardTitle>
                  <CardDescription className="text-gray-600">
                    Live view of all attendance records for {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-gray-600 font-medium">Employee</th>
                          <th className="text-left py-2 text-gray-600 font-medium">Status</th>
                          <th className="text-left py-2 text-gray-600 font-medium">Check-in</th>
                          <th className="text-left py-2 text-gray-600 font-medium">Check-out</th>
                          <th className="text-left py-2 text-gray-600 font-medium">Justification</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-500">
                            No attendance records for today yet.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} }
}
