import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon, ShieldCheckIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
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
  empresa?: string
  nombre?: string
  contactoWhatsApp?: string
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
    aceptaTrial: false
  })

  const handleEmpleadosChange = (value: number) => {
    setFormData(prev => ({ ...prev, empleados: Math.max(1, value) }))
  }

  const validateField = (field: keyof FormData, value: string | boolean) => {
    const newErrors = { ...errors }
    
    switch (field) {
      case 'empresa':
        if (!value || typeof value !== 'string' || !value.trim()) {
          newErrors.empresa = '¿Cuál es el nombre de tu empresa?'
        } else if (value.trim().length < 2) {
          newErrors.empresa = 'El nombre debe tener al menos 2 caracteres'
        } else {
          delete newErrors.empresa
        }
        break
        
      case 'nombre':
        if (!value || typeof value !== 'string' || !value.trim()) {
          newErrors.nombre = '¿Cuál es tu nombre completo?'
        } else if (value.trim().length < 3) {
          newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
        } else {
          delete newErrors.nombre
        }
        break
        
      case 'contactoWhatsApp':
        if (!value || typeof value !== 'string' || !value.trim()) {
          newErrors.contactoWhatsApp = '¿Cuál es tu número de WhatsApp?'
        } else if (!/^\+504\s\d{4}-\d{4}$/.test(value.trim())) {
          newErrors.contactoWhatsApp = 'Formato: +504 9999-9999 (código de área + números con guión)'
        } else {
          delete newErrors.contactoWhatsApp
        }
        break
        
      case 'contactoEmail':
        if (!value || typeof value !== 'string' || !value.trim()) {
          newErrors.contactoEmail = '¿Cuál es tu correo electrónico?'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          newErrors.contactoEmail = 'Por favor ingresa un email válido'
        } else {
          delete newErrors.contactoEmail
        }
        break
    }
    
    setErrors(newErrors)
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'empresa' || field === 'nombre' || field === 'contactoWhatsApp' || field === 'contactoEmail') {
      validateField(field, value)
    }
  }

  const handleSubmit = async () => {
    // Validar todos los campos antes de enviar
    validateField('empresa', formData.empresa)
    validateField('nombre', formData.nombre)
    validateField('contactoWhatsApp', formData.contactoWhatsApp)
    validateField('contactoEmail', formData.contactoEmail)
    
    // Si hay errores, no enviar
    if (Object.keys(errors).length > 0) {
      return
    }
    
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
                Estamos configurando tu entorno de Recursos Humanos. Te mandaremos el acceso por WhatsApp y mail.
              </p>
            </div>

            <Card variant="glass" className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  ¡Gracias por confiar en SISU!
                </h2>
                <p className="text-lg text-brand-300 mb-6">
                  Tu sistema estará listo en las próximas horas. Mientras tanto, únete a nuestra comunidad.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mb-6 max-w-md mx-auto">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl"></span>
                    </div>
                    <p className="text-sm text-brand-300">WhatsApp</p>
                    <p className="text-xs text-brand-400">+504 9470-7007</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl"></span>
                    </div>
                    <p className="text-sm text-brand-300">Email</p>
                    <p className="text-xs text-brand-400">jorge7gomez@gmail.com</p>
                  </div>
                </div>
                
                <p className="text-sm text-brand-400 text-center mb-6">
                  Comparte con otros empresarios y ayúdanos a crecer la comunidad de RH en Honduras 🇭🇳
                </p>
                
                {/* Redes Sociales */}
                <div className="flex justify-center space-x-6 mb-6">
                    <a 
                        href="https://facebook.com/humanosisu" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        aria-label="Facebook @humanosisu"
                    >
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                    </a>
                    
                    <a 
                        href="https://instagram.com/humanosisu" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-400 hover:text-pink-300 transition-colors"
                        aria-label="Instagram @humanosisu"
                    >
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z"/>
                        </svg>
                    </a>
                    
                    <a 
                        href="https://x.com/humanosisu" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                        aria-label="X (Twitter) @humanosisu"
                    >
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </a>
                    
                    <a 
                        href="https://tiktok.com/@humanosisu" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                        aria-label="TikTok @humanosisu"
                    >
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 2.09 3.3 1.64.44-.13.81-.4 1.08-.76.28-.4.31-.81.29-1.25v-4.04z"/>
                        </svg>
                    </a>
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
          

        </div>

        {/* Sub-hero */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <Card variant="glass" className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-8">
              <p className="text-xl text-white mb-4">
                <span className="text-green-400 font-bold">&ldquo;Paragon Financial redujo 80% el tiempo de planilla con SISU.&rdquo;</span>
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
                Garantía de implementación
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
                    className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all ${
                      errors.empresa ? 'border-red-500/50' : 'border-brand-600/30'
                    }`}
                    placeholder="Mi Empresa S.A."
                    required
                  />
                  {errors.empresa && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      {errors.empresa}
                    </p>
                  )}
                  <p className="text-brand-400 text-sm mt-2">
                    Nombre legal de tu empresa o negocio
                  </p>
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
                    className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all ${
                      errors.nombre ? 'border-red-500/50' : 'border-brand-600/30'
                    }`}
                    placeholder="María González"
                    required
                  />
                  {errors.nombre && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      {errors.nombre}
                    </p>
                  )}
                  <p className="text-brand-400 text-sm mt-2">
                    Tu nombre completo para el contacto
                  </p>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    WhatsApp (para login y soporte) *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactoWhatsApp}
                    onChange={(e) => handleInputChange('contactoWhatsApp', e.target.value)}
                    className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all ${
                      errors.contactoWhatsApp ? 'border-red-500/50' : 'border-brand-600/30'
                    }`}
                    placeholder="+504 9999-9999"
                    required
                  />
                  {errors.contactoWhatsApp && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      {errors.contactoWhatsApp}
                    </p>
                  )}
                  <p className="text-brand-400 text-sm mt-2">
                    Formato: +504 9999-9999 (código de área + números con guión)
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Email (credenciales de acceso) *
                  </label>
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
                  <p className="text-brand-400 text-sm mt-2">
                    Recibirás credenciales de acceso aquí
                  </p>
                </div>

                {/* Employee Count */}
                <div>
                  <label className="block text-white font-medium mb-2 text-center">
                    # empleados (para dimensionar carga)
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
                      <p className="text-brand-400 text-xs mt-1">
                        Para dimensionar la carga del sistema
                      </p>
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
                    Deseo activar un entorno de prueba por 30 días. Sin costo.
                  </label>
                  <p className="text-brand-400 text-xs mt-2 ml-8">
                    Acceso completo al sistema por 30 días gratis
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!formData.empresa || !formData.nombre || !formData.contactoWhatsApp || !formData.contactoEmail || !formData.aceptaTrial || isLoading || Object.keys(errors).length > 0}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-lg font-semibold inline-flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creando tu entorno...
                    </>
                  ) : (
                    <>
                      Activar mi sistema ahora
                    </>
                  )}
                </button>

                {Object.keys(errors).length > 0 && (
                  <p className="text-red-400 text-sm text-center mt-4 flex items-center justify-center">
                    Por favor, corrige los errores antes de continuar
                  </p>
                )}
                
                <p className="text-brand-400 text-xs text-center">
                  Entorno de prueba por 30 días. Sin costo, sin compromiso.
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
                <p className="text-sm text-brand-300">Prueba gratis por 30 días</p>
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
