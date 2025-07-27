import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Clock, Users, Settings, Shield, ArrowRight, LogOut, DollarSign, BarChart3, Building2 } from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <ProtectedRoute>
      <Head>
        <title>Dashboard - Sistema HR</title>
        <meta name="description" content="Panel de administración del sistema de recursos humanos" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Sistema de Recursos Humanos
                </h1>
                <p className="text-blue-300 mt-1">
                  Panel de administración - Bienvenido {user?.name}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-mono text-blue-400 font-semibold">
                    {new Date().toLocaleTimeString('es-HN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
                <Button 
                  onClick={logout}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent border-gray-600 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-400 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Administrative Modules */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  Módulos Administrativos
                </h2>
                <p className="text-blue-300 text-lg">Gestión completa del sistema</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Link href="/employees">
                <Card className="group hover:shadow-2xl hover:shadow-green-500/20 hover:scale-105 transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                        <Users className="w-8 h-8" />
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-xl text-green-400 font-bold mt-4">Gestión de Empleados</CardTitle>
                    <CardDescription className="text-gray-300">Administrar información de personal</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/attendance">
                <Card className="group hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-105 transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                        <Clock className="w-8 h-8" />
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-xl text-blue-400 font-bold mt-4">Control de Asistencia</CardTitle>
                    <CardDescription className="text-gray-300">Monitoreo de entradas y salidas</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/attendance-smart">
                <Card className="group hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-105 transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                        <Shield className="w-8 h-8" />
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-xl text-purple-400 font-bold mt-4">Asistencia Inteligente</CardTitle>
                    <CardDescription className="text-gray-300">Sistema avanzado con análisis de patrones</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/payroll">
                <Card className="group hover:shadow-2xl hover:shadow-orange-500/20 hover:scale-105 transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
                        <DollarSign className="w-8 h-8" />
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-orange-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-xl text-orange-400 font-bold mt-4">Nómina</CardTitle>
                    <CardDescription className="text-gray-300">Gestión de salarios y pagos</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/reports">
                <Card className="group hover:shadow-2xl hover:shadow-red-500/20 hover:scale-105 transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                        <BarChart3 className="w-8 h-8" />
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-red-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-xl text-red-400 font-bold mt-4">Reportes</CardTitle>
                    <CardDescription className="text-gray-300">Análisis y reportes del sistema</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings">
                <Card className="group hover:shadow-2xl hover:shadow-gray-500/20 hover:scale-105 transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg">
                        <Settings className="w-8 h-8" />
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-gray-300 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-xl text-gray-300 font-bold mt-4">Configuración</CardTitle>
                    <CardDescription className="text-gray-300">Ajustes del sistema</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </section>

          {/* Public Access - Quick Links */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  Acceso Rápido
                </h2>
                <p className="text-blue-300 text-lg">Enlaces directos a funciones públicas</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Link href="/registrodeasistencia">
                <Card className="group hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-105 transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                        <Clock className="w-8 h-8" />
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-xl text-blue-400 font-bold mt-4">Registro de Asistencia</CardTitle>
                    <CardDescription className="text-gray-300">Control de entrada y salida por DNI</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </section>

          {/* Status */}
          <section className="p-8 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700/50 rounded-2xl shadow-2xl backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              Estado del Sistema
            </h3>
            <div className="text-base space-y-3">
              <p className="font-semibold text-green-300 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                🔗 Migraciones sincronizadas correctamente
              </p>
              <p className="text-green-200 ml-5">Las tablas de Supabase están listas para usar</p>
              <p className="text-green-100 mt-4 font-medium ml-5">
                🎯 <strong>Sistema funcionando:</strong> Todas las funcionalidades disponibles
              </p>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} }
}
