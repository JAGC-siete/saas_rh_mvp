import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, CheckCircleIcon, CloudArrowUpIcon, ClockIcon, CurrencyDollarIcon, ShieldCheckIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

interface FormData {
  empleados: number
  empresa: string
  nombre: string
  contactoWhatsApp: string
  contactoEmail: string
  aceptaTrial: boolean
}

export default function ActivarPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    empleados: 1,
    empresa: '',
    nombre: '',
    contactoWhatsApp: '',
    contactoEmail: '',
    aceptaTrial: false
  })

  const handleEmpleadosChange = (value: number) => {
    setFormData(prev => ({ ...prev, empleados: Math.max(1, value) }))
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      const submitData = {
        empleados: formData.empleados,
        empresa: formData.empresa,
        nombre: formData.nombre,
        contactoWhatsApp: formData.contactoWhatsApp,
        contactoEmail: formData.contactoEmail,
        aceptaTrial: formData.aceptaTrial
      }

      // Aquí iría la llamada a tu API
      const response = await fetch('/api/activar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        setIsSuccess(true)
        // Webhook se dispara automáticamente desde el backend
      } else {
        throw new Error('Error al enviar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Hubo un error. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })
  
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-app relative">
        <CloudBackground />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                ¡Listo, {formData.nombre}!
              </h1>
              <p className="text-xl text-brand-300 mb-8">
                Acabamos de crear tu entorno. Te mandamos el acceso por WhatsApp y email.
              </p>
            </div>

            <Card variant="glass" className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Siguiente paso (opcional):
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <button className="bg-brand-600 hover:bg-brand-700 text-white p-4 rounded-lg font-semibold transition-colors">
                    🚀 Ir a mi dashboard
                  </button>
                  <button className="glass border border-brand-600/30 text-white hover:border-brand-500 p-4 rounded-lg font-semibold transition-all">
                    📊 Subir plantilla
                  </button>
                  <button className="glass border border-brand-600/30 text-white hover:border-brand-500 p-4 rounded-lg font-semibold transition-all">
                    🎯 Pedir demo 15 min
                  </button>
                </div>
              </CardContent>
            </Card>

            <Link href="/landing" className="inline-flex items-center text-brand-300 hover:text-white transition-colors">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Volver a inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app relative">
      <Head>
        <title>Activa tu RH automático - HUMANO SISU</title>
        <meta
          name="description"
          content="Asistencia y planilla funcionando en menos de 24 h. Sin tarjeta. Sin compromiso."
        />
      </Head>

      <CloudBackground />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/landing" className="inline-flex items-center text-brand-300 hover:text-white mb-6 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a inicio
          </Link>
          
          <h1 className="text-5xl font-bold text-white mb-6">
            Activa tu RH automático hoy
          </h1>
          <p className="text-2xl text-brand-300 mb-8">
            Asistencia y planilla funcionando en menos de 24 h. Sin tarjeta. Sin compromiso.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg">
              Activar mi sistema ahora
            </button>
            <button className="glass border border-brand-600/30 text-white hover:border-brand-500 px-8 py-4 rounded-lg font-semibold text-lg transition-all">
              Quiero una demo de 15 min
            </button>
          </div>
        </div>

        {/* Sub-hero */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <Card variant="glass" className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-8">
              <p className="text-xl text-white mb-4">
                <span className="text-green-400 font-bold">"Paragon Financial redujo 80% el tiempo de planilla con SISU."</span>
              </p>
              <p className="text-brand-300">
                Seguridad: datos cifrados, roles y auditoría. Soporte por WhatsApp.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Cómo funciona (3 pasos)
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">1</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Déjanos tus datos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  Empresa, WhatsApp y email. Solo eso necesitamos para empezar.
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">2</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Acceso inmediato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  A tu entorno de prueba con datos demo funcionando.
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">3</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Operativo en 24h
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  Te lo dejamos corriendo con tus empleados reales.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Guarantee */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <Card variant="glass" className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                🛡️ Garantía de implementación
              </h3>
              <p className="text-xl text-white">
                Si no te lo dejamos funcionando, lo cerramos y listo. Cero costo.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trial modules */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Módulos incluidos en el trial
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <ClockIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Asistencia en tiempo real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  Entradas/salidas, tardanza con justificación.
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <DocumentTextIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Planilla legal HN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  IHSS, RAP, ISR; planilla de ejemplo lista.
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <CurrencyDollarIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Vouchers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  Activables al pasar a plan.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Form */}
        <div className="max-w-2xl mx-auto">
          <Card variant="glass">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Activa tu sistema (1 paso)
              </h2>

              <div className="space-y-6">
                {/* Company Name */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Empresa *
                  </label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    className="w-full p-3 rounded-lg glass border border-brand-600/30 text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    placeholder="Mi Empresa S.A."
                    required
                  />
                </div>

                {/* Contact Name */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Tu nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full p-3 rounded-lg glass border border-brand-600/30 text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    placeholder="María González"
                    required
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    WhatsApp (para login mágico) *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactoWhatsApp}
                    onChange={(e) => handleInputChange('contactoWhatsApp', e.target.value)}
                    className="w-full p-3 rounded-lg glass border border-brand-600/30 text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    placeholder="9999-9999"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Email (credenciales + facturación) *
                  </label>
                  <input
                    type="email"
                    value={formData.contactoEmail}
                    onChange={(e) => handleInputChange('contactoEmail', e.target.value)}
                    className="w-full p-3 rounded-lg glass border border-brand-600/30 text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    placeholder="admin@miempresa.com"
                    required
                  />
                </div>

                {/* Employee Count */}
                <div>
                  <label className="block text-white font-medium mb-2 text-center">
                    # empleados (solo para dimensionar)
                  </label>
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={() => handleEmpleadosChange(formData.empleados - 1)}
                      className="w-12 h-12 rounded-full glass border border-brand-600/30 hover:border-brand-500 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-brand-200"
                      disabled={formData.empleados <= 1}
                    >
                      -
                    </button>
                    
                    <div className="text-center">
                      <input
                        type="number"
                        value={formData.empleados}
                        onChange={(e) => handleEmpleadosChange(parseInt(e.target.value) || 1)}
                        className="w-24 h-16 text-3xl font-bold text-center glass border-2 border-brand-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all"
                        min="1"
                      />
                      <p className="text-brand-400 text-sm mt-2">empleados</p>
                    </div>
                    
                    <button
                      onClick={() => handleEmpleadosChange(formData.empleados + 1)}
                      className="w-12 h-12 rounded-full glass border border-brand-600/30 hover:border-brand-500 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-brand-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Trial Checkbox */}
                <div className="flex items-start space-x-3 p-4 glass rounded-lg border border-brand-500/30">
                  <input
                    type="checkbox"
                    id="acepta-trial"
                    checked={formData.aceptaTrial}
                    onChange={(e) => handleInputChange('aceptaTrial', e.target.checked)}
                    className="mt-1 w-5 h-5 text-brand-600 bg-brand-600/20 border-brand-500 rounded focus:ring-brand-500 focus:ring-2"
                    required
                  />
                  <label htmlFor="acepta-trial" className="text-white text-sm leading-relaxed">
                    ✅ Acepto activar un entorno de prueba por 7 días. Sin costo.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!formData.empresa || !formData.nombre || !formData.contactoWhatsApp || !formData.contactoEmail || !formData.aceptaTrial || isLoading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-lg font-semibold inline-flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creando tu entorno...
                    </>
                  ) : (
                    <>
                      🚀 Activar mi sistema ahora
                    </>
                  )}
                </button>

                <p className="text-brand-400 text-xs text-center">
                  Entorno de prueba por 7 días o 50 eventos. Puedes activarlo cuando quieras.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust indicators */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-6">
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <p className="font-medium text-white">Acceso inmediato</p>
                <p className="text-sm text-brand-300">Dashboard funcionando en segundos</p>
              </CardContent>
            </Card>
            
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <ShieldCheckIcon className="h-6 w-6 text-brand-400" />
                </div>
                <p className="font-medium text-white">Sin compromiso</p>
                <p className="text-sm text-brand-300">Prueba gratis por 7 días</p>
              </CardContent>
            </Card>
            
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <UserGroupIcon className="h-6 w-6 text-purple-400" />
                </div>
                <p className="font-medium text-white">Soporte incluido</p>
                <p className="text-sm text-brand-300">Te ayudamos a implementar</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
