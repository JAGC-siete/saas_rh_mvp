import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import PublicPageShell from '../../components/landing/PublicPageShell'

export default function AffiliateQuestionnairePage() {
  const router = useRouter()
  const { token } = router.query

  const [formData, setFormData] = useState({
    full_name: '',
    professional_info: '',
    how_did_you_hear: '',
    experience: '',
    expected_referrals: '',
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestStatus, setRequestStatus] = useState<string | null>(null)

  useEffect(() => {
    // Verificar token al cargar
    if (token && typeof token === 'string') {
      checkRequestStatus(token)
    }
  }, [token])

  const checkRequestStatus = async (requestToken: string) => {
    try {
      const res = await fetch(`/api/affiliates/request-status?token=${requestToken}`)
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'pending_approval') {
          setRequestStatus('pending_approval')
        } else if (data.status === 'approved') {
          setRequestStatus('approved')
        } else if (data.status === 'rejected') {
          setRequestStatus('rejected')
        }
      }
    } catch (err) {
      console.error('Error checking request status:', err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!termsAccepted) {
      setError('Debes aceptar los términos y condiciones para continuar.')
      return
    }

    if (!token || typeof token !== 'string') {
      setError('Token inválido.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/affiliates/submit-questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          questionnaireData: formData,
          termsAccepted: true,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/afiliados/confirm?success=true')
      } else {
        setError(data.error || 'Ocurrió un error al enviar tu solicitud.')
      }
    } catch {
      setError('Ocurrió un error de red.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <PublicPageShell centered showFooter={false}>
        <div className="container mx-auto px-4 py-8 w-full max-w-2xl">
          <Card variant="liquid" className="mx-auto">
            <CardContent className="pt-6">
              <p className="text-red-500">Token inválido o faltante.</p>
            </CardContent>
          </Card>
        </div>
      </PublicPageShell>
    )
  }

  if (requestStatus === 'pending_approval') {
    return (
      <PublicPageShell centered showFooter={false}>
        <div className="container mx-auto px-4 py-8 w-full max-w-2xl">
          <Card variant="liquid" className="mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Solicitud Pendiente</p>
                <p className="text-gray-400">
                  Ya has completado el cuestionario. Tu solicitud está pendiente de aprobación.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicPageShell>
    )
  }

  if (requestStatus === 'approved') {
    return (
      <PublicPageShell centered showFooter={false}>
        <div className="container mx-auto px-4 py-8 w-full max-w-2xl">
          <Card variant="liquid" className="mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2 text-green-400">¡Solicitud Aprobada!</p>
                <p className="text-gray-400">
                  Tu solicitud ha sido aprobada. Deberías haber recibido un email con tus credenciales de acceso.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicPageShell>
    )
  }

  if (requestStatus === 'rejected') {
    return (
      <PublicPageShell centered showFooter={false}>
        <div className="container mx-auto px-4 py-8 w-full max-w-2xl">
          <Card variant="liquid" className="mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2 text-red-400">Solicitud Rechazada</p>
                <p className="text-gray-400">
                  Tu solicitud ha sido rechazada. Si tienes preguntas, por favor contáctanos.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicPageShell>
    )
  }

  return (
    <PublicPageShell showFooter={false}>
      <Head>
        <title>Cuestionario de Afiliación - Humano SISU</title>
        <meta name="description" content="Completa el cuestionario para unirte al programa de afiliados." />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <section className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Cuestionario de Afiliación
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Completa el siguiente formulario para completar tu solicitud de afiliación.
          </p>
        </section>

        <Card variant="liquid" className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Información del Afiliado</CardTitle>
            <CardDescription>
              Por favor completa todos los campos. Esta información nos ayudará a evaluar tu solicitud.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="full_name">Nombre Completo *</label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="professional_info">Información Profesional *</label>
                <textarea
                  id="professional_info"
                  name="professional_info"
                  required
                  value={formData.professional_info}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe tu experiencia profesional, industria en la que trabajas, etc."
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="how_did_you_hear">¿Cómo conociste el programa de afiliados? *</label>
                <select
                  id="how_did_you_hear"
                  name="how_did_you_hear"
                  required
                  value={formData.how_did_you_hear}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="website">Sitio web</option>
                  <option value="social_media">Redes sociales</option>
                  <option value="referral">Referido por alguien</option>
                  <option value="email">Email marketing</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="experience">Experiencia en ventas/referencias</label>
                <textarea
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe tu experiencia previa en programas de afiliados, ventas, o referencias (opcional)"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="expected_referrals">Número esperado de referencias por mes</label>
                <Input
                  id="expected_referrals"
                  name="expected_referrals"
                  type="text"
                  value={formData.expected_referrals}
                  onChange={handleChange}
                  placeholder="Ej: 2-5 empresas"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-300">
                    Acepto los{' '}
                    <a href="/afiliados" target="_blank" className="text-blue-400 hover:underline">
                      términos y condiciones
                    </a>{' '}
                    del programa de afiliados de Humano SISU. *
                  </label>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full btn-shiny bg-brand-500 hover:bg-brand-600"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  )
}








