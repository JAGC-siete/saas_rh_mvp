import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon, ShieldCheckIcon, UserGroupIcon, DocumentTextIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { TRIAL_CONFIG } from '../lib/config/trial'

interface FormData {
  empleados: number
  empresa: string
  nombre: string
  contactoWhatsApp: string
  contactoEmail: string
  departamentos: number
  aceptaTrial: boolean
}

interface ValidationErrors {
  contactoEmail?: string
  empresa?: string
  departamentos?: string
  contactoWhatsApp?: string
  empleados?: string
  submit?: string
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
    departamentos: 1,
    aceptaTrial: true
  })

  const handleEmpleadosChange = (value: number) => {
    const newValue = Math.max(TRIAL_CONFIG.MIN_EMPLOYEES, Math.min(TRIAL_CONFIG.MAX_EMPLOYEES, value))
    setFormData(prev => ({ ...prev, empleados: newValue }))
    validateField('empleados', newValue)
  }

  const handleDepartamentosChange = (value: number) => {
    const newValue = Math.max(TRIAL_CONFIG.MIN_DEPARTMENTS, Math.min(TRIAL_CONFIG.MAX_DEPARTMENTS, value))
    setFormData(prev => ({ ...prev, departamentos: newValue }))
    validateField('departamentos', newValue)
  }

  const validateField = (field: keyof FormData, value: string | boolean | number) => {
    const newErrors = { ...errors }
    switch (field) {
      case 'contactoEmail': {
        const v = (typeof value === 'string' ? value : '').trim()
        if (!v) {
          newErrors.contactoEmail = '✉️ Este campo es obligatorio. Necesitamos tu email para enviarte las credenciales de acceso.'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          newErrors.contactoEmail = '✉️ El formato del email no es válido. Ejemplo: nombre@empresa.com'
        } else {
          delete newErrors.contactoEmail
        }
        break
      }
      case 'empresa': {
        const v = (typeof value === 'string' ? value : '').trim()
        if (!v) {
          newErrors.empresa = '🏢 Este campo es obligatorio. Ingresa el nombre de tu empresa.'
        } else if (v.length < 2) {
          newErrors.empresa = '🏢 El nombre de la empresa debe tener al menos 2 caracteres.'
        } else if (v.length > 100) {
          newErrors.empresa = '🏢 El nombre de la empresa no puede tener más de 100 caracteres.'
        } else {
          delete newErrors.empresa
        }
        break
      }
      case 'departamentos': {
        const v = typeof value === 'number' ? value : 1
        if (v < 1) {
          newErrors.departamentos = '🏢 Debe haber al menos 1 departamento.'
        } else if (v > TRIAL_CONFIG.MAX_DEPARTMENTS) {
          newErrors.departamentos = `🏢 El número máximo de departamentos es ${TRIAL_CONFIG.MAX_DEPARTMENTS}.`
        } else {
          delete newErrors.departamentos
        }
        break
      }
      case 'empleados': {
        const v = typeof value === 'number' ? value : 1
        if (v < TRIAL_CONFIG.MIN_EMPLOYEES) {
          newErrors.empleados = `👥 Debe haber al menos ${TRIAL_CONFIG.MIN_EMPLOYEES} empleado.`
        } else if (v > TRIAL_CONFIG.MAX_EMPLOYEES) {
          newErrors.empleados = `👥 El número máximo de empleados es ${TRIAL_CONFIG.MAX_EMPLOYEES}.`
        } else {
          delete newErrors.empleados
        }
        break
      }
      case 'contactoWhatsApp': {
        const v = (typeof value === 'string' ? value : '').trim()
        if (v && v.length > 0) {
          const whatsappRegex = /^(\+504|504)?[0-9]{8}$/
          const cleaned = v.replace(/[-\s]/g, '')
          if (!whatsappRegex.test(cleaned)) {
            newErrors.contactoWhatsApp = '📱 Formato inválido. Usa: 9999-9999 o +50499999999'
          } else {
            delete newErrors.contactoWhatsApp
          }
        } else {
          delete newErrors.contactoWhatsApp
        }
        break
      }
    }
    setErrors(newErrors)
    return newErrors
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Validar en tiempo real para campos requeridos
    if (field === 'contactoEmail' || field === 'empresa' || field === 'departamentos' || field === 'empleados' || field === 'contactoWhatsApp') {
      validateField(field, value)
    }
    // Limpiar error de submit cuando el usuario empieza a escribir
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: undefined }))
    }
  }

  const handleSubmit = async () => {
    // Limpiar errores previos
    setErrors({})
    
    // Validar todos los campos requeridos
    const emailErrors = validateField('contactoEmail', formData.contactoEmail)
    const empresaErrors = validateField('empresa', formData.empresa)
    const deptErrors = validateField('departamentos', formData.departamentos)
    const empleadosErrors = validateField('empleados', formData.empleados)
    const whatsappErrors = formData.contactoWhatsApp ? validateField('contactoWhatsApp', formData.contactoWhatsApp) : {}
    const allErrors = { ...emailErrors, ...empresaErrors, ...deptErrors, ...empleadosErrors, ...whatsappErrors }
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      // Scroll al primer error
      const firstErrorField = Object.keys(allErrors)[0]
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) || 
                          document.querySelector(`input[value="${formData[firstErrorField as keyof FormData]}"]`)
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ;(errorElement as HTMLElement).focus()
      }
      return
    }

    setIsLoading(true)
    setErrors({}) // Limpiar errores antes de enviar
    
    try {
      const submitData = {
        empleados: formData.empleados,
        empresa: formData.empresa.trim(),
        nombre: formData.nombre?.trim() || '',
        contactoWhatsApp: formData.contactoWhatsApp?.trim() || '',
        contactoEmail: formData.contactoEmail.trim(),
        departamentos: formData.departamentos,
        aceptaTrial: formData.aceptaTrial || false
      }

      const response = await fetch('/api/activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      let data
      try {
        data = await response.json()
      } catch (e) {
        // Si no hay JSON, usar mensaje genérico
        data = { error: 'Error al procesar tu solicitud. Por favor, intenta de nuevo.' }
      }

      if (response.ok) {
        setIsSuccess(true)
      } else {
        // Manejar errores del servidor
        const errorMessage = data.error || 'Error al procesar tu solicitud. Por favor, intenta de nuevo.'
        setErrors({ submit: errorMessage })
        // Scroll al mensaje de error
        setTimeout(() => {
          const errorElement = document.querySelector('.error-message')
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    } catch (error) {
      console.error('Error:', error)
      setErrors({ 
        submit: '❌ Error de conexión. Por favor, verifica tu internet e intenta de nuevo.' 
      })
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
                ¡Tu entorno está siendo creado, {formData.nombre || 'Equipo'}!
              </h1>
              <p className="text-xl text-brand-300 mb-8">
                Estamos configurando automáticamente tu empresa <strong>{formData.empresa}</strong> con {formData.departamentos} departamento{formData.departamentos > 1 ? 's' : ''} y {formData.empleados} empleado{formData.empleados > 1 ? 's' : ''} de prueba. En unos segundos recibirás un email con tus credenciales de acceso para iniciar sesión inmediatamente.
              </p>
            </div>

            <Card variant="glass" className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  ¿Qué recibirás en tu email?
                </h2>
                <div className="space-y-3 mb-6">
                  <p className="text-lg text-brand-300">
                    📧 <strong>Tu email de acceso:</strong> {formData.contactoEmail}
                  </p>
                  <p className="text-lg text-brand-300">
                    🔑 <strong>Tu contraseña temporal:</strong> Se generará automáticamente y la recibirás en el correo
                  </p>
                  <p className="text-lg text-brand-300">
                    🚀 <strong>Enlace directo:</strong> Para iniciar sesión inmediatamente
                  </p>
                </div>
                <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4 mt-6">
                  <p className="text-white font-semibold mb-2">Garantía: 24 horas o trabajo gratis</p>
                  <p className="text-sm text-brand-300">
                    Si necesitamos más ajustes, seguimos trabajando sin costo adicional hasta que tu proceso quede funcionando.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="text-center">
                    <p className="text-sm text-brand-300">WhatsApp</p>
                    <p className="text-xs text-brand-400">+504 9470-7007</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-brand-300">Email</p>
                    <p className="text-xs text-brand-400">jorgearturo@humanosisu.net</p>
                  </div>
                </div>
                <p className="text-sm text-brand-400 text-center mt-6">
                  Revisa tu correo en los próximos minutos. Si no lo recibes, revisa spam o contáctanos.
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
        <title>Servicio Hondureño de Recursos Humanos | Digital & Automatizado</title>
        <meta name="title" content="Servicio Hondureño de Recursos Humanos | Digital & Automatizado" />
        <meta property="og:title" content="Servicio Hondureño de Recursos Humanos | Digital & Automatizado" />
        <meta name="twitter:title" content="Servicio Hondureño de Recursos Humanos | Digital & Automatizado" />
        <meta
          name="description"
          content="Crea tu entorno de RH completo en minutos. Empresa, departamentos, horarios y empleados de prueba configurados automáticamente. Acceso inmediato con credenciales por email. Sin tarjeta."
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
            Activa un demo de RRHH gratuito<br className="hidden md:block" />
            <span className="text-brand-300">Listo en segundos. Sin tarjeta. Sin compromiso.</span>
          </h1>
          <p className="text-2xl text-brand-300 mb-8">
            Gratis por {TRIAL_CONFIG.DURATION_DAYS} días.
          </p>
        </div>

        {/* Main Form */}
        <div className="max-w-2xl mx-auto mb-16">
          <Card variant="glass">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Configura tu entorno de prueba
              </h2>
              <p className="text-brand-300 text-center mb-6">
                Con esta información crearemos automáticamente tu empresa, departamentos, horarios de trabajo y empleados de prueba.
              </p>

              <div className="space-y-6">
                {/* Company Name */}
                <div>
                  <label className="block text-white font-medium mb-2">Nombre de la empresa *</label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all ${
                      errors.empresa ? 'border-red-500/50' : 'border-brand-600/30'
                    }`}
                    placeholder="Mi Empresa S.A."
                    required
                  />
                  {errors.empresa && (
                    <p className="text-red-400 text-sm mt-2 font-medium flex items-center">
                      {errors.empresa}
                    </p>
                  )}
                </div>

                {/* Contact Name */}
                <div>
                  <label className="block text-white font-medium mb-2">Tu nombre</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all border-brand-600/30"
                    placeholder="María González"
                  />
                  <p className="text-brand-400 text-sm mt-2">(opcional)</p>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-white font-medium mb-2">WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.contactoWhatsApp}
                    onChange={(e) => handleInputChange('contactoWhatsApp', e.target.value)}
                    className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all ${
                      errors.contactoWhatsApp ? 'border-red-500/50' : 'border-brand-600/30'
                    }`}
                    placeholder="+504 9999-9999"
                  />
                  {errors.contactoWhatsApp ? (
                    <p className="text-red-400 text-sm mt-2 font-medium flex items-center">
                      {errors.contactoWhatsApp}
                    </p>
                  ) : (
                    <p className="text-brand-400 text-sm mt-2">Formato: +504 9999-9999 (opcional)</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-medium mb-2">Email  *</label>
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
                    <p className="text-red-400 text-sm mt-2 font-medium flex items-center">
                      {errors.contactoEmail}
                    </p>
                  )}
                  {!errors.contactoEmail && (
                    <p className="text-brand-400 text-sm mt-2">Te enviaremos tu email y contraseña de acceso aquí</p>
                  )}
                </div>

                {/* Employee Count */}
                <div>
                  <label className="block text-white font-medium mb-2 text-center"># empleados en planilla *</label>
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
                        className={`w-24 h-16 text-3xl font-bold text-center glass border-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all ${
                          errors.empleados ? 'border-red-500/50' : 'border-brand-500'
                        }`}
                        min="1"
                        required
                      />
                      <p className="text-brand-400 text-sm mt-2">empleados de prueba</p>
                      {errors.empleados ? (
                        <p className="text-red-400 text-xs mt-1 font-medium">{errors.empleados}</p>
                      ) : (
                        <p className="text-brand-400 text-xs mt-1">Se crearán automáticamente con datos de ejemplo</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleEmpleadosChange(formData.empleados + 1)}
                      className="w-12 h-12 rounded-full glass border border-brand-600/30 hover:border-brand-500 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-brand-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Departments Count */}
                <div>
                  <label className="block text-white font-medium mb-2 text-center"># departamentos *</label>
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={() => handleDepartamentosChange(formData.departamentos - 1)}
                      className="w-12 h-12 rounded-full glass border border-brand-600/30 hover:border-brand-500 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-brand-200"
                      disabled={formData.departamentos <= 1}
                    >
                      -
                    </button>
                    
                    <div className="text-center">
                      <input
                        type="number"
                        value={formData.departamentos}
                        onChange={(e) => handleDepartamentosChange(parseInt(e.target.value) || 1)}
                        className={`w-24 h-16 text-3xl font-bold text-center glass border-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all ${
                          errors.departamentos ? 'border-red-500/50' : 'border-brand-500'
                        }`}
                        min="1"
                        required
                      />
                      <p className="text-brand-400 text-sm mt-2">departamentos</p>
                      {errors.departamentos ? (
                        <p className="text-red-400 text-xs mt-1 font-medium">{errors.departamentos}</p>
                      ) : (
                        <p className="text-brand-400 text-xs mt-1">Se crearán automáticamente con nombres por defecto</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDepartamentosChange(formData.departamentos + 1)}
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
                    Deseo crear mi entorno de prueba ahora. Recibiré acceso inmediato con empleados y departamentos configurados.
                  </label>
                  <p className="text-brand-400 text-xs mt-2 ml-8">Trial de 7 días. Sin costo. Sin compromiso.</p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!formData.contactoEmail || !formData.empresa || formData.departamentos < 1 || isLoading || Object.keys(errors).length > 0}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-lg font-semibold inline-flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creando tu entorno completo...
                    </>
                  ) : (
                    <>
                      <RocketLaunchIcon className="h-5 w-5 mr-2" /> Crear mi entorno de prueba ahora
                    </>
                  )}
                </button>

                {/* Error general del submit */}
                {errors.submit && (
                  <div className="error-message bg-red-500/10 border border-red-500/50 rounded-lg p-4 mt-4">
                    <p className="text-red-400 text-sm font-medium text-center">
                      {errors.submit}
                    </p>
                  </div>
                )}
                
                {!errors.submit && (
                  <p className="text-brand-400 text-xs text-center">
                    Recibirás acceso inmediato por email con credenciales. Tu entorno vendrá con empleados de prueba, departamentos y horarios ya configurados. Sin tarjeta. Puedes cancelar cuando quieras.
                  </p>
                )}
              </div>
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
                <p className="font-medium text-white">Entorno completo</p>
                <p className="text-sm text-brand-300">Empleados, departamentos y horarios listos</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
