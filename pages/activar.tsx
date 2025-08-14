import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, CloudArrowUpIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

interface FormData {
  empleados: number
  empresa: string
  contactoNombre: string
  contactoWhatsApp: string
  contactoEmail: string
  departamentosCount: number
  comprobante?: File
}

export default function ActivarPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    empleados: 1,
    empresa: '',
    contactoNombre: '',
    contactoWhatsApp: '',
    contactoEmail: '',
    departamentosCount: 1
  })

  const handleEmpleadosChange = (value: number) => {
    setFormData(prev => ({ ...prev, empleados: Math.max(1, value) }))
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDepartamentosCountChange = (value: number) => {
    setFormData(prev => ({ ...prev, departamentosCount: Math.max(1, value) }))
  }

  const handleFileUpload = (file: File) => {
    setFormData(prev => ({ ...prev, comprobante: file }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      // Crear FormData para el archivo
      const submitData = new FormData()
      submitData.append('empleados', formData.empleados.toString())
      submitData.append('empresa', formData.empresa)
      submitData.append('contactoNombre', formData.contactoNombre)
      submitData.append('contactoWhatsApp', formData.contactoWhatsApp)
      submitData.append('contactoEmail', formData.contactoEmail)
      submitData.append('departamentos', JSON.stringify({ total: formData.departamentosCount }))
      
      if (formData.comprobante) {
        submitData.append('comprobante', formData.comprobante)
      }

      // Aquí iría la llamada a tu API
      const response = await fetch('/api/activar', {
        method: 'POST',
        body: submitData,
      })

      if (response.ok) {
        // Redirigir a página de confirmación o mostrar mensaje de éxito
        alert('¡Sistema enviado! Te contactaremos en 24 horas con tus credenciales.')
        // Opcional: redirigir a landing o página de gracias
        window.location.href = '/gracias'
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

  const calculateTotal = () => formData.empleados * 300

  const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })
  return (
    <div className="min-h-screen bg-app relative">
      <Head>
        <title>Activar Robot de RH - HUMANO SISU</title>
        <meta
          name="description"
          content="Activa tu robot de RH hoy. L300 por empleado. Listo en 24 horas."
        />
      </Head>

      <CloudBackground />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center text-brand-300 hover:text-white mb-6 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a inicio
          </Link>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            🔥 Activa tu robot de RH hoy
          </h1>
          <p className="text-xl text-brand-300">
            L300 por empleado. Listo en 24 h.
          </p>
        </div>

        {/* Services Section - Horizontal Layout */}
        <div className="max-w-7xl mx-auto mb-16">
          <div className="grid md:grid-cols-2 gap-8">
            <Card variant="glass" className="text-center">
              <CardHeader className="pb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <ClockIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-2">
                  Control de asistencia. Cero excusas.
                </CardTitle>
                <CardDescription className="text-brand-300 font-medium text-lg">
                  Tu sistema antifraude que no perdona ni improvisa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-brand-200 leading-relaxed mb-6">
                  Solo 5 dígitos de DNI. Detecta tarde, temprano, ausente. Reportes en tiempo real.
                </p>
                <div className="space-y-2 text-sm text-brand-200 mb-6">
                  <p>🔍 Control en tiempo real</p>
                  <p>🔒 100% antifraude</p>
                  <p>📊 Reportes en un clic</p>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" className="text-center">
              <CardHeader className="pb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                  <CurrencyDollarIcon className="h-8 w-8 text-brand-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-2">
                  Planillas sin errores. Cero estrés.
                </CardTitle>
                <CardDescription className="text-brand-300 font-medium text-lg">
                  Tu robot de nómina 100% legal y automático.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-brand-200 leading-relaxed mb-6">
                  Calcula IHSS, RAP, ISR, genera comprobantes y los envía por correo o WhatsApp. Pagás sin errores. Dormís tranquilo.
                </p>
                <div className="space-y-2 text-sm text-brand-200 mb-6">
                  <p>⚡ De 4 horas a 4 minutos</p>
                  <p>💎 Cumplimiento legal total</p>
                  <p>📧 Vouchers automáticos por email o WhatsApp</p>
                </div>
              </CardContent>
            </Card>
          </div>
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
            
            {/* STEP 1 */}
            {step === 1 && (
              <div>
                <div className="mb-8">
                  <label className="block text-white font-medium mb-2 text-center">
                    Nombre de empresa *
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

                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    ¿Cuántos empleados tienes en nómina?
                  </h2>
                  
                  <div className="mb-8">
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
                    
                    <div className="mt-6 p-4 glass-strong border border-brand-500/30 rounded-lg">
                      <p className="text-brand-300 font-medium">
                        Costo estimado: L{calculateTotal().toLocaleString()}
                      </p>
                      <p className="text-brand-400 text-sm">
                        L300 por empleado × {formData.empleados} empleados
                      </p>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-6">
                    ¿Cuántos departamentos o equipos conforman tu empresa?
                  </h2>
                  
                  <div className="mb-8">
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={() => handleDepartamentosCountChange(formData.departamentosCount - 1)}
                        className="w-12 h-12 rounded-full glass border border-brand-600/30 hover:border-brand-500 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-brand-200"
                        disabled={formData.departamentosCount <= 1}
                      >
                        -
                      </button>
                      
                      <div className="text-center">
                        <input
                          type="number"
                          value={formData.departamentosCount}
                          onChange={(e) => handleDepartamentosCountChange(parseInt(e.target.value) || 1)}
                          className="w-24 h-16 text-3xl font-bold text-center glass border-2 border-brand-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all"
                          min="1"
                        />
                        <p className="text-brand-400 text-sm mt-2">departamentos</p>
                      </div>
                      
                      <button
                        onClick={() => handleDepartamentosCountChange(formData.departamentosCount + 1)}
                        className="w-12 h-12 rounded-full glass border border-brand-600/30 hover:border-brand-500 flex items-center justify-center text-2xl font-bold transition-all text-white hover:text-brand-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!formData.empresa}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold inline-flex items-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">
                  Tu inversión: L{calculateTotal().toLocaleString()}
                </h2>
                <p className="text-brand-400 text-center mb-8">
                  Por {formData.empleados} empleados a L300 cada uno
                </p>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2">
                        Contacto RH - Nombre *
                      </label>
                      <input
                        type="text"
                        value={formData.contactoNombre}
                        onChange={(e) => handleInputChange('contactoNombre', e.target.value)}
                        className="w-full p-3 rounded-lg glass border border-brand-600/30 text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                        placeholder="María González"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">
                        WhatsApp *
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
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.contactoEmail}
                      onChange={(e) => handleInputChange('contactoEmail', e.target.value)}
                      className="w-full p-3 rounded-lg glass border border-brand-600/30 text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                      placeholder="maria@miempresa.com"
                      required
                    />
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
                    onClick={() => setStep(3)}
                    disabled={!formData.contactoNombre || !formData.contactoWhatsApp || !formData.contactoEmail}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    Continuar al pago
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  🎯 Casi listo:
                </h2>

                <div className="space-y-6 mb-8">
                  <Card variant="glass" className="border-yellow-500/30 bg-yellow-500/5">
                    <CardContent className="p-6">
                      <h3 className="text-yellow-400 font-bold mb-3 flex items-center">
                        1. Transfiere a BANCO BAC HONDURAS:
                      </h3>
                      <div className="glass-strong p-4 rounded font-mono text-center">
                        <span className="text-2xl font-bold text-white">722983451</span>
                      </div>
                      <p className="text-brand-300 text-sm mt-2 font-medium">
                        <span className="text-white">Titular:</span> JORGE ARTURO GOMEZ COELLO<br/>
                        <span className="text-white">Monto:</span> L{calculateTotal().toLocaleString()} • <span className="text-white">Concepto:</span> &ldquo;Activación SISU - {formData.empresa}&rdquo;
                      </p>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="text-white font-bold mb-3 flex items-center">
                      <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                      2. Sube tu comprobante aquí:
                    </h3>
                    
                    <div className="border-2 border-dashed border-brand-600/30 rounded-lg p-8 text-center hover:border-brand-500 transition-colors glass">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file)
                        }}
                        className="hidden"
                        id="comprobante-upload"
                      />
                      <label htmlFor="comprobante-upload" className="cursor-pointer">
                        <CloudArrowUpIcon className="h-12 w-12 text-brand-400 mx-auto mb-4" />
                        {formData.comprobante ? (
                          <div className="text-green-400">
                            ✅ {formData.comprobante.name}
                          </div>
                        ) : (
                          <div>
                            <p className="text-white font-medium">Haz clic para subir comprobante</p>
                            <p className="text-brand-400 text-sm">JPG, PNG o PDF (máx. 10MB)</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="btn-secondary px-6 py-3 rounded-lg font-semibold inline-flex items-center"
                  >
                    <ArrowLeftIcon className="mr-2 h-5 w-5" />
                    Anterior
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.comprobante || isLoading}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        🚀 Enviar y activar mi sistema
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
                  <CheckCircleIcon className="h-6 w-6 text-brand-400" />
                </div>
                <p className="font-medium text-white">Soporte incluido</p>
                <p className="text-sm text-brand-300">Te acompañamos en el setup</p>
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
