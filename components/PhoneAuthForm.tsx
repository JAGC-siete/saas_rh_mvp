import { useState } from 'react'
import { useRouter } from 'next/router'
import { createClient as createSupabaseBrowserClient } from '../lib/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Phone, MessageSquare, ArrowLeft } from 'lucide-react'

interface PhoneAuthFormProps {
  onBack: () => void
}

export default function PhoneAuthForm({ onBack }: PhoneAuthFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      
      // Format phone number for international format
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+504${phoneNumber.replace(/\D/g, '')}`

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms'
        }
      })

      if (error) {
        setError(error.message || 'Error enviando código SMS')
      } else {
        setStep('otp')
      }
    } catch (err: any) {
      setError(err?.message || 'Error enviando código SMS')
    }

    setLoading(false)
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber.startsWith('+') 
          ? phoneNumber 
          : `+504${phoneNumber.replace(/\D/g, '')}`,
        token: otpCode,
        type: 'sms'
      })

      if (error) {
        setError(error.message || 'Código inválido')
      } else if (data.user) {
        // Redirect to dashboard
        router.push('/app/dashboard')
      }
    } catch (err: any) {
      setError(err?.message || 'Error verificando código')
    }

    setLoading(false)
  }

  const handleResendOTP = async () => {
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber.startsWith('+') 
          ? phoneNumber 
          : `+504${phoneNumber.replace(/\D/g, '')}`,
        options: {
          channel: 'sms'
        }
      })

      if (error) {
        setError(error.message || 'Error reenviando código')
      }
    } catch (err: any) {
      setError(err?.message || 'Error reenviando código')
    }

    setLoading(false)
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader className="text-center pb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Phone className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-gray-800">
            {step === 'phone' ? 'Verificar Teléfono' : 'Código de Verificación'}
          </CardTitle>
        </div>
        <CardDescription>
          {step === 'phone' 
            ? 'Ingresa tu número de teléfono para recibir un código de verificación'
            : 'Ingresa el código de 6 dígitos enviado a tu teléfono'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Número de Teléfono
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+504 9999-9999"
                autoComplete="tel"
                required
                disabled={loading}
                className="h-12"
              />
              <p className="text-xs text-gray-500">
                Incluye el código de país (+504 para Honduras)
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                <MessageSquare className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700" 
                disabled={loading || !phoneNumber}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </div>
                ) : (
                  'Enviar Código SMS'
                )}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                onClick={onBack}
                className="w-full h-12"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Login
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium text-gray-700">
                Código de Verificación
              </label>
              <Input
                id="otp"
                name="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                required
                disabled={loading}
                className="h-12 text-center text-lg tracking-widest"
                maxLength={6}
              />
              <p className="text-xs text-gray-500">
                Código enviado a: {phoneNumber}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                <MessageSquare className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700" 
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Verificando...
                  </div>
                ) : (
                  'Verificar Código'
                )}
              </Button>

              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="flex-1 h-12"
                >
                  Reenviar Código
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('phone')}
                  disabled={loading}
                  className="flex-1 h-12"
                >
                  Cambiar Número
                </Button>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
