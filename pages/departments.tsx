import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Building2, Plus, Users, Settings, BarChart3, Clock, DollarSign, FileText, User, Calendar, Clipboard, LogOut } from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../lib/auth'

export default function Departments() {
  const { user, logout } = useAuth()

  return (
    <ProtectedRoute>
      <Head>
        <title>Departamentos - HR SaaS</title>
        <meta name="description" content="Gestión de departamentos" />
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
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Link>
              <Link href="/employees" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-1">
                <Users className="w-4 h-4" />
                Empleados
              </Link>
              <Link href="/departments" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg mb-1">
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Departamentos</h1>
                <p className="text-gray-600 mt-1">Gestión de departamentos y áreas organizacionales</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Departamento
              </Button>
            </div>
          </header>

          <div className="p-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Lista de Departamentos</CardTitle>
                <CardDescription className="text-gray-600">
                  Administra los departamentos de tu organización
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">No hay departamentos registrados</p>
                  <p className="text-gray-400">Comienza agregando el primer departamento</p>
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Departamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} }
}
