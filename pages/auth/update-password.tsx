import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import PublicPageShell from '../../components/landing/PublicPageShell'
import { createCallbackClient } from '../../lib/supabase/client'
import {
  ADMIN_PASSWORD_POLICY_MESSAGE_ES,
  validateAdminPassword
} from '../../lib/auth/password-policy'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'

/**
 * Destino de invite / recovery / reset desde Supabase (Redirect URLs en el dashboard).
 * Usa cliente con detectSessionInUrl para intercambiar tokens del enlace.
 */
export default function AuthUpdatePasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [waitTimedOut, setWaitTimedOut] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!router.isReady) return

    const supabase = createCallbackClient()
    let cancelled = false

    const markReady = () => {
      if (!cancelled) setReady(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) markReady()
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user &&
        (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
      ) {
        markReady()
      }
    })

    const t = window.setTimeout(() => {
      if (!cancelled) setWaitTimedOut(true)
    }, 8000)

    return () => {
      cancelled = true
      window.clearTimeout(t)
      subscription.unsubscribe()
    }
  }, [router.isReady])

  const nextHref =
    typeof router.query.next === 'string' && router.query.next.startsWith('/')
      ? router.query.next
      : '/app/login'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    const pw = validateAdminPassword(password)
    if (!pw.ok) {
      setError(pw.message)
      return
    }
    setSubmitting(true)
    try {
      const supabase = createCallbackClient()
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) {
        setError(updErr.message || 'No se pudo actualizar la contraseña.')
        return
      }
      setDone(true)
      window.setTimeout(() => {
        router.push(nextHref)
      }, 1500)
    } catch {
      setError('Error inesperado. Intente de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Definir contraseña - Humano SISU</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <PublicPageShell centered showFooter={false}>
        <Card variant="liquid" className="w-full max-w-md shadow-xl border-white/10">
            <CardContent className="p-8 space-y-4">
              <h1 className="text-2xl font-semibold text-white text-center">
                {done ? 'Contraseña actualizada' : 'Definir contraseña'}
              </h1>
              {done ? (
                <p className="text-brand-200/90 text-center text-sm">
                  Redirigiendo al inicio de sesión…
                </p>
              ) : !ready && !waitTimedOut ? (
                <p className="text-brand-200/90 text-center text-sm">
                  Verificando enlace…
                </p>
              ) : !ready && waitTimedOut ? (
                <div className="space-y-3 text-center text-sm text-brand-200/90">
                  <p>No se pudo validar el enlace. Puede haber expirado.</p>
                  <Button type="button" variant="outline" onClick={() => router.push('/app/forgot-password')}>
                    Solicitar nuevo enlace
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <p className="text-sm text-brand-200/80">
                    Elegí una contraseña segura para tu cuenta.
                  </p>
                  <div>
                    <label className="text-sm text-brand-200/90 mb-1 block">Nueva contraseña</label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-glass h-11"
                      minLength={8}
                      required
                      disabled={submitting}
                    />
                    <p className="text-xs text-brand-200/60 mt-1">{ADMIN_PASSWORD_POLICY_MESSAGE_ES}</p>
                  </div>
                  <div>
                    <label className="text-sm text-brand-200/90 mb-1 block">Confirmar</label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="input-glass h-11"
                      minLength={8}
                      required
                      disabled={submitting}
                    />
                  </div>
                  {error ? (
                    <div className="text-red-200 text-sm glass-modern p-3 rounded-md">{error}</div>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-full h-11 bg-brand-900 hover:bg-brand-800 text-white"
                    disabled={submitting}
                  >
                    {submitting ? 'Guardando…' : 'Guardar contraseña'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
      </PublicPageShell>
    </>
  )
}
