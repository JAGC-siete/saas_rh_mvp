import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon, ShieldCheckIcon, UserGroupIcon, DocumentTextIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

interface FormData {
  empleados: number
  empresa: string
  nombre: string
  contactoWhatsApp: string
  contactoEmail: string
  aceptaTrial: boolean
}

interface ValidationErrors {
  contactoEmail?: string
}

export default function ActivarPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState<FormData>({
    empleados: 1,
    empresa: '',
    nombre: '',
    contactoWhatsApp: '',
    contactoEmail: '',
    aceptaTrial: true
  })

  const handleEmpleadosChange = (value: number) => {
    setFormData(prev => ({ ...prev, empleados: Math.max(1, value) }))
  }

  const validateField = (field: keyof FormData, value: string | boolean) => {
    const newErrors = { ...errors }
    switch (field) {
      case 'contactoEmail': {
        const v = (typeof value === 'string' ? value : '').trim()
        if (!v) newErrors.contactoEmail = '¿Cuál es tu correo electrónico?'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) newErrors.contactoEmail = 'Por favor ingresa un email válido'
        else delete newErrors.contactoEmail
        break
      }
    }
    setErrors(newErrors)
    return newErrors
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'contactoEmail') validateField(field, value)
  }

  const handleSubmit = async () => {
    const currentErrors = validateField('contactoEmail', formData.contactoEmail)
    if (Object.keys(currentErrors).length > 0) return

    setIsLoading(true)
    try {
      const submitData = {
        empleados: formData.empleados,
        empresa: formData.empresa || '',
        nombre: formData.nombre || '',
        contactoWhatsApp: formData.contactoWhatsApp || '',
        contactoEmail: formData.contactoEmail,
        aceptaTrial: formData.aceptaTrial || false
      }

      const response = await fetch('/api/activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        setIsSuccess(true)
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
                ¡Activación recibida, {formData.nombre || 'Equipo'}!
              </h1>
              <p className="text-xl text-brand-300 mb-8">
                Estamos creando tu entorno de RH. Te enviaremos acceso por email{formData.contactoWhatsApp && formData.contactoWhatsApp.trim() ? ' y WhatsApp' : ''}. Empezamos con asistencia y planilla. Sin tarjeta. Sin compromiso.
              </p>
            </div>

            <Card variant="glass" className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Garantía: 24 horas o trabajo gratis hasta dejarlo andando
                </h2>
                <p className="text-lg text-brand-300 mb-6">
                  Si en tu caso necesitamos más ajustes, seguimos trabajando sin costo adicional hasta que tu proceso quede funcionando. Tu riesgo es cero.
                </p>
                <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="text-center">
                    <p className="text-sm text-brand-300">WhatsApp</p>
                    <p className="text-xs text-brand-400">+504 9470-7007</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-brand-300">Email</p>
                    <p className="text-xs text-brand-400">jorge7gomez@gmail.com</p>
                  </div>
                </div>
                <p className="text-sm text-brand-400 text-center mt-6">
                  Solo email requerido. Puedes completar el resto luego desde tu dashboard.
                </p>
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
        <title>Automatizo tu planilla en 24 horas (o trabajo gratis) - HUMANO SISU</title>
        <meta
          name="description"
          content="Automatizo tu asistencia y planilla en 24 horas o trabajo gratis hasta dejarlo funcionando. Solo email para empezar. Sin tarjeta. Infra tipo AWS, datos cifrados, roles y auditoría."
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
            Automatizo tu planilla en 24 horas<br className="hidden md:block" />
            <span className="text-brand-300">o trabajo gratis hasta lograrlo</span>
          </h1>
          <p className="text-2xl text-brand-300 mb-8">
            Empieza con tu email. Recibes un entorno de prueba, datos demo y acompañamiento. Sin tarjeta. Sin compromiso.
          </p>
        </div>

        {/* Main Form */}
        <div className="max-w-2xl mx-auto mb-16">
          <Card variant="glass">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Activa tu sistema (solo email)
              </h2>

              <div className="space-y-6">
                {/* Company Name */}
                <div>
                  <label className="block text-white font-medium mb-2">Empresa (opcional)</label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    className="w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all border-brand-600/30"
                    placeholder="Mi Empresa S.A."
                  />
                  <p className="text-brand-400 text-sm mt-2">Nombre legal de tu empresa (opcional)</p>
                </div>

                {/* Contact Name */}
                <div>
                  <label className="block text-white font-medium mb-2">Tu nombre (opcional)</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all border-brand-600/30"
                    placeholder="María González"
                  />
                  <p className="text-brand-400 text-sm mt-2">Para personalizar el contacto (opcional)</p>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-white font-medium mb-2">WhatsApp (login y soporte) (opcional)</label>
                  <input
                    type="tel"
                    value={formData.contactoWhatsApp}
                    onChange={(e) => handleInputChange('contactoWhatsApp', e.target.value)}
                    className="w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all border-brand-600/30"
                    placeholder="+504 9999-9999"
                  />
                  <p className="text-brand-400 text-sm mt-2">Formato: +504 9999-9999 (opcional)</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-medium mb-2">Email (credenciales) *</label>
                  <input
                    type="email"
                    value={formData.contactoEmail}
                    onChange={(e) => handleInputChange('contactoEmail', e.target.value)}
                    className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all ${
                      errors.contactoEmail ? 'border-red-500/50' : 'border-brand-600/30'
                    }`}
                    placeholder="admin@miempresa.com"
                    required
                  />
                  {errors.contactoEmail && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      {errors.contactoEmail}
                    </p>
                  )}
                  <p className="text-brand-400 text-sm mt-2">Te enviaremos las credenciales aquí</p>
                </div>

                {/* Employee Count */}
                <div>
                  <label className="block text-white font-medium mb-2 text-center"># empleados (para dimensionar) (opcional)</label>
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
                      <p className="text-brand-400 text-xs mt-1">Para dimensionar la carga (opcional)</p>
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
                    onChange={(e) => handleInputChange('aceptaTrial', e.target.value)}
                    className="mt-1 w-5 h-5 text-brand-600 bg-brand-600/20 border-brand-500 rounded focus:ring-brand-500 focus:ring-2"
                  />
                  <label htmlFor="acepta-trial" className="text-white text-sm leading-relaxed">
                    Deseo activar un entorno de prueba por 30 días. Sin costo.
                  </label>
                  <p className="text-brand-400 text-xs mt-2 ml-8">Acceso completo al sistema por 30 días</p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!formData.contactoEmail || isLoading || Object.keys(errors).length > 0}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-lg font-semibold inline-flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creando tu entorno...
                    </>
                  ) : (
                    <>
                      <RocketLaunchIcon className="h-5 w-5 mr-2" /> Automatízame en 24 horas
                    </>
                  )}
                </button>

                {errors.contactoEmail && (
                  <p className="text-red-400 text-sm text-center mt-4 flex items-center justify-center">
                    Por favor, ingresa un email válido para continuar
                  </p>
                )}
                
                <p className="text-brand-400 text-xs text-center">
                  Sin tarjeta. Puedes cancelar cuando quieras. Empezamos con asistencia y planilla; vouchers se habilitan al pasar a plan.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sub-hero / Social proof */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <Card variant="glass" className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-8">
              <p className="text-xl text-white mb-4">
                <span className="text-green-400 font-bold">“Reducimos 80% el tiempo de planilla con SISU.”</span> — Paragon Financial Corp
              </p>
              <p className="text-brand-300">
                Infraestructura estilo AWS, datos cifrados en tránsito y en reposo, control de roles. Soporte por email o WhatsApp.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            ¿Cómo funciona?
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">1</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Deja tu email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">Creamos tu entorno de prueba con datos demo. Sin tarjeta.</p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">2</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Llamada de 15 minutos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">Parametrizamos deducciones y horarios. Sin reuniones eternas.</p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">3</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Entrega en 24 horas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">Asistencia y planilla operando. Vouchers listos para enviar.</p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">4</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  O trabajo gratis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">Si falta algo para tu caso, seguimos sin costo hasta dejarlo andando.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Guarantee */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <Card variant="glass" className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                Garantía 24h o Gratis
              </h3>
              <p className="text-xl text-white">
                Alcance del arranque: registro de asistencia en tiempo real, cálculo de planilla con deducciones legales de Honduras y generación de vouchers en PDF. Si no queda funcionando, no pagas.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trial modules */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Qué incluye tu trial
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
                <p className="text-brand-300">Entradas/salidas, tardanza con justificación y reportes básicos.</p>
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
                <p className="text-brand-300">IHSS, RAP, ISR parametrizables; planilla de ejemplo lista para validar.</p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <CurrencyDollarIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Vouchers en PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">Descarga masiva y envío por email/WhatsApp cuando pases a plan.</p>
              </CardContent>
            </Card>
          </div>
        </div>




        {/* Trust indicators */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-6">
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <p className="font-medium text-white">Entrega en 24h</p>
                <p className="text-sm text-brand-300">O trabajamos gratis hasta lograrlo</p>
              </CardContent>
            </Card>
            
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <ShieldCheckIcon className="h-6 w-6 text-brand-400" />
                </div>
                <p className="font-medium text-white">Cifrado y roles</p>
                <p className="text-sm text-brand-300">Auditoría e infraestructura estilo AWS</p>
              </CardContent>
            </Card>
            
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <UserGroupIcon className="h-6 w-6 text-purple-400" />
                </div>
                <p className="font-medium text-white">Onboarding simple</p>
                <p className="text-sm text-brand-300">Solo email para empezar</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
