import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { User, Building, ArrowRight, CheckCircle } from 'lucide-react'
import { createClient as createSupabaseBrowserClient } from '../lib/supabase/client'

export default function Onboarding() {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [step, setStep] = useState<'profile' | 'company' | 'complete'>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Verificar si el usuario está autenticado
    const checkUser = async () => {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        router.push('/auth/start')
        return
      }
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/start')
        return
      }
      
      setUser(user)
      
      // Si ya tiene nombre, ir directo a company
      if (user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name)
        setStep('company')
      }
    }
    
    checkUser()
  }, [router])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) throw new Error('Error inicializando Supabase')
      
      // Actualizar perfil del usuario
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      })
      
      if (error) throw error
      
      setStep('company')
    } catch (err: any) {
      setError(err.message || 'Error actualizando perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) throw new Error('Error inicializando Supabase')
      
      if (inviteToken) {
        // Unirse a empresa existente
        const { error } = await supabase.auth.updateUser({
          data: { 
            company_name: 'Empresa Invitada',
            invite_token: inviteToken
          }
        })
        
        if (error) throw error
        
        // Aquí podrías procesar el token de invitación
        // y asociar al usuario con la empresa
      } else {
        // Crear nueva empresa
        const { error } = await supabase.auth.updateUser({
          data: { company_name: companyName }
        })
        
        if (error) throw error
        
        // Aquí podrías crear la empresa en la base de datos
        // usando el service role key
      }
      
      setStep('complete')
    } catch (err: any) {
      setError(err.message || 'Error configurando empresa')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    router.push('/app/dashboard')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Configuración Inicial - Sistema HR</title>
        <meta name="description" content="Completa tu perfil para comenzar" />
      </Head>

      <div className="min-h-screen bg-app flex items-center justify-center p-4 relative">
        <CloudBackground />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTI5M2IiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative w-full max-w-md space-y-8 z-10">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
              {step === 'complete' ? (
                <CheckCircle className="h-10 w-10 text-green-500" />
              ) : (
                <User className="h-10 w-10 text-brand-900" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {step === 'profile' ? 'Cuéntanos sobre ti' :
               step === 'company' ? 'Configura tu empresa' :
               '¡Listo para comenzar!'}
            </h1>
            <p className="text-brand-200/90">
              {step === 'profile' ? 'Solo necesitamos tu nombre para comenzar' :
               step === 'company' ? '¿Tienes un código de invitación o crearemos una nueva empresa?' :
               'Tu cuenta está configurada correctamente'}
            </p>
          </div>

          {/* Onboarding Form */}
          <Card variant="glass" className="shadow-xl">
            <CardContent className="p-8">
              {step === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-brand-200/90 mb-2 block">
                      Nombre Completo
                    </label>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre completo"
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
                    disabled={loading || !fullName}
                  >
                    {loading ? 'Guardando...' : 'Continuar'}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </form>
              )}

              {step === 'company' && (
                <form onSubmit={handleCompanySubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-brand-200/90 mb-2 block">
                        Código de Invitación (opcional)
                      </label>
                      <Input
                        type="text"
                        value={inviteToken}
                        onChange={(e) => setInviteToken(e.target.value)}
                        placeholder="Si tienes un código de invitación"
                        disabled={loading}
                        className="input-glass h-12"
                      />
                    </div>

                    {!inviteToken && (
                      <div>
                        <label className="text-sm font-medium text-brand-200/90 mb-2 block">
                          Nombre de la Empresa
                        </label>
                        <Input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Mi Empresa S.A."
                          required={!inviteToken}
                          disabled={loading}
                          className="input-glass h-12"
                        />
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="text-red-200 text-sm glass-strong p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white"
                      disabled={loading || (!inviteToken && !companyName)}
                    >
                      {loading ? 'Configurando...' : 
                       inviteToken ? 'Unirse a Empresa' : 'Crear Empresa'}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setStep('profile')}
                      variant="ghost"
                      className="w-full h-12 text-brand-300 hover:text-white"
                    >
                      ← Volver
                    </Button>
                  </div>
                </form>
              )}

              {step === 'complete' && (
                <div className="text-center space-y-6">
                  <div className="text-green-400 text-6xl">✓</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      ¡Bienvenido, {fullName}!
                    </h3>
                    <p className="text-brand-300">
                      Tu cuenta está lista. Puedes comenzar a usar el sistema.
                    </p>
                  </div>

                  <Button
                    onClick={handleComplete}
                    className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white"
                  >
                    Ir al Dashboard
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
