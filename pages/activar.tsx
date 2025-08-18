import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon, ShieldCheckIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import LanguageToggle from '../components/LanguageToggle'
import { useLanguage } from '../lib/hooks/useLanguage'

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
  const { t, tf } = useLanguage()
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

  const validateField = (field: keyof FormData, value: string) => {
    const newErrors = { ...errors }
    
    switch (field) {
      case 'empresa':
        if (!value.trim()) {
          newErrors.empresa = '¿Cómo se llama tu empresa?'
        } else if (value.trim().length < 2) {
          newErrors.empresa = 'El nombre de la empresa debe tener al menos 2 caracteres'
        } else {
          delete newErrors.empresa
        }
        break
        
      case 'nombre':
        if (!value.trim()) {
          newErrors.nombre = '¿Cuál es tu nombre?'
        } else if (value.trim().length < 2) {
          newErrors.nombre = 'Tu nombre debe tener al menos 2 caracteres'
        } else {
          delete newErrors.nombre
        }
        break
        
              case 'contactoWhatsApp':
          if (!value.trim()) {
            newErrors.contactoWhatsApp = '¿Cuál es tu número de WhatsApp?'
          } else if (!/^\+504\s\d{4}-\d{4}$/.test(value.trim())) {
            newErrors.contactoWhatsApp = 'Formato: +504 9999-9999 (código de área + números con guión)'
          } else {
            delete newErrors.contactoWhatsApp
          }
          break
        
      case 'contactoEmail':
        if (!value.trim()) {
          newErrors.contactoEmail = '¿Cuál es tu email?'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          newErrors.contactoEmail = 'Ingresa un email válido (ej: admin@empresa.com)'
        } else {
          delete newErrors.contactoEmail
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Validar en tiempo real si es un campo de texto
    if (typeof value === 'string' && field !== 'empleados') {
      validateField(field, value)
  }
  }

  const handleSubmit = async () => {
    // Validar todos los campos antes de enviar
    const isEmpresaValid = validateField('empresa', formData.empresa)
    const isNombreValid = validateField('nombre', formData.nombre)
    const isWhatsAppValid = validateField('contactoWhatsApp', formData.contactoWhatsApp)
    const isEmailValid = validateField('contactoEmail', formData.contactoEmail)
    
    if (!isEmpresaValid || !isNombreValid || !isWhatsAppValid || !isEmailValid) {
      return // No enviar si hay errores
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
                {tf('activar.success.title', { nombre: formData.nombre })}
              </h1>
              <p className="text-xl text-brand-300 mb-8">
                {t('activar.success.message')}
              </p>
            </div>

            <Card variant="glass" className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {t('activar.success.thanks')}
                </h2>
                <p className="text-lg text-brand-300 mb-6">
                  {t('activar.success.community')}
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mb-6 max-w-md mx-auto">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">📱</span>
                    </div>
                    <p className="text-sm text-brand-300">WhatsApp</p>
                    <p className="text-xs text-brand-400">+504 9470-7007</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">📧</span>
                    </div>
                    <p className="text-sm text-brand-300">Email</p>
                    <p className="text-xs text-brand-400">jorge7gomez@gmail.com</p>
                  </div>
                </div>
                
                <p className="text-sm text-brand-400 text-center mb-6">
                  {t('activar.success.share')}
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
              {t('activar.success.backButton')}
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
          <div className="flex justify-between items-center mb-6">
            <Link href="/landing" className="inline-flex items-center text-brand-300 hover:text-white transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {t('activar.hero.backButton')}
          </Link>
            <LanguageToggle />
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-6">
            {t('activar.hero.title')}
          </h1>
          <p className="text-2xl text-brand-300 mb-8">
            {t('activar.hero.subtitle')}
          </p>
        </div>

        {/* Sub-hero */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <Card variant="glass" className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-8">
              <p className="text-xl text-white mb-4">
                <span className="text-green-400 font-bold">{t('activar.testimonial.quote')}</span>
              </p>
              <p className="text-brand-300">
                {t('activar.testimonial.security')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('activar.howItWorks.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">1</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  {t('activar.howItWorks.step1.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  {t('activar.howItWorks.step1.description')}
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">2</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  {t('activar.howItWorks.step2.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  {t('activar.howItWorks.step2.description')}
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <span className="text-2xl font-bold text-brand-400">3</span>
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  {t('activar.howItWorks.step3.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  {t('activar.howItWorks.step3.description')}
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
                {t('activar.guarantee.title')}
              </h3>
              <p className="text-xl text-white">
                {t('activar.guarantee.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trial modules */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('activar.modules.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <ClockIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  {t('activar.modules.asistencia.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  {t('activar.modules.asistencia.description')}
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <DocumentTextIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  {t('activar.modules.planilla.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  {t('activar.modules.planilla.description')}
                </p>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <CurrencyDollarIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  {t('activar.modules.vouchers.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-300">
                  {t('activar.modules.vouchers.description')}
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
                {t('activar.form.title')}
              </h2>
            
              <div className="space-y-6">
                {/* Company Name */}
              <div>
                  <label className="block text-white font-medium mb-2">
                    {t('activar.form.empresa.label')}
                  </label>
                  <p className="text-brand-400 text-sm mb-2">{t('activar.form.empresa.help')}</p>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    className={`w-full p-3 rounded-lg glass border transition-all ${
                      errors.empresa 
                        ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-500' 
                        : 'border-brand-600/30 focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
                    } text-white placeholder-brand-400 focus:outline-none`}
                    placeholder={t('activar.form.empresa.placeholder')}
                    required
                  />
                  {errors.empresa && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.empresa}
                    </p>
                  )}
                </div>

                {/* Contact Name */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    {t('activar.form.nombre.label')}
                  </label>
                  <p className="text-brand-400 text-sm mb-2">{t('activar.form.nombre.help')}</p>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className={`w-full p-3 rounded-lg glass border transition-all ${
                      errors.nombre 
                        ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-500' 
                        : 'border-brand-600/30 focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
                    } text-white placeholder-brand-400 focus:outline-none`}
                    placeholder={t('activar.form.nombre.placeholder')}
                    required
                  />
                  {errors.nombre && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.nombre}
                    </p>
                  )}
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    {t('activar.form.whatsapp.label')}
                  </label>
                  <p className="text-brand-400 text-sm mb-2">{t('activar.form.whatsapp.help')}</p>
                  <input
                    type="tel"
                    value={formData.contactoWhatsApp}
                    onChange={(e) => handleInputChange('contactoWhatsApp', e.target.value)}
                    className={`w-full p-3 rounded-lg glass border transition-all ${
                      errors.contactoWhatsApp 
                        ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-500' 
                        : 'border-brand-600/30 focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
                    } text-white placeholder-brand-400 focus:outline-none`}
                    placeholder={t('activar.form.whatsapp.placeholder')}
                    required
                  />
                  {errors.contactoWhatsApp && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.contactoWhatsApp}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    {t('activar.form.email.label')}
                  </label>
                  <p className="text-brand-400 text-sm mb-2">{t('activar.form.email.help')}</p>
                  <input
                    type="email"
                    value={formData.contactoEmail}
                    onChange={(e) => handleInputChange('contactoEmail', e.target.value)}
                    className={`w-full p-3 rounded-lg glass border transition-all ${
                      errors.contactoEmail 
                        ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-500' 
                        : 'border-brand-600/30 focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
                    } text-white placeholder-brand-400 focus:outline-none`}
                    placeholder={t('activar.form.email.placeholder')}
                    required
                  />
                  {errors.contactoEmail && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.contactoEmail}
                    </p>
                  )}
                </div>

                {/* Employee Count */}
                <div>
                  <label className="block text-white font-medium mb-2 text-center">
                    {t('activar.form.empleados.label')}
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
                      <p className="text-brand-400 text-sm mt-2">{t('activar.form.empleados.help')}</p>
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
                    {t('activar.form.trial.label')}
                    </label>
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
                      {t('activar.form.submit.loading')}
                      </>
                    ) : (
                      <>
                      🚀 {t('activar.form.submit.default')}
                      </>
                    )}
                  </button>

                <p className="text-brand-400 text-xs text-center">
                  {t('activar.form.help')}
                </p>
                
                {Object.keys(errors).length > 0 && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm text-center">
                      ⚠️ {t('activar.form.errors')}
                    </p>
                </div>
                )}
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
                <p className="font-medium text-white">{t('activar.trust.acceso.title')}</p>
                <p className="text-sm text-brand-300">{t('activar.trust.acceso.description')}</p>
              </CardContent>
            </Card>
            
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <ShieldCheckIcon className="h-6 w-6 text-brand-400" />
                </div>
                <p className="font-medium text-white">{t('activar.trust.compromiso.title')}</p>
                <p className="text-sm text-brand-300">{t('activar.trust.compromiso.description')}</p>
              </CardContent>
            </Card>
            
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <UserGroupIcon className="h-6 w-6 text-purple-400" />
                </div>
                <p className="font-medium text-white">{t('activar.trust.soporte.title')}</p>
                <p className="text-sm text-brand-300">{t('activar.trust.soporte.description')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
