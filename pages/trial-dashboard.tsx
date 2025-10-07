import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import TrialEmployeeManager from '../components/TrialEmployeeManager'
import PayrollUploadStorage from '../components/PayrollUploadStorage'

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
  const [activeView, setActiveView] = useState<'dashboard' | 'employees' | 'upload'>('dashboard')
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
      // Obtener datos REALES de la empresa del trial
      const url = `/api/trial/attendance?tenant=${tenantId}`
      console.log('📡 Fetching from:', url)
      
      const response = await fetch(url)
      console.log('📥 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Trial data received:', data)
        
        // Extraer información de la empresa demo
        const trialData = {
          empresa: 'DEMO EMPRESARIAL - Datos de Prueba',
          nombre: 'Usuario Trial',
          empleados: data.kpis.totalEmployees,
          tenant_id: tenantId,
          trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
          magic_link: '#'
        }
        
        setTrialData(trialData)
      } else {
        const errorText = await response.text()
        console.error('❌ API error:', response.status, errorText)
        setError('No se pudo cargar la información del trial')
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

  const getTenantFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('tenant') || trialData?.tenant_id || ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white">Cargando tu trial...</p>
        </div>
      </div>
    )
  }

  if (error || !trialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Error en el Trial</h1>
          <p className="text-gray-300 mb-6">{error || 'No se pudo cargar la información del trial'}</p>
          <Button onClick={() => router.push('/activar')}>
            Volver a activar
          </Button>
        </div>
      </div>
    )
  }

  // Si estamos en la vista de empleados, mostrar el componente
  if (activeView === 'employees') {
    return (
      <>
        <Head>
          <title>Gestión de Empleados (Trial) - {trialData.empresa} | SISU</title>
          <meta name="description" content="Gestión de empleados para entorno de prueba SISU" />
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
          {/* Header */}
          <header className="glass-strong border-b border-white/10 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-white">👥 Gestión de Empleados (Trial)</h1>
                  <p className="text-gray-300">Empresa: <strong>{trialData.empresa}</strong></p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveView('upload')}
                  >
                    📄 Subir Planilla
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveView('dashboard')}
                  >
                    ← Volver al Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TrialEmployeeManager tenant={getTenantFromUrl()} />
          </main>
        </div>
      </>
    )
  }

  // Si estamos en la vista de upload, mostrar el componente de carga
  if (activeView === 'upload') {
    return (
      <>
        <Head>
          <title>Subir Planilla - {trialData.empresa} | SISU</title>
          <meta name="description" content="Sube tu planilla para automatizar tu entorno de producción" />
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
          {/* Header */}
          <header className="glass-strong border-b border-white/10 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-white">📄 Subir Planilla de Pago</h1>
                  <p className="text-gray-300">Empresa: <strong>{trialData.empresa}</strong></p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveView('employees')}
                  >
                    👥 Ver Empleados
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveView('dashboard')}
                  >
                    ← Volver al Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PayrollUploadStorage 
              tenantId={getTenantFromUrl()} 
              onUploadComplete={(uploadId) => {
                console.log('Upload completed:', uploadId)
                // Optionally redirect or show success message
              }}
            />
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Trial Dashboard - {trialData.empresa} | SISU</title>
        <meta name="description" content="Dashboard de prueba para SISU - Sistema de Gestión de Recursos Humanos" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Header */}
        <header className="glass-strong border-b border-white/10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">🎉 ¡Bienvenido a SISU!</h1>
                <p className="text-gray-300">Empresa: <strong>{trialData.empresa}</strong></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Trial activado para</p>
                <p className="font-semibold text-white">{trialData.nombre}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Trial Status */}
          <Card variant="glass" className="mb-8">
            <CardHeader>
              <CardTitle className="text-white">🎯 Estado de tu Trial</CardTitle>
              <CardDescription className="text-gray-300">
                Tu período de prueba está activo y funcionando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{trialData.empleados}</div>
                  <div className="text-sm text-gray-300">Empleados configurados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{trialData.tenant_id}</div>
                  <div className="text-sm text-gray-300">ID de Tenant</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {formatDate(trialData.trial_expires_at)}
                  </div>
                  <div className="text-sm text-gray-300">Expira el</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card variant="glass" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  👥 Gestión de Empleados
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Administra tu plantilla de personal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
                  Crea, edita y gestiona la información de tus empleados de manera eficiente.
                </p>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveView('employees')}
                  >
                    Explorar Empleados
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full bg-green-600/20 border-green-500/50 text-green-400 hover:bg-green-600/30"
                    onClick={() => setActiveView('upload')}
                  >
                    📄 Subir Planilla
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  ⏰ Control de Asistencia
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Monitorea la asistencia en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
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

            <Card variant="glass" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  💰 Gestión de Nómina
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Calcula y administra salarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
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
            <Card variant="glass" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  🏆 Gamificación
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Puntos y logros de empleados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
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
          <Card variant="glass" className="mb-8">
            <CardHeader>
              <CardTitle className="text-white">🚀 Próximos pasos para automatizar tu RH (en menos de 24 h)</CardTitle>
              <CardDescription className="text-gray-300">
                Sigue estos pasos para automatizar completamente tu gestión de recursos humanos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/20 text-blue-400 rounded-full p-2 text-sm font-bold">1️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white">Activá tu entorno demo</h4>
                    <p className="text-sm text-gray-300">Ya tenés los datos de prueba, probá cómo se genera asistencia y planilla real. <strong className="text-green-400">Es gratis 30 días.</strong></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/20 text-blue-400 rounded-full p-2 text-sm font-bold">2️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white">Enviá tu planilla actual (Excel o PDF)</h4>
                    <p className="text-sm text-gray-300">En 24 h te devolvemos tu mismo proceso automatizado. <strong className="text-green-400">Usalo sin tarjeta ni compromisos gratis por 30 días.</strong></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/20 text-blue-400 rounded-full p-2 text-sm font-bold">3️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white">Revisá resultados</h4>
                    <p className="text-sm text-gray-300">Si no automatizamos el 80% de tus tareas repetitivas, trabajamos gratis hasta lograrlo.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">📞 ¿Listo para dejar de hacer planillas manuales?</CardTitle>
              <CardDescription className="text-gray-300">
                Contactanos ahora y automatizamos tu RH en menos de 24 horas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-2">💬 WhatsApp</h4>
                  <a 
                    href="https://wa.me/50494707007?text=Hola%20Jorge,%20ya%20vi%20el%20demo%20de%20SISU.%0A%0AQuiero%20dejar%20de%20hacer%20planillas%20manuales%20y%20tener%20todo%20automatizado%20antes%20de%20mañana.%0A%0ADecime%20qué%20necesitás%20para%20arrancar." 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    (+504) 9470-7007
                  </a>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">📧 Email</h4>
                  <a 
                    href="mailto:jorge7gomez@gmail.com?subject=Automatización%20RH%20-%20Trial%20SISU&body=Hola%20Jorge,%0A%0AYa%20vi%20el%20demo%20de%20SISU.%0A%0AQuiero%20dejar%20de%20hacer%20planillas%20manuales%20y%20tener%20todo%20automatizado%20antes%20de%20mañana.%0A%0ADecime%20qué%20necesitás%20para%20arrancar.%0A%0ASaludos"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    jorge7gomez@gmail.com
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  )
}


