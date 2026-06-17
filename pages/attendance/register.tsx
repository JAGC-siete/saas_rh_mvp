import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { User, ArrowLeft, Shield } from 'lucide-react'
import AttendanceManager from '../../components/AttendanceManager'
import PublicPageShell from '../../components/landing/PublicPageShell'

export default function AttendanceRegisterPage() {
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const tegucigalpaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Tegucigalpa' }))
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
        <title>Registro de Asistencia | Humano SISU</title>
        <meta
          name="description"
          content="Plataforma de entrada y salida para empresas en El Salvador, Guatemala y Honduras"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <PublicPageShell centered showFooter={false} loginAlwaysVisible>
        <div className="w-full max-w-2xl space-y-8 p-4">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-2xl bg-gradient-to-br from-brand-800 to-brand-500">
              <Shield className="h-12 w-12 text-white" strokeWidth={2.5} />
            </div>

            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Humano SISU</h1>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Registro de asistencia</h2>

            <p className="text-brand-100 text-lg font-medium mb-4">Registro Inteligente de Asistencia</p>

            <div className="mt-6 text-3xl font-mono font-bold text-white drop-shadow-md">{currentTime}</div>

            <p className="text-sm text-white/60 mt-4 font-medium">
              Deducciones y normativa local (SV, GT, HN) — Soporte regional
            </p>
          </div>

          <div className="glass-modern rounded-3xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                <User className="h-7 w-7" strokeWidth={2.5} />
                Marcar Asistencia
              </h3>
              <p className="text-white/70 text-base font-medium">
                Ingrese su DNI completo o últimos 5 dígitos
              </p>
            </div>

            <AttendanceManager />

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-white/70 text-sm mb-4 text-center">¿Eres administrador?</p>
              <Link
                href="/app/login"
                className="inline-flex items-center gap-2 text-white hover:text-brand-200 transition-colors text-sm font-semibold mx-auto block w-fit px-4 py-2 rounded-lg hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Acceso Administrativo
              </Link>
            </div>
          </div>

          <div className="text-center">
            <p className="text-white/60 text-xs font-medium">© 2026 Humano SISU</p>
            <p className="text-white/50 text-xs mt-1">Desarrollado por Humano SISU</p>
          </div>
        </div>
      </PublicPageShell>
    </>
  )
}
