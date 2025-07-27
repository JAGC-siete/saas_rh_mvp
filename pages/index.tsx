import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Shield, Lock, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  
  const { user, login } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Update time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('es-HN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const success = await login(email, password)
    
    if (!success) {
      setError('Credenciales inválidas. Verifique su email y contraseña.')
    }
    
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>Sistema de Recursos Humanos</title>
        <meta name="description" content="Acceso para administradores del sistema de recursos humanos" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Sistema de Recursos Humanos
            </h1>
            <p className="text-blue-100 text-base">
              Acceso para administradores
            </p>
            <div className="mt-4 text-lg font-mono text-white">
              {currentTime}
            </div>
          </div>

          {/* Login Form */}
          <Card className="bg-white shadow-xl border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2 text-gray-800 text-lg">
                <Lock className="h-5 w-5" />
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-gray-600">
                Ingrese sus credenciales para acceder al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Correo Electrónico
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@empresa.com"
                    required
                    disabled={loading}
                    className="h-12 bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className="h-12 pr-12 bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verificando...
                    </div>
                  ) : (
                    'Ingresar al Sistema'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Public Access Link */}
          <div className="text-center">
            <p className="text-blue-100 text-sm mb-3">¿Eres empleado?</p>
            <a 
              href="/registrodeasistencia" 
              className="inline-flex items-center gap-2 text-white hover:text-blue-200 transition-colors text-sm font-medium bg-white/10 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 backdrop-blur-sm"
            >
              <Clock className="h-4 w-4" />
              Registrar Asistencia
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
