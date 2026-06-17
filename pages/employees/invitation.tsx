import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import PublicPageShell from '../../components/landing/PublicPageShell'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface InvitationData {
  id: string
  email: string
  expires_at: string
  employees: {
    name: string
    email: string
    role?: string  // Optional to maintain backward compatibility
  }
}

export default function InvitationAcceptance() {
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const { token: urlToken } = router.query
    if (urlToken && typeof urlToken === 'string') {
      setToken(urlToken)
      fetchInvitationData(urlToken)
    }
  }, [router.query])

  const fetchInvitationData = async (invitationToken: string) => {
    try {
      const response = await fetch(`/api/employees/invitations/validate?token=${invitationToken}`)
      const data = await response.json()

      if (response.ok) {
        setInvitationData(data.invitation)
      } else {
        setError(data.error || 'Invitación inválida')
      }
    } catch (error) {
      console.error('Error fetching invitation:', error)
      setError('Error cargando invitación')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      setError('Ambos campos de contraseña son requeridos')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (!token) {
      setError('Token de invitación no válido')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/employees/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          password: password
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Redirigir al portal después de 2 segundos
        setTimeout(() => {
          router.push('/employees/portal')
        }, 2000)
      } else {
        setError(data.error || 'Error aceptando invitación')
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = password.length >= 8 && confirmPassword.length >= 8 && password === confirmPassword

  if (success) {
    return (
      <PublicPageShell centered showFooter={false}>
        <Card variant="liquid" className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">✓</span>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              ¡Cuenta Creada Exitosamente!
            </CardTitle>
            <CardDescription className="text-gray-300">
              Su cuenta ha sido creada y será redirigido al portal de empleados
            </CardDescription>
          </CardHeader>
        </Card>
      </PublicPageShell>
    )
  }

  return (
    <PublicPageShell centered showFooter={false}>
      <Card variant="liquid" className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Bienvenido a Humano SISU
          </CardTitle>
          <CardDescription className="text-gray-300">
            Complete su registro estableciendo su contraseña
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {invitationData ? (
            <>
              <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-md">
                <h3 className="text-white font-medium mb-2">Detalles de la Invitación:</h3>
                <p className="text-sm text-gray-300">
                  <span className="text-brand-400">Empleado:</span> {invitationData.employees.name}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-brand-400">Email:</span> {invitationData.email}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-brand-400">Expira:</span> {new Date(invitationData.expires_at).toLocaleString()}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3">
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      autoComplete="new-password"
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita su contraseña"
                      className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
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
                      <span>Creando cuenta...</span>
                    </div>
                  ) : (
                    'Crear Cuenta y Acceder'
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              {error ? (
                <div className="bg-red-500/20 border border-red-500/30 rounded-md p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto"></div>
              )}
            </div>
          )}
        </CardContent>

        <div className="px-6 pb-6">
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-400">
              ¿Problemas con la invitación?
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
    </PublicPageShell>
  )
}
