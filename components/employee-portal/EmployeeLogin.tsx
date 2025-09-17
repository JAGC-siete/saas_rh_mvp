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
    last5: '',
    pin: ''
  })
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  const handleInputChange = (field: 'last5' | 'pin', value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '')
    
    // Limit length
    const maxLength = field === 'last5' ? 5 : 4
    const limitedValue = numericValue.slice(0, maxLength)
    
    setFormData(prev => ({
      ...prev,
      [field]: limitedValue
    }))
    
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.last5.length !== 5) {
      setError('Ingrese los últimos 5 dígitos de su DNI')
      return
    }
    
    if (formData.pin.length !== 4) {
      setError('Ingrese su PIN de 4 dígitos')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/employees/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          last5: formData.last5,
          pin: formData.pin
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Store session token in localStorage and cookie
        localStorage.setItem('employee_session_token', data.sessionToken)
        localStorage.setItem('employee_session_expires', data.expiresAt)
        localStorage.setItem('employee_data', JSON.stringify(data.employee))
        
        // Set cookie for API requests
        document.cookie = `employee_session_token=${data.sessionToken}; path=/; max-age=28800; secure; samesite=strict`

        clientLogger.info('Employee login successful', {
          employeeId: data.employee.id,
          employeeName: data.employee.name
        })

        onLoginSuccess(data)
      } else {
        setError(data.error || 'Error en el inicio de sesión')
        setAttempts(prev => prev + 1)
        
        // Clear form after multiple failed attempts
        if (attempts >= 2) {
          setFormData({ last5: '', pin: '' })
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = formData.last5.length === 5 && formData.pin.length === 4

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
            Paragon Honduras - Acceso Seguro
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="last5" className="block text-sm font-medium text-gray-300 mb-2">
                  Últimos 5 dígitos de su DNI
                </label>
                <input
                  id="last5"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.last5}
                  onChange={(e) => handleInputChange('last5', e.target.value)}
                  placeholder="12345"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-lg font-mono tracking-wider placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  maxLength={5}
                  autoComplete="off"
                />
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Ejemplo: Si su DNI es 0801-1234-56789, ingrese 56789
                </p>
              </div>

              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-300 mb-2">
                  PIN de 4 dígitos
                </label>
                <div className="relative">
                  <input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.pin}
                    onChange={(e) => handleInputChange('pin', e.target.value)}
                    placeholder="••••"
                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white text-center text-lg font-mono tracking-wider placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    maxLength={4}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                  >
                    {showPin ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  PIN proporcionado por Recursos Humanos
                </p>
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
                  <span>Verificando...</span>
                </div>
              ) : (
                'Iniciar Sesión'
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
