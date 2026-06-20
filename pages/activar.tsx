import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeftIcon, CheckCircleIcon, RocketLaunchIcon, CpuChipIcon, BoltIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardTitle } from '../components/ui/card'
import { TRIAL_CONFIG } from '../lib/config/trial'
import { motion } from 'framer-motion'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import BorderBeam from '../components/landing/BorderBeam'
import { trackActivationFormSubmit, initGoogleAdsTracking } from '../lib/analytics/googleAds'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackActivationTrialSubmit,
} from '../lib/analytics/metaPixel'
import type { CountryCode } from '../lib/country/supported'
import { isCountryCode } from '../lib/country/supported'
import { normalizeSoftPhone } from '../lib/privacy'

interface FormData {
  empleados: number
  empresa: string
  nombre: string
  whatsappCountryCallingCode: string
  whatsappNumber: string
  contactoWhatsApp: string // legacy: se arma al submit
  contactoEmail: string
  departamentos: number
  aceptaTrial: boolean
  countryCode: CountryCode
}

interface ValidationErrors {
  contactoEmail?: string
  empresa?: string
  departamentos?: string
  contactoWhatsApp?: string
  empleados?: string
  countryCode?: string
  submit?: string
}

const WHATSAPP_CALLING_CODES: { code: string; country: string }[] = [
  { code: '+1', country: 'Estados Unidos / Canadá' },
  { code: '+52', country: 'México' },
  { code: '+503', country: 'El Salvador' },
  { code: '+504', country: 'Honduras' },
  { code: '+502', country: 'Guatemala' },
  { code: '+505', country: 'Nicaragua' },
  { code: '+506', country: 'Costa Rica' },
  { code: '+507', country: 'Panamá' },
  { code: '+57', country: 'Colombia' },
  { code: '+51', country: 'Perú' },
  { code: '+56', country: 'Chile' },
  { code: '+54', country: 'Argentina' },
  { code: '+58', country: 'Venezuela' },
  { code: '+34', country: 'España' },
]

const COUNTRY_LABEL: Record<CountryCode, string> = {
  HND: 'Honduras',
  SLV: 'El Salvador',
  GTM: 'Guatemala',
}

function defaultCallingCodeForPayrollCountry(cc: CountryCode): string {
  if (cc === 'SLV') return '+503'
  if (cc === 'GTM') return '+502'
  return '+504'
}

/** Validación completa del formulario (una sola fuente de verdad para submit y validación en vivo). */
function computeActivarErrors(fd: FormData): ValidationErrors {
  const e: ValidationErrors = {}

  const vEmail = fd.contactoEmail.trim()
  if (!vEmail) {
    e.contactoEmail = '✉️ Este campo es obligatorio. Necesitamos tu email para enviarte las credenciales de acceso.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vEmail)) {
    e.contactoEmail = '✉️ El formato del email no es válido. Ejemplo: nombre@empresa.com'
  }

  const vEmpresa = fd.empresa.trim()
  if (!vEmpresa) {
    e.empresa = '🏢 Este campo es obligatorio. Ingresa el nombre de tu empresa.'
  } else if (vEmpresa.length < 2) {
    e.empresa = '🏢 El nombre de la empresa debe tener al menos 2 caracteres.'
  } else if (vEmpresa.length > 100) {
    e.empresa = '🏢 El nombre de la empresa no puede tener más de 100 caracteres.'
  }

  if (fd.departamentos < 1) {
    e.departamentos = '🏢 Debe haber al menos 1 departamento.'
  } else if (fd.departamentos > TRIAL_CONFIG.MAX_DEPARTMENTS) {
    e.departamentos = `🏢 El número máximo de departamentos es ${TRIAL_CONFIG.MAX_DEPARTMENTS}.`
  }

  if (fd.empleados < TRIAL_CONFIG.MIN_EMPLOYEES) {
    e.empleados = `👥 Debe haber al menos ${TRIAL_CONFIG.MIN_EMPLOYEES} empleado.`
  } else if (fd.empleados > TRIAL_CONFIG.MAX_EMPLOYEES) {
    e.empleados = `👥 El número máximo de empleados es ${TRIAL_CONFIG.MAX_EMPLOYEES}.`
  }

  if (!isCountryCode(fd.countryCode)) {
    e.countryCode = '🌎 Seleccioná el país donde opera tu empresa (define zona horaria, moneda y reglas de nómina).'
  }

  const waCombined = `${fd.whatsappCountryCallingCode || ''} ${fd.whatsappNumber || ''}`.trim()
  const waNormalized = normalizeSoftPhone(waCombined)
  if (waCombined && !waNormalized) {
    e.contactoWhatsApp = '📱 Número de WhatsApp inválido. Intenta con el código de país y al menos 7 dígitos.'
  }

  return e
}

