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
import Image from 'next/image'
import { createClient } from '../../lib/supabase/client'

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
      
      // Guardar datos del usuario en localStorage (sin JWT personalizado)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Sincronizar sesión del navegador con Supabase para que useAuth la detecte
      try {
        const supabase = await createClient()
        if (data?.session?.access_token && data?.session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          })
        }
      } catch (e) {
        // Continuar aunque falle la sincronización explícita; cookies httpOnly ya están
        console.warn('No se pudo sincronizar la sesión del navegador', e)
      }
      
      // Check for redirect parameter first
      const redirectParam = router.query.redirect as string | undefined
      
      // Check user role and redirect accordingly using router for better state management
      if (redirectParam && redirectParam.startsWith('/app/admin') && data.user.role === 'super_admin') {
        // Respect redirect parameter for super admin
        router.push(redirectParam)
      } else if (data.user.role === 'super_admin') {
        // Super admin goes to the full dashboard
        router.push('/app/admin/super-admin-dashboard')
      } else if (!data.user.company_id) {
        // Other users without company_id go to onboarding
        router.push('/onboarding')
      } else {
        // Regular users go to dashboard
        router.push('/app/dashboard')
      }
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
            <div className="mx-auto h-40 w-40 bg-white/10 rounded-full flex items-center justify-center mb-6 shadow-xl border border-white/20 backdrop-blur-sm">
              <Image
                src="/logo-humano-sisu.png"
                alt="Humano SISU Logo"
                width={96}
                height={96}
                className="rounded-lg"
              />
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
                
                {loading && (
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-brand-200">Autenticando...</span>
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
                  <button 
                    onClick={() => window.location.href = '/activar'}
                    className="text-sm text-brand-300 hover:text-white transition-colors"
                  >
                    ¿No tenés cuenta? Creá una acá
                  </button>
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
