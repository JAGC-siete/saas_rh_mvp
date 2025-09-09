import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../../components/CloudBackground'), { ssr: false })
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Mail, Phone, Github, ArrowRight } from 'lucide-react'
import { createClient as createSupabaseBrowserClient } from '../../lib/supabase/client'

export default function AuthStart() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'method' | 'email' | 'phone' | 'otp'>('method')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleEmailMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) throw new Error('Error inicializando Supabase')
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`
        }
      })
      
      if (error) throw error
      
      // Mostrar mensaje de éxito
      setError('')
      setStep('email')
    } catch (err: any) {
      if (err.message?.includes('Invalid email')) {
        setError('Revisá el formato del correo.')
      } else if (err.message?.includes('rate limit')) {
        setError('Demasiados intentos. Volvé en 15 min.')
      } else {
        setError(err.message || 'Error enviando enlace mágico')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) throw new Error('Error inicializando Supabase')
      
      const formattedPhone = phone.startsWith('+') ? phone : `+504${phone.replace(/\D/g, '')}`
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: { channel: 'sms' }
      })
      
      if (error) throw error
      
      setStep('otp')
    } catch (err: any) {
      if (err.message?.includes('Invalid phone')) {
        setError('Usá formato internacional: +504…')
      } else if (err.message?.includes('rate limit')) {
        setError('Demasiados intentos. Volvé en 15 min.')
      } else {
        setError(err.message || 'Error enviando código SMS')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) throw new Error('Error inicializando Supabase')
      
      const formattedPhone = phone.startsWith('+') ? phone : `+504${phone.replace(/\D/g, '')}`
      
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'sms'
      })
      
      if (error) throw error
      
      router.push('/onboarding')
    } catch (err: any) {
      if (err.message?.includes('Invalid OTP') || err.message?.includes('expired')) {
        setError('Código inválido o expirado. Reintentar en 30s.')
      } else if (err.message?.includes('rate limit')) {
        setError('Demasiados intentos. Volvé en 15 min.')
      } else {
        setError(err.message || 'Código inválido')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) throw new Error('Error inicializando Supabase')
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`
        }
      })
      
      if (error) throw error
    } catch (err: any) {
      setError(err.message || `Error con ${provider}`)
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Iniciar Sesión - Sistema HR</title>
        <meta name="description" content="Accede a tu cuenta de forma segura" />
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
              {step === 'method' ? 'Activá tus Robots de RH en 60s' : 
               step === 'email' ? 'Revisá tu correo' :
               step === 'phone' ? 'Ingresá tu teléfono' :
               'Verificá tu código'}
            </h1>
            <p className="text-brand-200/90">
              {step === 'method' ? 'Planilla lista en 5 minutos. IHSS, RAP e ISR incluidos. Vouchers por Mail/WhatsApp.' :
               step === 'email' ? 'Te enviamos un enlace mágico' :
               step === 'phone' ? 'Te enviaremos un código por SMS' :
               'Ingresá el código de 6 dígitos'}
            </p>
          </div>

          {/* Auth Form */}
          <Card variant="glass" className="shadow-xl">
            <CardContent className="p-8">
              {step === 'method' && (
                <div className="space-y-4">
                  <Button
                    onClick={() => setStep('email')}
                    className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white"
                  >
                    <Mail className="h-5 w-5 mr-2" />
                    Entrar con Email
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setStep('phone')}
                      variant="outline"
                      className="flex-1 h-12 border-brand-500/20 text-brand-200 hover:bg-brand-800/20"
                    >
                      <Phone className="h-5 w-5 mr-2" />
                      Entrar con Teléfono
                    </Button>
                    
                    <span className="text-brand-200/60">·</span>
                    
                    <Button
                      onClick={() => handleOAuth('google')}
                      variant="outline"
                      className="flex-1 h-12 border-brand-500/20 text-brand-200 hover:bg-brand-800/20"
                      disabled={loading}
                    >
                      <Github className="h-5 w-5 mr-2" />
                      Entrar con Google
                    </Button>
                  </div>

                  <p className="text-xs text-brand-200/60 text-center">
                    Sin contraseñas. Sin tarjeta. Cumplimiento STSS desde el día uno.
                  </p>

                  <div className="text-center">
                    <Link 
                      href="/login" 
                      className="text-sm text-brand-300 hover:text-white transition-colors"
                    >
                      ¿Ya tenés cuenta? Ingresá acá
                    </Link>
                  </div>
                </div>
              )}

              {step === 'email' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-green-400 text-sm glass-strong p-3 rounded-md">
                      Revisá tu correo (o spam). Asunto: "Tu acceso a Humano SISU". Válido por 10 min.
                    </div>
                  </div>

                  <form onSubmit={handleEmailMagicLink} className="space-y-4">
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

                    {error && (
                      <div className="text-red-200 text-sm glass-strong p-3 rounded-md">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white"
                      disabled={loading || !email}
                    >
                      {loading ? 'Mandando tu enlace seguro…' : 'Enviar Enlace Mágico'}
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setStep('method')}
                      variant="ghost"
                      className="w-full h-12 text-brand-300 hover:text-white"
                    >
                      ← Volver
                    </Button>
                  </form>
                </div>
              )}

              {step === 'phone' && (
                <form onSubmit={handlePhoneOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-brand-200/90 mb-2 block">
                      Número de Teléfono
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+504 9xx xxx xx"
                      required
                      disabled={loading}
                      className="input-glass h-12"
                    />
                    <p className="text-xs text-brand-400 mt-1">
                      Usá formato internacional: +504…
                    </p>
                  </div>

                  {error && (
                    <div className="text-red-200 text-sm glass-strong p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white"
                    disabled={loading || !phone}
                  >
                    {loading ? 'Mandando tu enlace seguro…' : 'Enviar Código SMS'}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setStep('method')}
                    variant="ghost"
                    className="w-full h-12 text-brand-300 hover:text-white"
                  >
                    ← Volver
                  </Button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-brand-200/90 mb-2 block">
                      Código de Verificación
                    </label>
                    <Input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      disabled={loading}
                      className="input-glass h-12 text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                    <p className="text-xs text-brand-400 mt-1">
                      Te enviamos un código de 6 dígitos. Expira en 2 min.
                    </p>
                  </div>

                  {error && (
                    <div className="text-red-200 text-sm glass-strong p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white"
                    disabled={loading || otpCode.length !== 6}
                  >
                    {loading ? 'Verificando…' : 'Verificar Código'}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setStep('phone')}
                    variant="ghost"
                    className="w-full h-12 text-brand-300 hover:text-white"
                  >
                    ← Cambiar Número
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Pie de confianza */}
          <div className="text-center mt-6">
            <p className="text-xs text-brand-200/60">
              Sesión segura con cookies httpOnly. Sin contraseñas. Podés desvincular acceso cuando quieras.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
