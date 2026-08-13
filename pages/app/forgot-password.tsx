import { useState, FormEvent } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../../components/landing/PublicPageShell'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresá un correo válido.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next: '/app/login' })
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setError(data?.message || 'Demasiados intentos. Probá más tarde.')
        return
      }
      if (!res.ok && res.status !== 200) {
        setError(data?.error || 'No se pudo procesar la solicitud.')
        return
      }
      setMessage(
        data?.message ||
          'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.'
      )
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Recuperar contraseña - Humano SISU</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <PublicPageShell centered showFooter={false}>
        <div className="relative w-full max-w-md p-4">
          <Card variant="liquid" className="shadow-xl border-white/10">
              <CardContent className="p-8 space-y-4">
                <h1 className="text-2xl font-semibold text-white text-center">Recuperar contraseña</h1>
                <p className="text-sm text-brand-200/80 text-center">
                  Te enviaremos un enlace si hay una cuenta asociada a ese correo.
                </p>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-brand-200/90 mb-1 block">Correo</label>
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
                  {error ? (
                    <div className="text-red-200 text-sm glass-modern p-3 rounded-xl border border-red-500/30">{error}</div>
                  ) : null}
                  {message ? (
                    <div className="text-emerald-200/90 text-sm glass-modern p-3 rounded-xl border border-emerald-500/30">{message}</div>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-full h-12 bg-brand-900 hover:bg-brand-800 text-white"
                    disabled={loading || !email}
                  >
                    {loading ? 'Enviando…' : 'Enviar enlace'}
                  </Button>
                  <div className="text-center">
                    <Link href="/app/login" className="text-sm text-brand-300 hover:text-white">
                      Volver al inicio de sesión
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
        </div>
      </PublicPageShell>
    </>
  )
}
