import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { clientLogger } from '../../lib/logger-client'

interface EmployeeLoginProps {
  onLoginSuccess: (sessionData: {
    sessionToken: string
    employee: {
      id: string
      name: string
      dni_masked: string
      role: string
      department?: string
    }
    expiresAt: string
  }) => void
}

export default function EmployeeLogin({ onLoginSuccess }: EmployeeLoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    code: ''
  })
  const [showCode, setShowCode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [message, setMessage] = useState('')

  const handleInputChange = (field: 'email' | 'code', value: string) => {
    if (field === 'code') {
      // Only allow numbers for code
      const numericValue = value.replace(/\D/g, '')
      const limitedValue = numericValue.slice(0, 6) // OTP codes can be up to 6 digits
      
      setFormData(prev => ({
        ...prev,
        [field]: limitedValue
      }))
    } else {
      // Email field - no restrictions
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
    
    // Clear error when user starts typing
    if (error) setError('')
    if (message) setMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation based on current step
    if (step === 'email') {
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('Ingrese un email válido')
        return
      }
    } else {
      if (!formData.code || formData.code.length < 4) {
        setError('Ingrese el código de verificación')
        return
      }
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/employees/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: step === 'code' ? formData.code : undefined
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.step === 'send_code') {
          // Code sent, move to verification step
          setStep('code')
          setMessage(data.message || 'Código enviado a su email')
          setFormData(prev => ({ ...prev, code: '' })) // Clear code field
        } else if (data.step === 'verify_code') {
          // Login successful
          localStorage.setItem('employee_data', JSON.stringify(data.employee))

          clientLogger.info('Employee login successful via OTP', {
            employeeId: data.employee.id,
            employeeName: data.employee.name
          })

          onLoginSuccess({
            sessionToken: data.session?.access_token || 'supabase_managed',
            employee: data.employee,
            expiresAt: data.session?.expires_at || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
          })
        }
      } else {
        setError(data.error || 'Error en el proceso de autenticación')
        setAttempts(prev => prev + 1)
        
        // Clear form after multiple failed attempts
        if (attempts >= 2) {
          setFormData({ email: formData.email, code: '' })
          if (step === 'code') {
            setStep('email') // Go back to email step
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setFormData(prev => ({ ...prev, code: '' }))
    setError('')
    setMessage('')
  }

  const isFormValid = step === 'email' 
    ? formData.email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    : formData.code.length >= 4

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <Card className="w-full max-w-md glass-strong">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Portal de Empleados
          </CardTitle>
          <CardDescription className="text-gray-300">
            {step === 'email' 
              ? 'Paragon Honduras - Ingrese su email' 
              : 'Ingrese el código enviado a su email'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-md p-3">
                <p className="text-green-400 text-sm text-center">{message}</p>
              </div>
            )}

            <div className="space-y-4">
              {step === 'email' ? (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Corporativo
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="nombre@paragon.hn"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    autoComplete="email"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Use su email corporativo registrado en el sistema
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-300">
                      Código enviado a: <span className="text-brand-400 font-medium">{formData.email}</span>
                    </p>
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      className="text-xs text-brand-400 hover:text-brand-300 underline mt-1"
                    >
                      Cambiar email
                    </button>
                  </div>
                  
                  <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">
                    Código de Verificación
                  </label>
                  <div className="relative">
                    <input
                      id="code"
                      type={showCode ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      placeholder="123456"
                      className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white text-center text-lg font-mono tracking-wider placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                    >
                      {showCode ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Ingrese el código de 4-6 dígitos enviado a su email
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full h-12 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{step === 'email' ? 'Enviando código...' : 'Verificando...'}</span>
                </div>
              ) : (
                step === 'email' ? 'Enviar Código' : 'Verificar Código'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-400">
                ¿Problemas para acceder?
              </p>
              <p className="text-xs text-gray-400">
                Contacte a Recursos Humanos: <br />
                <span className="text-brand-400 font-medium">rrhh@paragon.hn</span>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
              <span>🔒</span>
              <span>Conexión segura y encriptada</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
