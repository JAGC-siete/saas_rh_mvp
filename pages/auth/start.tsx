import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../../components/CloudBackground'), { ssr: false })
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Mail, Phone, /* Facebook, */ ArrowRight, Loader2 } from 'lucide-react'
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
      const supabase = await createSupabaseBrowserClient()
      if (!supabase) throw new Error('Error inicializando Supabase')
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/onboarding`
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
        setError('Demasiados intentos. Volvé en 15 minutos.')
      } else {
        setError(err.message || 'Error enviando enlace mágico')
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
      const supabase = await createSupabaseBrowserClient()
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
        setError('Código incorrecto o expirado. Probá de nuevo en 30 segundos.')
      } else if (err.message?.includes('rate limit')) {
        setError('Demasiados intentos. Volvé en 15 minutos.')
      } else {
        setError(err.message || 'Código inválido')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = await createSupabaseBrowserClient()
      if (!supabase) throw new Error('Error inicializando Supabase')
      
      // Formatear el teléfono correctamente
      let formattedPhone = phone.trim()
      if (!formattedPhone.startsWith('+')) {
        // Si no tiene código de país, agregar +504 para Honduras
        formattedPhone = `+504${formattedPhone.replace(/\D/g, '')}`
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms'
        }
      })
      
      if (error) throw error
      
      setStep('otp')
    } catch (err: any) {
      if (err.message?.includes('Invalid phone')) {
        setError('Formato de teléfono inválido. Usá: +504 9999-9999')
      } else if (err.message?.includes('rate limit')) {
        setError('Demasiados intentos. Volvé en 15 minutos.')
      } else {
        setError(err.message || 'Error enviando código SMS')
      }
    } finally {
      setLoading(false)
    }
  }

  // Facebook OAuth - Comentado hasta configurar en Facebook Developers
  // const handleOAuth = async (provider: 'facebook') => {
  //   setLoading(true)
  //   setError('')

  //   try {
  //     const supabase = await createSupabaseBrowserClient()
  //     if (!supabase) throw new Error('Error inicializando Supabase')
      
  //     const { error } = await supabase.auth.signInWithOAuth({
  //       provider,
  //       options: {
  //         redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`
  //       }
  //     })
      
  //     if (error) throw error
  //   } catch (err: any) {
  //     setError(err.message || 'Error con autenticación de Facebook')
  //     setLoading(false)
  //   }
  // }

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
            {/* Badges */}
            {step === 'method' && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                  Cumplí STSS Honduras
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                  Setup en 24 horas
                </span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                  30 días gratis
                </span>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
                  Empleados ilimitados
                </span>
              </div>
            )}

            <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
              <ArrowRight className="h-10 w-10 text-brand-900" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {step === 'method' ? 'Creá tu Departamento de RH en 1 minuto y cumplí con S.T.S.S. desde hoy' : 
               step === 'email' ? 'Revisá tu bandeja' :
               step === 'phone' ? 'Ingresá tu teléfono' :
               'Verificá tu código'}
            </h1>
            <p className="text-brand-200/90">
              {step === 'method' ? '100% digital y automático. Planilla en 5 minutos con IHSS, RAP e ISR incluidos. Vouchers por correo y WhatsApp.' :
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
                    Crear mi cuenta con correo
                  </Button>
                  
                  {/* Facebook OAuth - Comentado hasta configurar en Facebook Developers */}
                  {/* <Button
                    onClick={() => handleOAuth('facebook')}
                    variant="outline"
                    className="w-full h-12 border-brand-500/20 text-brand-200 hover:bg-brand-800/20"
                    disabled={loading}
                  >
                    <Facebook className="h-5 w-5 mr-2" />
                    Continuar con Facebook
                  </Button> */}

                  <Button
                    onClick={() => setStep('phone')}
                    variant="outline"
                    className="w-full h-12 border-brand-500/20 text-brand-200 hover:bg-brand-800/20"
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    Continuar con Teléfono
                  </Button>

                  <p className="text-xs text-brand-200/60 text-center">
                    Sin contraseña. Sin tarjeta. Podés cancelar cuando quieras.
                  </p>

                  <div className="text-center">
                    <Link 
                      href="/app/login" 
                      className="text-sm text-brand-300 hover:text-white transition-colors"
                    >
                      ¿Ya tenés cuenta? Entrá acá
                    </Link>
                  </div>
                </div>
              )}

              {step === 'phone' && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Acceso con Teléfono</h3>
                    <p className="text-sm text-brand-200/80">Te enviaremos un código de verificación</p>
                  </div>

                  <form onSubmit={handlePhoneAuth} className="space-y-4">
                    <div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+504 9999-9999"
                        required
                        disabled={loading}
                        className="input-glass h-12 w-full"
                      />
                      <p className="text-xs text-brand-400 mt-1">
                        Incluí el código de país (ej: +504 para Honduras)
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
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando código...
                        </>
                      ) : (
                        <>
                          <Phone className="h-5 w-5 mr-2" />
                          Enviar Código
                        </>
                      )}
                    </Button>
                  </form>

                  <Button
                    type="button"
                    onClick={() => setStep('method')}
                    variant="ghost"
                    className="w-full h-12 text-brand-300 hover:text-white"
                  >
                    ← Volver
                  </Button>
                </div>
              )}

              {step === 'email' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-green-400 text-sm glass-strong p-3 rounded-md">
                      Revisá tu bandeja (o spam). Asunto: "Tu acceso a Humano SISU". Válido por 10 minutos.
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
                      Te enviamos un código de 6 dígitos. Expira en 2 minutos.
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
              Sesión segura. Podés desvincular el acceso cuando quieras.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
