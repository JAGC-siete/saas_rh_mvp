import { useState } from 'react'
import { useRouter } from 'next/router'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { clientLogger } from '../../lib/logger-client'

interface EmployeePasswordLoginProps {
  onLoginSuccess: (sessionData: any) => void
}

export default function EmployeePasswordLogin({ onLoginSuccess }: EmployeePasswordLoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotPassword, setForgotPassword] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const router = useRouter()

  const handleInputChange = (field: 'email' | 'password' | 'otpCode', value: string) => {
    if (field === 'otpCode') {
      // Solo números para OTP
      const numericValue = value.replace(/\D/g, '')
      const limitedValue = numericValue.slice(0, 6)
      setOtpCode(limitedValue)
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
    
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('')
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      setError('Email y contraseña son requeridos')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        clientLogger.info('Employee login successful via password', {
          email: formData.email
        })

        onLoginSuccess(data)
      } else {
        setError(data.error || 'Credenciales inválidas')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Ingrese su email para enviar el código de recuperación')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/employees/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        })
      })

      const data = await response.json()

      if (response.ok) {
        setOtpSent(true)
        setForgotPassword(false)
      } else {
        setError(data.error || 'Error enviando código')
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otpCode || otpCode.length < 6) {
      setError('Ingrese el código de 6 dígitos')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/employees/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: otpCode
        })
      })

      const data = await response.json()

      if (response.ok) {
        clientLogger.info('Employee login successful via OTP', {
          email: formData.email
        })

        onLoginSuccess(data)
      } else {
        setError(data.error || 'Código inválido')
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPassword = () => {
    setForgotPassword(false)
    setOtpSent(false)
    setOtpCode('')
    setError('')
  }

  const isFormValid = formData.email.length > 0 && formData.password.length > 0
  const isOtpValid = otpCode.length === 6

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
            {otpSent 
              ? 'Ingrese el código enviado a su email'
              : forgotPassword
              ? 'Recuperar contraseña'
              : 'Paragon Honduras - Ingrese sus credenciales'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {otpSent ? (
            // Formulario de verificación OTP
            <form onSubmit={handleOtpVerification} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="text-center mb-4">
                <p className="text-sm text-gray-300">
                  Código enviado a: <span className="text-brand-400 font-medium">{formData.email}</span>
                </p>
                <button
                  type="button"
                  onClick={handleBackToPassword}
                  className="text-xs text-brand-400 hover:text-brand-300 underline mt-1"
                >
                  Volver al login
                </button>
              </div>
              
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                  Código de Verificación
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otpCode}
                  onChange={(e) => handleInputChange('otpCode', e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-lg font-mono tracking-wider placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  maxLength={6}
                />
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Ingrese el código de 6 dígitos enviado a su email
                </p>
              </div>

              <Button
                type="submit"
                disabled={!isOtpValid || loading}
                className="w-full h-12 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Verificando...</span>
                  </div>
                ) : (
                  'Verificar Código'
                )}
              </Button>
            </form>
          ) : (
            // Formulario de login con contraseña
            <form onSubmit={handlePasswordLogin} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Corporativo
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="nombre@paragonfinancialcorp.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Ingrese su contraseña"
                      className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || loading}
                className="w-full h-12 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setForgotPassword(true)}
                  className="text-sm text-brand-400 hover:text-brand-300 underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          )}

          {forgotPassword && !otpSent && (
            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-md">
              <p className="text-blue-400 text-sm mb-3">
                Se enviará un código de verificación a su email para recuperar el acceso.
              </p>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || !formData.email}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Enviando...' : 'Enviar Código'}
                </Button>
                <Button
                  type="button"
                  onClick={handleBackToPassword}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <div className="px-6 pb-6">
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-400">
              ¿Problemas para acceder?
            </p>
            <p className="text-xs text-gray-400">
              Contacte a Recursos Humanos: <br />
              <span className="text-brand-400 font-medium">rrhh@humanosisu.net</span>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
              <span>🔒</span>
              <span>Conexión segura y encriptada</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
