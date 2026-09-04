import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { ArrowLeft, MapPinned } from 'lucide-react'
import FieldAttendanceManager from '../../components/FieldAttendanceManager'
import PublicPageShell from '../../components/landing/PublicPageShell'

export default function FieldAttendancePage() {
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const tegucigalpaTime = new Date(
        now.toLocaleString('en-US', { timeZone: 'America/Tegucigalpa' })
      )
      setCurrentTime(
        tegucigalpaTime.toLocaleTimeString('es-HN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <Head>
        <title>Asistencia de campo | Humano SISU</title>
        <meta
          name="description"
          content="Check-in y check-out móvil con biometría del dispositivo y georreferencia para personal de campo"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0c4a6e" />
      </Head>

      <PublicPageShell centered showFooter={false} loginAlwaysVisible>
        <div className="w-full max-w-lg space-y-6 p-4 pb-10">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-2xl bg-gradient-to-br from-brand-800 to-brand-500">
              <MapPinned className="h-10 w-10 text-white" strokeWidth={2.5} />
            </div>

            <p className="text-brand-200 text-sm font-semibold tracking-wide uppercase mb-2">
              Humano SISU
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Asistencia de campo
            </h1>
            <p className="text-white/70 text-base mt-3 font-medium max-w-sm mx-auto">
              Marca entrada o salida con DNI, biometría del celular y ubicación.
            </p>

            <div className="mt-5 text-4xl sm:text-5xl font-mono font-bold text-white drop-shadow-clock-glow tracking-tight tabular-nums">
              {currentTime}
            </div>
          </div>

          <div className="glass-modern rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <FieldAttendanceManager />

            <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
              <Link
                href="/attendance/register"
                className="text-white/70 hover:text-white transition-colors font-medium"
              >
                ¿Estás en oficina? Usar kiosk DNI
              </Link>
              <span className="hidden sm:inline text-white/20">·</span>
              <Link
                href="/app/login"
                className="inline-flex items-center gap-2 text-white hover:text-brand-200 transition-colors font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Acceso admin
              </Link>
            </div>
          </div>

          <p className="text-center text-white/45 text-xs">© 2026 Humano SISU</p>
        </div>
      </PublicPageShell>
    </>
  )
}
