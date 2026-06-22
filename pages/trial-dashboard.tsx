import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import TrialEmployeeManager from '../components/TrialEmployeeManager'
import PayrollUploadStorage from '../components/PayrollUploadStorage'
import PublicPageShell from '../components/landing/PublicPageShell'

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
  const [showUploadModal, setShowUploadModal] = useState(false)
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
      <PublicPageShell centered showFooter={false}>
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white">Cargando tu trial...</p>
        </div>
      </PublicPageShell>
    )
  }

  if (error || !trialData) {
    return (
      <PublicPageShell centered showFooter={false}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Error en el Trial</h1>
          <p className="text-gray-300 mb-6">{error || 'No se pudo cargar la información del trial'}</p>
          <Button onClick={() => router.push('/activar')}>
            Volver a activar
          </Button>
        </div>
      </PublicPageShell>
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

        <PublicPageShell showFooter={false}>
          <header className="glass-modern border-b border-white/10 shadow-lg">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TrialEmployeeManager tenant={getTenantFromUrl()} />
          </div>
        </PublicPageShell>
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

        <PublicPageShell showFooter={false}>
          <header className="glass-modern border-b border-white/10 shadow-lg">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PayrollUploadStorage 
              tenantId={getTenantFromUrl()} 
              onUploadComplete={(uploadId) => {
                console.log('Upload completed:', uploadId)
                // Optionally redirect or show success message
              }}
            />
          </div>
        </PublicPageShell>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Trial Dashboard - {trialData.empresa} | SISU</title>
        <meta name="description" content="Dashboard de prueba para SISU - Sistema de Gestión de Recursos Humanos" />
      </Head>

      <PublicPageShell showFooter={false}>
        <header className="glass-modern border-b border-white/10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">👋 Bienvenido a SISU — Tu RH Automatizado en 24 h o Menos</h1>
                <p className="text-gray-300">Convertí tu planilla manual en un sistema automático alineado a normativa local y que se maneja solo</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Trial activado para</p>
                <p className="font-semibold text-white">{trialData.nombre}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Trial Status */}
          <Card variant="liquid" className="mb-8">
            <CardHeader>
              <CardTitle className="text-white">⏳ Tu demo ya está activa</CardTitle>
              <CardDescription className="text-gray-300">
                Tenés 30 días para ver cómo tu propio proceso se transforma.
                <br />
                <span className="text-emerald-400 font-semibold">🔥 Aprovechalo hoy mismo:</span> subí tu planilla y en 24 h te devolvemos tu entorno real automatizado.
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
            <Card variant="liquid" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  👩‍💼 Gestión de Empleados
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Explorá la modalidad planilla. SISU creará tu base de empleados automáticamente en 14 horas o menos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
                  Administra tu plantilla de personal
                </p>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveView('employees')}
                  >
                    Explorar Empleados
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card variant="liquid" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  🕒 Control de Asistencia
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Registro de entradas, salidas y ausencias automáticamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
                  Monitorea la asistencia en tiempo real
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

            <Card variant="liquid" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  💸 Gestión de Nómina
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Generación planillas legales con deducciones IHSS, RAP e ISR en 1 clic.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
                  Calcula y administra salarios
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
            <Card variant="liquid" className="hover:shadow-lg transition-shadow">
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
          <Card variant="liquid" className="mb-8">
            <CardHeader>
              <CardTitle className="text-white">⚡ Próximos pasos para automatizar tu RH (en menos de 24 h)</CardTitle>
              <CardDescription className="text-gray-300">
                <span className="text-emerald-400 font-semibold">🧠 Sin tarjetas. Sin compromisos. Solo resultados.</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/20 text-blue-400 rounded-full p-2 text-sm font-bold">1️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white">Activá tu entorno demo</h4>
                    <p className="text-sm text-gray-300">Probá asistencia y planilla reales.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/20 text-blue-400 rounded-full p-2 text-sm font-bold">2️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white">Enviá tu planilla actual (Excel o PDF)</h4>
                    <p className="text-sm text-gray-300">En 24 h te devolvemos tu proceso automatizado.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/20 text-blue-400 rounded-full p-2 text-sm font-bold">3️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white">Revisá resultados</h4>
                    <p className="text-sm text-gray-300">Si no liberamos el 80% de tus tareas, trabajamos gratis hasta lograrlo.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info + Direct Upload CTA */}
          <Card variant="liquid">
            <CardHeader>
              <CardTitle className="text-white">🔑 ¿Listo para dejar de hacer planillas manuales?</CardTitle>
              <CardDescription className="text-gray-300">
                Mandá tu planilla y automatizamos tu RH en menos de 24 h.
                <br />
                <span className="text-emerald-400 font-semibold">💡 Garantía SISU:</span> 30 días con dinero de regreso si no cumplimos lo acordado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-2">💬 WhatsApp</h4>
                  <a 
                    href="https://wa.me/50432226773?text=Hola%20Jorge,%20ya%20vi%20el%20demo%20de%20SISU.%0A%0AQuiero%20dejar%20de%20hacer%20planillas%20manuales%20y%20tener%20todo%20automatizado%20antes%20de%20mañana.%0A%0ADecime%20qué%20necesitás%20para%20arrancar." 
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
                    href="mailto:jorgearturo@humanosisu.net?subject=Automatización%20RH%20-%20Trial%20SISU&body=Hola%20Jorge,%0A%0AYa%20vi%20el%20demo%20de%20SISU.%0A%0AQuiero%20dejar%20de%20hacer%20planillas%20manuales%20y%20tener%20todo%20automatizado%20antes%20de%20mañana.%0A%0ADecime%20qué%20necesitás%20para%20arrancar.%0A%0ASaludos"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    jorgearturo@humanosisu.net
                  </a>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">📎 Subí tu planilla de pago (Excel o PDF)</h4>
                  <p className="text-gray-300 text-sm mb-3">Activá tu entorno real con tus propios datos. El sistema procesa automáticamente todo por ti.</p>
                  <div className="max-w-md">
                    {/* Botón verde CTA */}
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setShowUploadModal(true)}
                    >
                      📄 Subir Planilla
                    </Button>
                    {/* Modal de carga: reutiliza la vista upload compacta */}
                    {showUploadModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl">
                          <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-white font-semibold">Subir Planilla</h3>
                            <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cerrar</Button>
                          </div>
                          <div className="p-4">
                            <PayrollUploadStorage 
                              tenantId={getTenantFromUrl()} 
                              variant="compact"
                              onUploadComplete={() => {
                                // Mantener modal abierto para ver confirmación; el usuario puede cerrarlo
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicPageShell>
    </>
  )
}


