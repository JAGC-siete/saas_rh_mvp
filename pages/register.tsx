import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { UserPlus, Building, ArrowLeft, Clock, FileText, DollarSign } from 'lucide-react'

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
  const router = useRouter()

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
        router.push('/dashboard')
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

      <div className="min-h-screen bg-app flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
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
              <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="input-glass h-12"
                  />
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
              </form>
            </CardContent>
          </Card>

          {/* Qué incluye */}
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Qué incluye tu cuenta gratuita
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
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
                <span className="text-green-400 font-bold">"Reducimos 80% el tiempo de planilla con SISU."</span> — Paragon Financial Corp
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
