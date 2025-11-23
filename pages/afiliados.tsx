import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export default function AfiliadosPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/affiliates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setSuccess(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Ocurrió un error al registrarse.')
      }
    } catch {
      setError('Ocurrió un error de red.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Head>
        <title>Programa de Afiliados - Humano SISU</title>
        <meta name="description" content="Únete a nuestro programa de afiliados y gana comisiones." />
      </Head>

      <header className="p-4 border-b border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <a className="text-xl font-bold">Humano SISU</a>
          </Link>
          <nav>
            <Link href="/login">
              <a className="text-gray-300 hover:text-white">Iniciar Sesión</a>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Conviértete en Afiliado de Humano SISU
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Gana comisiones recurrentes por cada cliente que refieras. Ayúdanos a llevar la mejor solución de RRHH a más empresas en Honduras.
          </p>
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
                  <div className="text-green-400">
                    ¡Gracias por registrarte! Revisaremos tu solicitud y te contactaremos pronto.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="name">Nombre Completo</label>
                      <Input id="name" name="name" type="text" required onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email">Correo Electrónico</label>
                      <Input id="email" name="email" type="email" required onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="password">Contraseña</label>
                      <Input id="password" name="password" type="password" required onChange={handleChange} />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                      {loading ? 'Enviando...' : 'Unirse al Programa'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="p-4 border-t border-gray-700">
        <div className="container mx-auto text-center text-gray-500">
          &copy; {new Date().getFullYear()} Humano SISU. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}
