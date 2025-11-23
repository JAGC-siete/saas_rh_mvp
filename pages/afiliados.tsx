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

        <section className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">¿Cómo funciona?</h2>
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-start">
                <span className="bg-blue-500 rounded-full h-6 w-6 text-center mr-4 mt-1">1</span>
                <span>Regístrate en el formulario para obtener tu enlace de referido único.</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 rounded-full h-6 w-6 text-center mr-4 mt-1">2</span>
                <span>Comparte tu enlace con empresas que necesiten automatizar sus RRHH.</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 rounded-full h-6 w-6 text-center mr-4 mt-1">3</span>
                <span>Cuando una empresa se suscribe a través de tu enlace, ganas una comisión.</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 rounded-full h-6 w-6 text-center mr-4 mt-1">4</span>
                <span>Recibe pagos mensuales por todas tus referencias activas.</span>
              </li>
            </ul>
          </div>
          <div>
            <Card className="bg-gray-800 border-gray-700">
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
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo</label>
                      <Input id="name" name="name" type="text" required onChange={handleChange} className="bg-gray-700 border-gray-600" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
                      <Input id="email" name="email" type="email" required onChange={handleChange} className="bg-gray-700 border-gray-600" />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                      <Input id="password" name="password" type="password" required onChange={handleChange} className="bg-gray-700 border-gray-600" />
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
