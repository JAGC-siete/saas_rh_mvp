import Head from 'next/head'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import PublicPageShell from '../components/landing/PublicPageShell'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateWebPageSchema, generateBreadcrumbListSchema } from '../lib/seo/schema'

export default function AfiliadosPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/affiliates/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Ocurrió un error al enviar tu solicitud.')
      }
    } catch {
      setError('Ocurrió un error de red.')
    } finally {
      setLoading(false)
    }
  }

  const pageTitle = getPageTitle('affiliates')
  const pageDescription = getPageDescription('affiliates')
  const webPageSchema = generateWebPageSchema({
    url: '/afiliados',
    title: pageTitle,
    description: pageDescription
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Afiliados', url: '/afiliados' },
  ])

  return (
    <PublicPageShell>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/afiliados" />
        <link rel="canonical" href="https://humanosisu.net/afiliados" />
      </Head>
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema]} />

      <div className="container mx-auto px-4 py-8">
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Conviértete en Afiliado de Humano SISU
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            Gana comisiones recurrentes por cada cliente que refieras. Ayúdanos a llevar la mejor solución de RRHH a más empresas en la región.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">Estructura de Comisiones 2026</h2>
              <ul className="list-disc list-inside space-y-2 text-brand-200/90 text-sm sm:text-base">
                <li><strong className="text-white">10% de comisión</strong> por tu primer negocio cerrado.</li>
                <li><strong className="text-white">1% de comisión adicional</strong> por cada nuevo negocio, hasta un tope del <strong className="text-white">20%</strong>.</li>
                <li>El nivel de comisión que alcances se mantendrá fijo durante todo el año 2026.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">Bono de Rendimiento 2026</h2>
              <ul className="list-disc list-inside space-y-2 text-brand-200/90 text-sm sm:text-base">
                <li>Gana un <strong className="text-white">5% de comisiones adicional</strong> durante todo el 2026.</li>
                <li>Condición: cierra 10 negocios antes del <strong className="text-white">1 de febrero de 2026</strong>.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">Reglas del Programa</h2>
              <ul className="list-disc list-inside space-y-2 text-brand-200/90 text-sm sm:text-base">
                <li>La comisión se paga sobre el valor anual de la licencia del cliente referido.</li>
                <li>Un negocio se considera &quot;cerrado&quot; únicamente cuando la empresa ha pagado su licencia anual.</li>
                <li>Los pagos de comisiones se realizan mensualmente.</li>
              </ul>
            </div>
          </div>
          <div>
            <Card variant="liquid" className="sticky top-24">
              <CardHeader>
                <CardTitle>Regístrate Ahora</CardTitle>
                <CardDescription>Completa el formulario para empezar.</CardDescription>
              </CardHeader>
              <CardContent>
                {success ? (
                  <div className="space-y-4">
                    <div className="text-green-400 text-center">
                      <p className="text-lg font-semibold mb-2">¡Solicitud Enviada!</p>
                      <p className="text-sm">
                        Hemos enviado un email a <strong>{email}</strong> con un cuestionario para completar tu solicitud de afiliación.
                      </p>
                      <p className="text-sm mt-4">
                        Por favor revisa tu correo y completa el cuestionario para continuar con el proceso.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="email">Correo Electrónico</label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        required 
                        value={email}
                        onChange={handleChange}
                        placeholder="tu@email.com"
                      />
                      <p className="text-xs text-gray-400">
                        Te enviaremos un cuestionario a este correo para completar tu solicitud.
                      </p>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" disabled={loading} className="w-full btn-shiny bg-brand-500 hover:bg-brand-600">
                      {loading ? 'Enviando...' : 'Solicitar Afiliación'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
