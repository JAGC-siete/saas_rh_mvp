import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../../components/CloudBackground'), { ssr: false })
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginExisting() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error de autenticación')
      }

      const data = await response.json()
      
      // Guardar token en localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Redirigir al dashboard
      router.push('/app/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Iniciar Sesión - Humano SISU</title>
        <meta name="description" content="Accede a tu cuenta de Humano SISU" />
      </Head>

      <div className="min-h-screen bg-app flex items-center justify-center p-4 relative">
        <CloudBackground />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTI5M2IiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative w-full max-w-md space-y-8 z-10">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
              <ArrowRight className="h-10 w-10 text-brand-900" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-brand-200/90">
              Accede a tu cuenta existente
            </p>
          </div>

          {/* Login Form */}
          <Card variant="glass" className="shadow-xl">
            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-brand-200/90 mb-2 block">
                    Correo Electrónico
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    required
                    disabled={loading}
                    className="input-glass h-12"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-brand-200/90 mb-2 block">
                    Contraseña
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    required
                    disabled={loading}
                    className="input-glass h-12"
                  />
                </div>

                {error && (
                  <div className="text-red-200 text-sm glass-strong p-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white"
                  disabled={loading || !email || !password}
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>

                <div className="text-center">
                  <Link 
                    href="/auth/start" 
                    className="text-sm text-brand-300 hover:text-white transition-colors"
                  >
                    ¿No tenés cuenta? Creá una acá
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Pie de confianza */}
          <div className="text-center mt-6">
            <p className="text-xs text-brand-200/60">
              Sesión segura. Podés desvincular el acceso cuando quieras.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
