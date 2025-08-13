import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, BuildingOfficeIcon, UserGroupIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { Card, CardContent } from '../components/ui/card'

interface FormData {
  empleados: number
  empresa: string
  contactoNombre: string
  contactoWhatsApp: string
  departamentos: string[]
}

const departamentosOptions = [
  'Administración',
  'Ventas',
  'Marketing',
  'Operaciones',
  'Producción',
  'Recursos Humanos',
  'Finanzas',
  'Tecnología',
  'Logística',
  'Servicio al Cliente'
]

export default function ActivarPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    empleados: 1,
    empresa: '',
    contactoNombre: '',
    contactoWhatsApp: '',
    departamentos: []
  })

  const handleEmpleadosChange = (value: number) => {
    setFormData(prev => ({ ...prev, empleados: Math.max(1, value) }))
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDepartamentosChange = (dept: string) => {
    setFormData(prev => {
      const isSelected = prev.departamentos.includes(dept)
      const newDepartments = isSelected
        ? prev.departamentos.filter(d => d !== dept)
        : [...prev.departamentos, dept]
      
      return {
        ...prev,
        departamentos: newDepartments
      }
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      const submitData = {
        empleados: formData.empleados,
        empresa: formData.empresa,
        contactoNombre: formData.contactoNombre,
        contactoWhatsApp: formData.contactoWhatsApp,
        departamentos: formData.departamentos,
        monto: formData.empleados * 300
      }

      const response = await fetch('/api/activar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        // Redirigir a página de confirmación
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
  const isStep2Valid = formData.empresa && formData.contactoNombre && formData.contactoWhatsApp

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
            �� Activa tu robot de RH hoy
          </h1>
          <p className="text-xl text-brand-300">
            L300 por empleado • Listo en 24 horas
          </p>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2].map((num) => (
              <div key={num} className={`flex items-center ${num < 2 ? 'flex-1' : ''}`}>
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
                {num < 2 && (
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
            
            {/* STEP 1: Número de empleados */}
            {step === 1 && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
                  <UserGroupIcon className="h-8 w-8 text-brand-400" />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-6">
                  ¿Cuántos empleados querés automatizar?
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
                    <p className="text-brand-300 font-medium text-lg">
                      Costo estimado: L{calculateTotal().toLocaleString()}
                    </p>
                    <p className="text-brand-400 text-sm">
                      L300 por empleado × {formData.empleados} empleados
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold inline-flex items-center transition-colors shadow-lg hover:-translate-y-0.5"
                >
                  Siguiente
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </button>
              </div>
            )}

            {/* STEP 2: Información de la empresa */}
            {step === 2 && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
                    <BuildingOfficeIcon className="h-8 w-8 text-brand-400" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Tu inversión: L{calculateTotal().toLocaleString()}
                  </h2>
                  <p className="text-brand-400">
                    Por {formData.empleados} empleados a L300 cada uno
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
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

                  <div>
                    <label className="block text-white font-medium mb-3">
                      Departamentos (selecciona todos los que apliquen)
                      <span className="text-brand-400 text-sm ml-2">
                        ({formData.departamentos.length} seleccionados)
                      </span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {departamentosOptions.map((dept) => (
                        <label
                          key={dept}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                            formData.departamentos.includes(dept)
                              ? 'glass-strong border-brand-500 text-brand-200 bg-brand-500/20'
                              : 'glass border-brand-600/30 text-brand-300 hover:border-brand-500/50 hover:text-white'
                          }`}
                          onClick={() => handleDepartamentosChange(dept)}
                        >
                          <input
                            type="checkbox"
                            checked={formData.departamentos.includes(dept)}
                            onChange={() => {}} // Handled by label onClick
                            className="sr-only"
                          />
                          <span className="text-sm">{dept}</span>
                          {formData.departamentos.includes(dept) && (
                            <CheckCircleIcon className="h-4 w-4 ml-auto text-brand-400" />
                          )}
                        </label>
                      ))}
                    </div>
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
                    onClick={handleSubmit}
                    disabled={!isStep2Valid || isLoading}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:-translate-y-0.5"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        🚀 Activar mi sistema
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
