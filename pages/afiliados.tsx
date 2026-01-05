import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import MainHeader from '../components/MainHeader'

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

  return (
    <div className="min-h-screen bg-app text-white flex flex-col pt-24 relative">
      <Head>
        <title>Programa de Afiliados - Humano SISU</title>
        <meta name="description" content="Únete a nuestro programa de afiliados y gana comisiones." />
      </Head>

      {/* Header */}
      <MainHeader enableScrollEffect={false} fixed={true} />

      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Conviértete en Afiliado de Humano SISU
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            Gana comisiones recurrentes por cada cliente que refieras. Ayúdanos a llevar la mejor solución de RRHH a más empresas en Honduras.
          </p>
          <Link href="/suscripcion">
            <Button className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-base font-medium transition-all duration-300">
              Suscríbete
            </Button>
          </Link>
        </section>

        <section className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-4">Estructura de Comisiones 2026</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li><strong className="text-white">10% de comisión</strong> por tu primer negocio cerrado.</li>
                <li><strong className="text-white">1% de comisión adicional</strong> por cada nuevo negocio, hasta un tope del <strong className="text-white">20%</strong>.</li>
                <li>El nivel de comisión que alcances se mantendrá fijo durante todo el año 2026.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Bono de Rendimiento 2026</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Gana un <strong className="text-white">5% de comisiones adicional</strong> durante todo el 2026.</li>
                <li>Condición: cierra 10 negocios antes del <strong className="text-white">1 de febrero de 2026</strong>.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Reglas del Programa</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>La comisión se paga sobre el valor anual de la licencia del cliente referido.</li>
                <li>Un negocio se considera &quot;cerrado&quot; únicamente cuando la empresa ha pagado su licencia anual.</li>
                <li>Los pagos de comisiones se realizan mensualmente.</li>
              </ul>
            </div>
          </div>
          <div>
            <Card className="glass-strong sticky top-24">
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
                    <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                      {loading ? 'Enviando...' : 'Solicitar Afiliación'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-slate-400 mb-4">
              &copy; {new Date().getFullYear()} Humano SISU. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
