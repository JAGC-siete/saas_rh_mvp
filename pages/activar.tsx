import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, CheckCircleIcon, CloudArrowUpIcon, CurrencyDollarIcon, ClockIcon, DocumentDuplicateIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

interface FormData {
  empleados: number
  empresa: string
  contactoWhatsApp: string
  contactoEmail: string
  comprobante?: File
}

type PaymentMethod = 'transferencia' | 'tarjeta' | 'whatsapp'

export default function ActivarPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia')
  const [formData, setFormData] = useState<FormData>({
    empleados: 1,
    empresa: '',
    contactoWhatsApp: '',
    contactoEmail: ''
  })

  const handleEmpleadosChange = (value: number) => {
    setFormData(prev => ({ ...prev, empleados: Math.max(1, value) }))
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (file: File) => {
    setFormData(prev => ({ ...prev, comprobante: file }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const openWhatsApp = () => {
    const message = `Hola! Quiero activar mi sistema SISU para ${formData.empresa} con ${formData.empleados} empleados. Total: L${calculateTotal().toLocaleString()}/mes.`
    const whatsappUrl = `https://wa.me/50494707007?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      // Crear FormData para el archivo
      const submitData = new FormData()
      submitData.append('empleados', formData.empleados.toString())
      submitData.append('empresa', formData.empresa)
      submitData.append('contactoWhatsApp', formData.contactoWhatsApp)
      submitData.append('contactoEmail', formData.contactoEmail)
      submitData.append('paymentMethod', paymentMethod)
      
      if (formData.comprobante) {
        submitData.append('comprobante', formData.comprobante)
      }

      // Aquí iría la llamada a tu API
      const response = await fetch('/api/activar', {
        method: 'POST',
        body: submitData,
      })

      if (response.ok) {
        // Mensaje de éxito inmediato
        alert(`¡Recibido! Tu activación está en marcha. En 24 h tendrás acceso y una planilla de ejemplo. Te escribimos a WhatsApp ${formData.contactoWhatsApp}.`)
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
          content="Automatiza tu operación de asistencia, nómina y vouchers hoy. L300 por empleado. Listo en 24 horas."
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

        {/* Main Form - Single Step */}
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <Card variant="glass">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    Tu plan
                  </h2>

                  {/* Company Name */}
                  <div className="mb-6">
                    <label className="block text-white font-medium mb-2">
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

                  {/* Employee Count */}
                  <div className="mb-6">
                    <label className="block text-white font-medium mb-2 text-center">
                      ¿Cuántos empleados?
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

                  {/* Contact Information */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-white font-medium mb-2">
                        WhatsApp (para confirmación inmediata) *
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

                    <div>
                      <label className="block text-white font-medium mb-2">
                        Email (credenciales y vouchers) *
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
                  </div>

                  {/* Payment Method Selection */}
                  <div className="mb-6">
                    <label className="block text-white font-medium mb-3">
                      Método de pago:
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setPaymentMethod('transferencia')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          paymentMethod === 'transferencia'
                            ? 'border-brand-500 bg-brand-500/20 text-white'
                            : 'border-brand-600/30 glass text-brand-300 hover:border-brand-500'
                        }`}
                      >
                        Transferencia BAC
                      </button>
                      <button
                        onClick={() => setPaymentMethod('tarjeta')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          paymentMethod === 'tarjeta'
                            ? 'border-brand-500 bg-brand-500/20 text-white'
                            : 'border-brand-600/30 glass text-brand-300 hover:border-brand-500'
                        }`}
                      >
                        Tarjeta/PayPal USD
                      </button>
                      <button
                        onClick={() => setPaymentMethod('whatsapp')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          paymentMethod === 'whatsapp'
                            ? 'border-brand-500 bg-brand-500/20 text-white'
                            : 'border-brand-500 bg-green-600/20 text-white'
                        }`}
                      >
                        Confirmar por WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Specific Content */}
                  {paymentMethod === 'transferencia' && (
                    <div className="space-y-4 mb-6">
                      <Card variant="glass" className="border-yellow-500/30 bg-yellow-500/5">
                        <CardContent className="p-4">
                          <h3 className="text-yellow-400 font-bold mb-3">
                            Transfiere a BAC Honduras:
                          </h3>
                          <div className="flex items-center justify-center space-x-3 mb-3">
                            <span className="text-2xl font-bold text-white font-mono">722983451</span>
                            <button
                              onClick={() => copyToClipboard('722983451')}
                              className="p-2 glass rounded hover:bg-brand-500/20 transition-colors"
                              title="Copiar número de cuenta"
                            >
                              <DocumentDuplicateIcon className="h-5 w-5 text-brand-400" />
                            </button>
                            <button
                              className="p-2 glass rounded hover:bg-brand-500/20 transition-colors"
                              title="Mostrar QR"
                            >
                              <QrCodeIcon className="h-5 w-5 text-brand-400" />
                            </button>
                          </div>
                          <p className="text-brand-300 text-sm">
                            <span className="text-white">Titular:</span> JORGE ARTURO GOMEZ COELLO<br/>
                            <span className="text-white">Monto:</span> L{calculateTotal().toLocaleString()} • <span className="text-white">Concepto:</span> "Activación SISU - {formData.empresa}"
                          </p>
                        </CardContent>
                      </Card>

                      <button
                        onClick={openWhatsApp}
                        className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                      >
                        📱 Confirmar por WhatsApp (más rápido)
                      </button>

                      <div>
                        <h3 className="text-white font-medium mb-3 flex items-center">
                          <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                          Subir comprobante (opcional):
                        </h3>
                        <div className="border-2 border-dashed border-brand-600/30 rounded-lg p-6 text-center hover:border-brand-500 transition-colors glass">
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
                            <CloudArrowUpIcon className="h-8 w-8 text-brand-400 mx-auto mb-2" />
                            {formData.comprobante ? (
                              <div className="text-green-400">
                                ✅ {formData.comprobante.name}
                              </div>
                            ) : (
                              <div>
                                <p className="text-white text-sm">Haz clic para subir comprobante</p>
                                <p className="text-brand-400 text-xs">JPG, PNG o PDF (máx. 10MB)</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'tarjeta' && (
                    <div className="mb-6">
                      <p className="text-brand-300 text-center p-4 glass rounded-lg">
                        🚧 Integración de tarjeta/PayPal en desarrollo. Por favor selecciona otro método de pago.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'whatsapp' && (
                    <div className="mb-6">
                      <p className="text-brand-300 text-center p-4 glass rounded-lg">
                        📱 Te contactaremos por WhatsApp para confirmar los detalles y coordinar el pago.
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.empresa || !formData.contactoWhatsApp || !formData.contactoEmail || isLoading}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-lg font-semibold inline-flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        🚀 Activar mi sistema
                      </>
                    )}
                  </button>

                  <p className="text-brand-400 text-xs text-center mt-3">
                    Precio mensual en Lempiras. ISV 15% si aplica. Sin contratos. Cancela cuando quieras.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sticky Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card variant="glass" className="border-brand-500/30">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl text-white text-center">
                      Tu plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <p className="text-brand-300 text-sm">¿Cuántos empleados?</p>
                      <p className="text-3xl font-bold text-white">{formData.empleados}</p>
                      <p className="text-brand-400 text-sm">→ Total: L300 × {formData.empleados} = L{calculateTotal().toLocaleString()}/mes</p>
                    </div>
                    
                    <div className="pt-4 border-t border-brand-600/30">
                      <div className="space-y-2 text-sm">
                        <p className="text-brand-300">📱 <span className="text-white">{formData.contactoWhatsApp || 'WhatsApp'}</span></p>
                        <p className="text-brand-300">📧 <span className="text-white">{formData.contactoEmail || 'Email'}</span></p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-brand-600/30">
                      <div className="space-y-2 text-sm text-center">
                        <p className="text-green-400 font-medium">✅ L{calculateTotal().toLocaleString()}/mes</p>
                        <p className="text-brand-400 text-xs">(sin contratos)</p>
                        <p className="text-brand-300">Activas hoy, entregables en 24 h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
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
