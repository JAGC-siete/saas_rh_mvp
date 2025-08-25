import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

interface TrialData {
  empresa: string
  nombre: string
  empleados: number
  tenant_id: string
  trial_expires_at: string
  magic_link: string
}



export default function TrialDashboard() {
  const [trialData, setTrialData] = useState<TrialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  console.log('🎯 TrialDashboard renderizado')

  useEffect(() => {
    console.log('🔍 useEffect ejecutándose...')
    
    // Obtener parámetros directamente de la URL
    const urlParams = new URLSearchParams(window.location.search)
    const tenant = urlParams.get('tenant')
    const trial = urlParams.get('trial')
    
    console.log('📋 Trial params de URL:', { tenant, trial })

    if (!tenant || trial !== 'true') {
      console.log('❌ Invalid trial link:', { tenant, trial })
      setError('Enlace de trial inválido')
      setLoading(false)
      return
    }

    console.log('✅ Valid params, fetching trial data for:', tenant)
    // Buscar datos del trial en la base de datos
    fetchTrialData(tenant)
  }, []) // Solo ejecutar una vez al montar

  const fetchTrialData = async (tenantId: string) => {
    console.log('🚀 fetchTrialData called with tenantId:', tenantId)
    try {
      const url = `/api/trial/validate?tenant=${tenantId}`
      console.log('📡 Fetching from:', url)
      
      const response = await fetch(url)
      console.log('📥 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Trial data received:', data)
        setTrialData(data)
      } else {
        const errorText = await response.text()
        console.error('❌ API error:', response.status, errorText)
        setError('No se pudo validar el trial')
      }
    } catch (err) {
      console.error('💥 Fetch error:', err)
      setError('Error conectando con el servidor')
    } finally {
      console.log('🏁 Setting loading to false')
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tu trial...</p>
        </div>
      </div>
    )
  }

  if (error || !trialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error en el Trial</h1>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar la información del trial'}</p>
          <Button onClick={() => router.push('/activar')}>
            Volver a activar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Trial Dashboard - {trialData.empresa} | SISU</title>
        <meta name="description" content="Dashboard de prueba para SISU - Sistema de Gestión de Recursos Humanos" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🎉 ¡Bienvenido a SISU!</h1>
                <p className="text-gray-600">Empresa: <strong>{trialData.empresa}</strong></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Trial activado para</p>
                <p className="font-semibold text-gray-900">{trialData.nombre}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Trial Status */}
          <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">🎯 Estado de tu Trial</CardTitle>
              <CardDescription className="text-green-700">
                Tu período de prueba está activo y funcionando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{trialData.empleados}</div>
                  <div className="text-sm text-green-700">Empleados configurados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{trialData.tenant_id}</div>
                  <div className="text-sm text-blue-700">ID de Tenant</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatDate(trialData.trial_expires_at)}
                  </div>
                  <div className="text-sm text-orange-700">Expira el</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  👥 Gestión de Empleados
                </CardTitle>
                <CardDescription>
                  Administra tu plantilla de personal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Crea, edita y gestiona la información de tus empleados de manera eficiente.
                </p>
                <Button variant="outline" className="w-full">
                  Explorar Empleados
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  ⏰ Control de Asistencia
                </CardTitle>
                <CardDescription>
                  Monitorea la asistencia en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Registra entradas, salidas y genera reportes de asistencia automáticamente.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search)
                    const tenant = params.get('tenant') || trialData.tenant_id
                    window.location.href = `/trial/attendance?tenant=${encodeURIComponent(tenant)}`
                  }}
                >
                  Ver Asistencia
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  💰 Gestión de Nómina
                </CardTitle>
                <CardDescription>
                  Calcula y administra salarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Genera nóminas, calcula deducciones y mantén el control de los pagos.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search)
                    const tenant = params.get('tenant') || trialData.tenant_id
                    window.location.href = `/trial/payroll?tenant=${encodeURIComponent(tenant)}`
                  }}
                >
                  Gestionar Nómina
                </Button>
              </CardContent>
            </Card>

            {/* Gamificación Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  🏆 Gamificación
                </CardTitle>
                <CardDescription>
                  Puntos y logros de empleados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Revisa el leaderboard y los puntos por departamentos.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search)
                    const tenant = params.get('tenant') || trialData.tenant_id
                    window.location.href = `/trial/gamification?tenant=${encodeURIComponent(tenant)}`
                  }}
                >
                  Ver Gamificación
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">🚀 Próximos Pasos</CardTitle>
              <CardDescription className="text-blue-700">
                Para aprovechar al máximo tu trial, te recomendamos:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold">1</div>
                  <div>
                    <h4 className="font-semibold text-blue-800">Explora las Funciones</h4>
                    <p className="text-sm text-blue-700">Navega por todas las funcionalidades disponibles en tu trial.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold">2</div>
                  <div>
                    <h4 className="font-semibold text-blue-800">Importa tus Empleados</h4>
                    <p className="text-sm text-blue-700">Sube tu plantilla de empleados o pide que te carguemos datos de ejemplo.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold">3</div>
                  <div>
                    <h4 className="font-semibold text-blue-800">Agenda una Demo</h4>
                    <p className="text-sm text-blue-700">Reserva 15 minutos para que te expliquemos todas las funcionalidades.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">📞 ¿Necesitas Ayuda?</CardTitle>
              <CardDescription className="text-green-700">
                Estamos aquí para ayudarte a aprovechar al máximo SISU
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-green-800 mb-2">📧 Email de Soporte</h4>
                  <p className="text-green-700">soporte@humanosisu.net</p>
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 mb-2">📱 WhatsApp</h4>
                  <p className="text-green-700">+504 9999-9999</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  )
}


