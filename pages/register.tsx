import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { UserPlus, Building, ArrowLeft, Clock, FileText, DollarSign, Lock, Phone, Eye, EyeOff } from 'lucide-react'
import { createClient as createSupabaseBrowserClient } from '../lib/supabase/client'
import PhoneAuthForm from '../components/PhoneAuthForm'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const router = useRouter()

  const handleFacebookRegister = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const redirectTo = `${siteUrl}/auth/callback?next=/app/dashboard`
      const { error } = await (supabase as any).auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo }
      })
      if (error) {
        setError(error.message || 'No se pudo registrarse con Facebook')
      }
      // In browser this will redirect automatically
    } catch (e: any) {
      setError(e?.message || 'Error registrándose con Facebook')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          companyName: formData.companyName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrarse')
      }

      if (data.user.needsEmailConfirmation) {
        router.push('/login?message=confirmation-required')
      } else {
        router.push('/app/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Registro - Sistema HR</title>
        <meta name="description" content="Crea tu cuenta y comienza a gestionar tu empresa" />
      </Head>

      <div className="min-h-screen bg-app flex items-center justify-center p-4 relative">
        <CloudBackground />
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTI5M2IiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative w-full max-w-md space-y-8 z-10">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
              <UserPlus className="h-10 w-10 text-brand-900" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Úsalo gratis por 30 días
            </h1>
            <p className="text-brand-200/90">
              Automatiza tu planilla en 24 horas o trabajo gratis hasta lograrlo
            </p>
          </div>

          {/* Registration Form */}
          <Card variant="glass" className="shadow-xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="flex items-center justify-center gap-2 text-white">
                <Building className="h-5 w-5" />
                Registro de Empresa
              </CardTitle>
              <CardDescription className="text-brand-200/90">
                Completa los datos para crear tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {authMethod === 'phone' ? (
                <PhoneAuthForm onBack={() => setAuthMethod('email')} />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Auth Method Selector */}
                  <div className="flex gap-2 mb-6">
                    <Button
                      type="button"
                      variant={authMethod === 'email' ? 'default' : 'outline'}
                      onClick={() => setAuthMethod('email')}
                      className="flex-1 h-10"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={(authMethod as string) === 'phone' ? 'default' : 'outline'}
                      onClick={() => setAuthMethod('phone')}
                      className="flex-1 h-10"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Teléfono
                    </Button>
                  </div>
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium text-brand-200/90">
                      Nombre Completo
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Tu nombre completo"
                      required
                      disabled={loading}
                      className="input-glass h-12"
                    />
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <label htmlFor="companyName" className="text-sm font-medium text-brand-200/90">
                      Nombre de la Empresa
                    </label>
                    <Input
                      id="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Mi Empresa S.A."
                      required
                      disabled={loading}
                      className="input-glass h-12"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-brand-200/90">
                      Correo Electrónico
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@empresa.com"
                      required
                      disabled={loading}
                      className="input-glass h-12"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-brand-200/90">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="input-glass h-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-300"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-brand-200/90">
                      Confirmar Contraseña
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className="input-glass h-12"
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="text-red-200 text-sm glass-strong p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white focus-ring" 
                    disabled={loading}
                  >
                    {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </Button>

                  {/* OAuth Providers */}
                  <div className="mt-6">
                    {/* Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-brand-500/20"></span>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-brand-900/50 px-2 text-brand-200">o</span>
                      </div>
                    </div>

                    {/* Facebook OAuth */}
                    <Button 
                      type="button"
                      variant="secondary"
                      className="w-full h-12 bg-brand-800/20 hover:bg-brand-800/30 text-brand-200 border-brand-500/20"
                      onClick={handleFacebookRegister}
                    >
                      Registrarse con Facebook
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Qué incluye */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Qué incluye tu cuenta gratuita
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card variant="glass" className="text-center">
                <CardHeader className="pb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                    <Clock className="h-8 w-8 text-brand-400" />
                  </div>
                  <CardTitle className="text-xl font-bold text-white">
                    Asistencia en tiempo real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-brand-300">Entradas/salidas, tardanza con justificación y reportes básicos.</p>
                </CardContent>
              </Card>

              <Card variant="glass" className="text-center">
                <CardHeader className="pb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                    <FileText className="h-8 w-8 text-brand-400" />
                  </div>
                  <CardTitle className="text-xl font-bold text-white">
                    Planilla legal HN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-brand-300">IHSS, RAP, ISR parametrizables; planilla de ejemplo lista para validar.</p>
                </CardContent>
              </Card>

              <Card variant="glass" className="text-center">
                <CardHeader className="pb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4 mx-auto">
                    <DollarSign className="h-8 w-8 text-brand-400" />
                  </div>
                  <CardTitle className="text-xl font-bold text-white">
                    Vouchers en PDF
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-brand-300">Descarga masiva y envío por email/WhatsApp cuando pases a plan.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Garantía */}
          <Card variant="glass" className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">
                Garantía: 24 horas o trabajo gratis hasta dejarlo andando
              </h2>
              <p className="text-lg text-brand-300 mb-6 text-center">
                Si en tu caso necesitamos más ajustes, seguimos trabajando sin costo adicional hasta que tu proceso quede funcionando.
              </p>
              <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <p className="text-sm text-brand-300">WhatsApp</p>
                  <p className="text-xs text-brand-400">+504 9470-7007</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-brand-300">Email</p>
                  <p className="text-xs text-brand-400">jorge7gomez@gmail.com</p>
                </div>
              </div>
              <p className="text-sm text-brand-400 text-center mt-6">
                Solo email requerido. Sin tarjeta. Sin compromiso.
              </p>
            </CardContent>
          </Card>

          {/* Social Proof */}
          <Card variant="glass" className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-8">
              <p className="text-xl text-white mb-4 text-center">
                <span className="text-green-400 font-bold">&quot;Reducimos 80% el tiempo de planilla con SISU.&quot;</span> — Paragon Financial Corp
              </p>
              <p className="text-brand-300 text-center">
                Infraestructura estilo AWS, datos cifrados en tránsito y en reposo, control de roles. Soporte por email o WhatsApp.
              </p>
            </CardContent>
          </Card>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-brand-200/90 text-sm mb-3">¿Ya tienes cuenta?</p>
            <Link 
              href="/app/login" 
              className="inline-flex items-center gap-2 text-brand-300 hover:text-white transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
