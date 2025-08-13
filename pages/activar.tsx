import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, BuildingOfficeIcon, UserGroupIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { Card, CardContent } from '../components/ui/card'

interface FormData {
  empleados: number
  departamentosCount: number
  empresa: string
  contactoNombre: string
  contactoWhatsApp: string
  contactoEmail: string
}

export default function ActivarPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    empleados: 1,
    departamentosCount: 1,
    empresa: '',
    contactoNombre: '',
    contactoWhatsApp: '',
    contactoEmail: '',
  })

  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    empleados: false,
    departamentosCount: false,
    empresa: false,
    contactoNombre: false,
    contactoWhatsApp: false,
    contactoEmail: false,
  })

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^(\+?\d{1,3}[- ]?)?(\d{4}[- ]?\d{4}|\d{7,14})$/

  const isValidEmail = (email: string) => emailRegex.test(email.trim())
  const isValidPhone = (phone: string) => phoneRegex.test(phone.trim())

  const calculateTotal = () => formData.empleados * 300

  const isStep1Valid =
    formData.empleados >= 1 &&
    formData.departamentosCount >= 1 &&
    formData.empresa.trim().length > 0

  const isStep2Valid =
    formData.contactoNombre.trim().length > 0 &&
    isValidPhone(formData.contactoWhatsApp) &&
    isValidEmail(formData.contactoEmail)

  const isFormValid = isStep1Valid && isStep2Valid

  const markTouched = (fields: Array<keyof FormData>) => {
    setTouched(prev => {
      const next = { ...prev }
      fields.forEach(f => { next[f] = true })
      return next
    })
  }

  const handleEmpleadosChange = (value: number) => {
    setFormData(prev => ({ ...prev, empleados: Math.max(1, Number.isFinite(value) ? value : 1) }))
  }

  const handleDepartamentosCountChange = (value: number) => {
    setFormData(prev => ({ ...prev, departamentosCount: Math.max(1, Number.isFinite(value) ? value : 1) }))
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNextFromStep1 = () => {
    if (!isStep1Valid) {
      markTouched(['empresa', 'departamentosCount'])
      return
    }
    setStep(2)
  }

  const handleNextFromStep2 = () => {
    if (!isStep2Valid) {
      markTouched(['contactoNombre', 'contactoWhatsApp', 'contactoEmail'])
      return
    }
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!isFormValid) {
      markTouched(['empresa', 'departamentosCount', 'contactoNombre', 'contactoWhatsApp', 'contactoEmail'])
      return
    }

    setIsLoading(true)
    try {
      const submitData = {
        empleados: formData.empleados,
        departamentosCount: formData.departamentosCount,
        empresa: formData.empresa,
        contactoNombre: formData.contactoNombre,
        contactoWhatsApp: formData.contactoWhatsApp,
        contactoEmail: formData.contactoEmail,
        monto: calculateTotal(),
      }

      const response = await fetch('/api/activar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        window.location.href = '/gracias'
      } else {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || 'Error al enviar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Hubo un error. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <Head>
        <title>Activar Robot de RH - HUMANO SISU</title>
        <meta
          name="description"
          content="Activa tu robot de RH hoy. L300 por empleado. Listo en 24 horas."
        />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center text-brand-300 hover:text-white mb-6 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a inicio
          </Link>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Activa tu robot de RH hoy
          </h1>
          <p className="text-xl text-brand-300">
            L300 por empleado • Listo en 24 horas
          </p>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className={`flex items-center ${num < 3 ? 'flex-1' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  step >= num 
                    ? 'bg-brand-600 border-brand-600 text-white' 
                    : 'border-brand-600/30 text-brand-400'
                }`}>
                  {step > num ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    num
                  )}
                </div>
                {num < 3 && (
                  <div className={`flex-1 h-1 mx-4 rounded ${
                    step > num ? 'bg-brand-600' : 'bg-brand-600/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Content */}
        <div className="max-w-2xl mx-auto">
          <Card variant="glass">
            <CardContent className="p-8">
            
            {/* STEP 1: Datos básicos de la empresa */}
            {step === 1 && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
                    <UserGroupIcon className="h-8 w-8 text-brand-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Datos básicos de la empresa</h2>
                </div>

                {/* Cantidad de empleados */}
                <div className="mb-8">
                  <label className="block text-white font-medium mb-3 text-center">Cantidad de empleados</label>
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
                        onBlur={() => setTouched(prev => ({ ...prev, empleados: true }))}
                        className={`w-24 h-16 text-3xl font-bold text-center glass border-2 rounded-lg text-white focus:outline-none focus:ring-2 transition-all ${
                          formData.empleados >= 1 ? 'border-brand-500 focus:ring-brand-400 focus:border-brand-400' : 'border-red-500 focus:ring-red-400 focus:border-red-400'
                        }`}
                        min="1"
                        aria-invalid={formData.empleados < 1}
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

                {/* Cantidad de departamentos/equipos */}
                <div className="mb-6">
                  <label className="block text-white font-medium mb-2">Cantidad de departamentos/equipos</label>
                  <input
                    type="number"
                    value={formData.departamentosCount}
                    onChange={(e) => handleDepartamentosCountChange(parseInt(e.target.value) || 1)}
                    onBlur={() => setTouched(prev => ({ ...prev, departamentosCount: true }))}
                    className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 transition-all ${
                      formData.departamentosCount >= 1 ? 'border-brand-600/30 focus:ring-brand-500 focus:border-brand-500' : 'border-red-500 focus:ring-red-400 focus:border-red-400'
                    }`}
                    placeholder="Ej. 3"
                    min={1}
                    aria-invalid={touched.departamentosCount && formData.departamentosCount < 1}
                  />
                  {touched.departamentosCount && formData.departamentosCount < 1 && (
                    <p className="text-red-400 text-sm mt-1">Ingresa al menos 1.</p>
                  )}
                </div>

                {/* Nombre de la empresa */}
                <div className="mb-8">
                  <label className="block text-white font-medium mb-2">Nombre de la empresa</label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, empresa: true }))}
                    className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 transition-all ${
                      formData.empresa.trim() ? 'border-brand-600/30 focus:ring-brand-500 focus:border-brand-500' : (touched.empresa ? 'border-red-500 focus:ring-red-400 focus:border-red-400' : 'border-brand-600/30')
                    }`}
                    placeholder="Mi Empresa S.A."
                    aria-invalid={touched.empresa && !formData.empresa.trim()}
                  />
                  {touched.empresa && !formData.empresa.trim() && (
                    <p className="text-red-400 text-sm mt-1">Este campo es obligatorio.</p>
                  )}
                </div>

                <div className="mt-6 p-4 glass-strong border border-brand-500/30 rounded-lg">
                  <p className="text-brand-300 font-medium text-lg">
                    Costo estimado: L{calculateTotal().toLocaleString()}
                  </p>
                  <p className="text-brand-400 text-sm">
                    L300 por empleado × {formData.empleados} empleados
                  </p>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleNextFromStep1}
                    disabled={!isStep1Valid}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold inline-flex items-center transition-colors shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Datos del representante */}
            {step === 2 && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
                    <BuildingOfficeIcon className="h-8 w-8 text-brand-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Datos del representante</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-white font-medium mb-2">Tu nombre completo</label>
                    <input
                      type="text"
                      value={formData.contactoNombre}
                      onChange={(e) => handleInputChange('contactoNombre', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, contactoNombre: true }))}
                      className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 transition-all ${
                        formData.contactoNombre.trim() ? 'border-brand-600/30 focus:ring-brand-500 focus:border-brand-500' : (touched.contactoNombre ? 'border-red-500 focus:ring-red-400 focus:border-red-400' : 'border-brand-600/30')
                      }`}
                      placeholder="María González"
                      aria-invalid={touched.contactoNombre && !formData.contactoNombre.trim()}
                    />
                    {touched.contactoNombre && !formData.contactoNombre.trim() && (
                      <p className="text-red-400 text-sm mt-1">Este campo es obligatorio.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Número de contacto (celular)</label>
                    <input
                      type="tel"
                      value={formData.contactoWhatsApp}
                      onChange={(e) => handleInputChange('contactoWhatsApp', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, contactoWhatsApp: true }))}
                      className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 transition-all ${
                        !touched.contactoWhatsApp || isValidPhone(formData.contactoWhatsApp) ? 'border-brand-600/30 focus:ring-brand-500 focus:border-brand-500' : 'border-red-500 focus:ring-red-400 focus:border-red-400'
                      }`}
                      placeholder="9999-9999 o +504 99999999"
                      aria-invalid={touched.contactoWhatsApp && !isValidPhone(formData.contactoWhatsApp)}
                    />
                    {touched.contactoWhatsApp && !isValidPhone(formData.contactoWhatsApp) && (
                      <p className="text-red-400 text-sm mt-1">Ingresa un número válido.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Correo electrónico</label>
                    <input
                      type="email"
                      value={formData.contactoEmail}
                      onChange={(e) => handleInputChange('contactoEmail', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, contactoEmail: true }))}
                      className={`w-full p-3 rounded-lg glass border text-white placeholder-brand-400 focus:outline-none focus:ring-2 transition-all ${
                        !touched.contactoEmail || isValidEmail(formData.contactoEmail) ? 'border-brand-600/30 focus:ring-brand-500 focus:border-brand-500' : 'border-red-500 focus:ring-red-400 focus:border-red-400'
                      }`}
                      placeholder="correo@empresa.com"
                      aria-invalid={touched.contactoEmail && !isValidEmail(formData.contactoEmail)}
                    />
                    {touched.contactoEmail && !isValidEmail(formData.contactoEmail) && (
                      <p className="text-red-400 text-sm mt-1">Ingresa un correo válido.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setStep(1)}
                    className="glass border border-brand-600/30 text-brand-200 hover:text-white hover:border-brand-500 px-6 py-3 rounded-lg font-semibold inline-flex items-center transition-all"
                  >
                    <ArrowLeftIcon className="mr-2 h-5 w-5" />
                    Anterior
                  </button>
                  
                  <button
                    onClick={handleNextFromStep2}
                    disabled={!isStep2Valid}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:-translate-y-0.5"
                  >
                    Siguiente
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Revisión y confirmación */}
            {step === 3 && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
                    <CurrencyDollarIcon className="h-8 w-8 text-brand-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Revisión y confirmación</h2>
                  <p className="text-brand-400 mt-2">Verifica que los datos sean correctos antes de enviar.</p>
                </div>

                <div className="space-y-4">
                  <div className="glass p-4 rounded-lg border border-white/10">
                    <p className="text-brand-300"><span className="text-white font-medium">Empresa:</span> {formData.empresa || '-'}
                    </p>
                  </div>
                  <div className="glass p-4 rounded-lg border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p className="text-brand-300"><span className="text-white font-medium">Empleados:</span> {formData.empleados}</p>
                    <p className="text-brand-300"><span className="text-white font-medium">Departamentos/Equipos:</span> {formData.departamentosCount}</p>
                  </div>
                  <div className="glass p-4 rounded-lg border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p className="text-brand-300"><span className="text-white font-medium">Representante:</span> {formData.contactoNombre || '-'}</p>
                    <p className="text-brand-300"><span className="text-white font-medium">Celular:</span> {formData.contactoWhatsApp || '-'}</p>
                  </div>
                  <div className="glass p-4 rounded-lg border border-white/10">
                    <p className="text-brand-300"><span className="text-white font-medium">Correo:</span> {formData.contactoEmail || '-'}</p>
                  </div>

                  <div className="mt-6 p-4 glass-strong border border-brand-500/30 rounded-lg">
                    <p className="text-brand-300 font-medium text-lg">
                      Total a pagar: L{calculateTotal().toLocaleString()}
                    </p>
                    <p className="text-brand-400 text-sm">
                      L300 por empleado × {formData.empleados} empleados
                    </p>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setStep(2)}
                    className="glass border border-brand-600/30 text-brand-200 hover:text-white hover:border-brand-500 px-6 py-3 rounded-lg font-semibold inline-flex items-center transition-all"
                  >
                    <ArrowLeftIcon className="mr-2 h-5 w-5" />
                    Anterior
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid || isLoading}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:-translate-y-0.5"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        Confirmar y enviar
                        <ArrowRightIcon className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        </div>

        {/* Trust indicators */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="grid md:grid-cols-3 gap-6">
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <p className="font-medium text-white">Activación en 24h</p>
                <p className="text-sm text-brand-300">Sistema listo para usar</p>
              </CardContent>
            </Card>
            
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <CurrencyDollarIcon className="h-6 w-6 text-brand-400" />
                </div>
                <p className="font-medium text-white">Pago seguro</p>
                <p className="text-sm text-brand-300">Transferencia bancaria</p>
              </CardContent>
            </Card>
            
            <Card variant="glass" className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <CheckCircleIcon className="h-6 w-6 text-purple-400" />
                </div>
                <p className="font-medium text-white">Datos seguros</p>
                <p className="text-sm text-brand-300">Encriptación completa</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