export default function ActivarPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState<FormData>({
    empleados: 1,
    empresa: '',
    nombre: '',
    whatsappCountryCallingCode: '+504',
    whatsappNumber: '',
    contactoWhatsApp: '',
    contactoEmail: '',
    departamentos: 1,
    aceptaTrial: true,
    countryCode: 'HND',
  })

  // Initialize Google Ads tracking on mount
  useEffect(() => {
    initGoogleAdsTracking()
  }, [])

  useEffect(() => {
    const raw = router.query.country
    if (typeof raw !== 'string') return
    const cc = raw.trim().toUpperCase()
    if (!isCountryCode(cc)) return
    setFormData((prev) => ({
      ...prev,
      countryCode: cc,
      whatsappCountryCallingCode: defaultCallingCodeForPayrollCountry(cc)
    }))
  }, [router.query.country])

  const handleEmpleadosChange = (value: number) => {
    const newValue = Math.max(TRIAL_CONFIG.MIN_EMPLOYEES, Math.min(TRIAL_CONFIG.MAX_EMPLOYEES, value))
    setFormData(prev => ({ ...prev, empleados: newValue }))
    setErrors(computeActivarErrors({ ...formData, empleados: newValue }))
  }

  const handleDepartamentosChange = (value: number) => {
    const newValue = Math.max(TRIAL_CONFIG.MIN_DEPARTMENTS, Math.min(TRIAL_CONFIG.MAX_DEPARTMENTS, value))
    setFormData(prev => ({ ...prev, departamentos: newValue }))
    setErrors(computeActivarErrors({ ...formData, departamentos: newValue }))
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean | number) => {
    const fd = { ...formData, [field]: value } as FormData
    setFormData(prev => ({ ...prev, [field]: value }))

    if (field === 'nombre' || field === 'aceptaTrial') {
      setErrors(prev => (prev.submit ? { ...prev, submit: undefined } : prev))
      return
    }

    setErrors(prev => {
      const next = computeActivarErrors(fd)
      return prev.submit ? { ...next, submit: undefined } : next
    })
  }

  const handleSubmit = async () => {
    const allErrors = computeActivarErrors(formData)

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
      const metaEventId = createMetaEventId('activar')
      const submitData = {
        empleados: formData.empleados,
        empresa: formData.empresa.trim(),
        nombre: formData.nombre?.trim() || '',
        contactoWhatsApp:
          normalizeSoftPhone(`${formData.whatsappCountryCallingCode} ${formData.whatsappNumber}`) || '',
        contactoEmail: formData.contactoEmail.trim(),
        departamentos: formData.departamentos,
        aceptaTrial: formData.aceptaTrial || false,
        countryCode: formData.countryCode,
        ...buildMetaApiTrackingFields(metaEventId),
      }

      const response = await fetch('/api/activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      let data
      try {
        data = await response.json()
      } catch {
        // Si no hay JSON, usar mensaje genérico
        data = { error: 'Error al procesar tu solicitud. Por favor, intenta de nuevo.' }
      }

      if (response.ok) {
        trackActivationFormSubmit(
          submitData.contactoEmail,
          submitData.empresa,
          submitData.empleados
        )
        trackActivationTrialSubmit({
          eventId: metaEventId,
          email: submitData.contactoEmail,
          phone: submitData.contactoWhatsApp || undefined,
          firstName: submitData.nombre || undefined,
          countryCode: submitData.countryCode,
        })
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

  const countryLabel = isCountryCode(formData.countryCode) ? COUNTRY_LABEL[formData.countryCode] : ''
  
  if (isSuccess) {
    return (
      <PublicPageShell showFooter={false} loginAlwaysVisible>
        <PublicPageHead
          title={getPageTitle('activate')}
          description={getPageDescription('activate')}
          canonicalPath="/activar"
          noindex
        />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                ¡Tu cerebro digital está listo, {formData.nombre || 'Equipo'}!
              </h1>
              <p className="text-xl text-brand-300 mb-8">
                Hemos inyectado las leyes laborales de <strong>{countryLabel || 'tu país'}</strong> y configurado tu empresa <strong>{formData.empresa}</strong> con {formData.departamentos} departamento{formData.departamentos > 1 ? 's' : ''} y {formData.empleados} empleado{formData.empleados > 1 ? 's' : ''} de prueba. Todo está listo para que veas la automatización en tiempo real.
              </p>
            </div>

            <Card variant="liquid" className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  ¿Qué sigue ahora?
                </h2>
                <div className="space-y-3 mb-6">
                  <p className="text-lg text-brand-300">
                    📧 <strong>Revisa tu correo:</strong> ({formData.contactoEmail})
                  </p>
                  <p className="text-lg text-brand-300">
                    🔑 <strong>Tus credenciales:</strong> Te hemos enviado una contraseña segura.
                  </p>
                  <p className="text-lg text-brand-300">
                    🚀 <strong>Explora el sistema:</strong> Genera tu primera nómina sin errores en menos de 4 minutos.
                  </p>
                </div>
                <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4 mt-6">
                  <p className="text-white font-semibold mb-2">🤝 Acompañamiento Local</p>
                  <p className="text-sm text-brand-300">
                    ¿Quieres conectar tu propio reloj biométrico? Responde al correo y nuestro equipo de soporte regional te guiará paso a paso sin costo.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="text-center">
                    <p className="text-sm text-brand-300">WhatsApp</p>
                    <p className="text-xs text-brand-400">504 32226773</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-brand-300">Email</p>
                    <p className="text-xs text-brand-400">jorgearturo@humanosisu.net</p>
                  </div>
                </div>
                <p className="text-sm text-brand-400 text-center mt-6">
                  Revisa tu bandeja de entrada (y la de spam por si acaso). Tu ecosistema te espera.
                </p>
              </CardContent>
            </Card>

            <Link href="/" className="inline-flex items-center text-brand-300 hover:text-white transition-colors">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Volver a inicio
            </Link>
          </div>
        </div>
      </PublicPageShell>
    )
  }

  return (
    <PublicPageShell showFooter={false} loginAlwaysVisible mainClassName="flex flex-col overflow-hidden">
      <PublicPageHead
        title={getPageTitle('activate')}
        description={getPageDescription('activate')}
        canonicalPath="/activar"
      />
      <div className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <BorderBeam className="w-full max-w-6xl">
        <Card variant="liquid" className="w-full shadow-2xl relative overflow-hidden">
          <CardContent className="p-6 sm:p-8 lg:p-12 relative z-10">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Left Column - Header Content */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center lg:text-left"
              >
                <motion.div
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-block mb-4 lg:mb-6"
                >
                  <CpuChipIcon className="w-16 h-16 lg:w-20 lg:h-20 text-cyan-400 mx-auto lg:mx-0 drop-shadow-lg" />
                </motion.div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 lg:mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-white via-brand-200 to-brand-400 bg-clip-text text-transparent">El fin del trabajo manual:</span>{' '}
                  <span className="text-brand-300">Crea tu entorno automatizado en segundos.</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-400 mb-6 lg:mb-8 landing-dark-text">
                  Comprueba cómo se siente cruzar tu biometría directamente con la nómina sin abrir Excel. Activa tu cuenta y explora el sistema con leyes locales ya parametrizadas. Cero fricción, sin tarjeta de crédito.
                </p>
                {/* Feature pills - alineados con mensajes ganadores de Google Ads */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6 lg:mb-8">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/15 text-green-300 text-xs sm:text-sm rounded-full border border-green-500/25 font-medium">
                    <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <strong>Nómina Cero Errores:</strong> Deducciones de ley locales automáticas.
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 text-blue-300 text-xs sm:text-sm rounded-full border border-blue-500/25 font-medium">
                    <BoltIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <strong>Cero “Pasa-datos”:</strong> Del registro biométrico al comprobante PDF.
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/15 text-purple-300 text-xs sm:text-sm rounded-full border border-purple-500/25 font-medium">
                    <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <strong>Data de prueba lista:</strong> Empleados y horarios autogenerados.
                  </span>
                </div>
              </motion.div>

              {/* Right Column - Form */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="space-y-6"
              >
              <div className="border-t border-white/10 pt-6">
                <CardTitle className="text-xl md:text-2xl font-bold text-white mb-3 flex items-center gap-2">
                  El sistema hace la magia por ti
                </CardTitle>
                <p className="text-cyan-100/80 text-sm leading-relaxed mb-6">
                  Olvida las configuraciones complejas. Dinos tu país y el tamaño de tu equipo; nosotros crearemos tu empresa con departamentos y empleados ficticios para que veas cómo se automatiza la nómina al instante.
                </p>
              </div>

              <div className="space-y-6">
                {/* Company Name */}
                <div>
                  <label className="block text-white font-medium mb-2">Nombre de la empresa *</label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
                      errors.empresa ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                    } hover:border-cyan-400/30 hover:bg-white/10`}
                    placeholder="Mi Empresa S.A."
                    required
                  />
                  {errors.empresa && (
                    <p className="text-red-400 text-sm mt-2 font-medium flex items-center">
                      {errors.empresa}
                    </p>
                  )}
                </div>

                {/* País de operación — enlaza companies.country_code y motor regional */}
                <div>
                  <label htmlFor="activar-country" className="block text-white font-medium mb-2">
                    País de operación *
                  </label>
                  <select
                    id="activar-country"
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!isCountryCode(v)) return
                      // Si el usuario aún no ha escrito WhatsApp, sugerimos el código por defecto del país (sin forzar)
                      if (!formData.whatsappNumber.trim()) {
                        handleInputChange('whatsappCountryCallingCode', defaultCallingCodeForPayrollCountry(v))
                      }
                      handleInputChange('countryCode', v)
                    }}
                    className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
                      errors.countryCode ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                    } hover:border-cyan-400/30 hover:bg-white/10`}
                  >
                    <option value="HND">Honduras</option>
                    <option value="SLV">El Salvador</option>
                    <option value="GTM">Guatemala</option>
                  </select>
                  {errors.countryCode ? (
                    <p className="text-red-400 text-sm mt-2 font-medium">{errors.countryCode}</p>
                  ) : (
                    <p className="text-brand-400 text-sm mt-2">
                      Crucial: esto calibra nuestro motor para aplicar exactamente la moneda y leyes laborales (ISR, IHSS, RAP) de tu jurisdicción.
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
                    className="w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all hover:border-cyan-400/30 hover:bg-white/10"
                    placeholder="María González"
                  />
                  <p className="text-brand-400 text-sm mt-2">(opcional)</p>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-white font-medium mb-2">WhatsApp (opcional)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                    <select
                      name="whatsappCountryCallingCode"
                      value={formData.whatsappCountryCallingCode}
                      onChange={(e) => handleInputChange('whatsappCountryCallingCode', e.target.value)}
                      className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all ${
                        errors.contactoWhatsApp ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                      } hover:border-brand-500/30 hover:bg-white/10`}
                    >
                      {WHATSAPP_CALLING_CODES.map((opt) => (
                        <option key={opt.code} value={opt.code} className="bg-slate-800">
                          {opt.code} · {opt.country}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="contactoWhatsApp"
                      value={formData.whatsappNumber}
                      onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                      className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all ${
                        errors.contactoWhatsApp ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                      } hover:border-brand-500/30 hover:bg-white/10`}
                      placeholder="9999-9999"
                      inputMode="tel"
                    />
                  </div>
                  {errors.contactoWhatsApp ? (
                    <p className="text-red-400 text-sm mt-2 font-medium flex items-center">
                      {errors.contactoWhatsApp}
                    </p>
                  ) : (
                    <p className="text-brand-400 text-sm mt-2">
                      Si deseas que un asesor te guíe en cómo conectar tu biométrico físico al sistema.
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-medium mb-2">Email corporativo *</label>
                  <input
                    type="email"
                    value={formData.contactoEmail}
                    onChange={(e) => handleInputChange('contactoEmail', e.target.value)}
                    className={`w-full p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
                      errors.contactoEmail ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                    } hover:border-cyan-400/30 hover:bg-white/10`}
                    placeholder="admin@miempresa.com"
                    required
                  />
                  {errors.contactoEmail && (
                    <p className="text-red-400 text-sm mt-2 font-medium flex items-center">
                      {errors.contactoEmail}
                    </p>
                  )}
                  {!errors.contactoEmail && (
                    <p className="text-brand-400 text-sm mt-2">Aquí enviaremos la llave mágica: tus credenciales de acceso seguro.</p>
                  )}
                </div>

                {/* Employee Count */}
                <div>
                  <label className="block text-white font-medium mb-2 text-center"># empleados de prueba *</label>
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={() => handleEmpleadosChange(formData.empleados - 1)}
                      className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:border-cyan-400/50 hover:bg-cyan-500/20 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={formData.empleados <= 1}
                    >
                      -
                    </button>
                    
                    <div className="text-center">
                      <input
                        type="number"
                        value={formData.empleados}
                        onChange={(e) => handleEmpleadosChange(parseInt(e.target.value) || 1)}
                        className={`w-24 h-16 text-3xl font-bold text-center bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
                          errors.empleados ? 'border-red-500/50 bg-red-500/5' : 'border-cyan-400/30'
                        } hover:border-cyan-400/50`}
                        min="1"
                        required
                      />
                      <p className="text-brand-400 text-sm mt-2">empleados de prueba</p>
                      {errors.empleados ? (
                        <p className="text-red-400 text-xs mt-1 font-medium">{errors.empleados}</p>
                      ) : (
                        <p className="text-brand-400 text-xs mt-1">
                          Crearemos marcajes y salarios ficticios para que veas la nómina en acción real.
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleEmpleadosChange(formData.empleados + 1)}
                      className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:border-cyan-400/50 hover:bg-cyan-500/20 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-cyan-300"
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
                      className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:border-cyan-400/50 hover:bg-cyan-500/20 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={formData.departamentos <= 1}
                    >
                      -
                    </button>
                    
                    <div className="text-center">
                      <input
                        type="number"
                        value={formData.departamentos}
                        onChange={(e) => handleDepartamentosChange(parseInt(e.target.value) || 1)}
                        className={`w-24 h-16 text-3xl font-bold text-center bg-white/5 backdrop-blur-sm border-2 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all ${
                          errors.departamentos ? 'border-red-500/50 bg-red-500/5' : 'border-cyan-400/30'
                        } hover:border-cyan-400/50`}
                        min="1"
                        required
                      />
                      <p className="text-brand-400 text-sm mt-2">departamentos</p>
                      {errors.departamentos ? (
                        <p className="text-red-400 text-xs mt-1 font-medium">{errors.departamentos}</p>
                      ) : (
                        <p className="text-brand-400 text-xs mt-1">Para organizar a tu equipo autogenerado.</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDepartamentosChange(formData.departamentos + 1)}
                      className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:border-cyan-400/50 hover:bg-cyan-500/20 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-cyan-300"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Trial Checkbox */}
                <div className="flex items-start space-x-3 p-4 bg-brand-600/10 backdrop-blur-sm rounded-xl border border-brand-500/30">
                  <input
                    type="checkbox"
                    id="acepta-trial"
                    checked={formData.aceptaTrial}
                    onChange={(e) => handleInputChange('aceptaTrial', e.target.checked)}
                    className="mt-1 w-5 h-5 text-brand-600 bg-white/10 border-brand-500/50 rounded focus:ring-brand-500 focus:ring-2 cursor-pointer"
                  />
                  <label htmlFor="acepta-trial" className="text-white text-sm leading-relaxed cursor-pointer">
                    Quiero mi entorno ahora. Entiendo que se generará información ficticia para evaluar la automatización.
                  </label>
                  <p className="text-brand-200/70 text-xs mt-2 ml-8">30 días de prueba gratuita. Sin tarjeta. Sin compromisos ocultos.</p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!formData.contactoEmail || !formData.empresa || formData.departamentos < 1 || isLoading || Object.keys(errors).length > 0}
                  className="w-full btn-shiny bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center justify-center transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] disabled:opacity-50 disabled:cursor-not-allowed text-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ⚙️ Parametrizando leyes y creando empleados...
                    </>
                  ) : (
                    <>
                      <RocketLaunchIcon className="h-5 w-5 mr-2" /> Generar mi ecosistema gratis
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
                    Activación inmediata. Recibirás tus credenciales por email. Tu entorno incluirá empleados de prueba y nómina lista para ejecutarse según las normativas de tu país. Soporte técnico 100% regional.
                  </p>
                )}
              </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
        </BorderBeam>
      </div>
    </PublicPageShell>
  )
}
