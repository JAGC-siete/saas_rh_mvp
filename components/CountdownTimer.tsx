import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { trackCTAClick } from '../lib/analytics/googleAds'
import { nowInHonduras } from '../lib/timezone'

/** CTA hacia cotización formal en /ventas (reemplazo del countdown + email trial). */
export default function CountdownTimer() {
  const getNextPayrollClose = () => {
    const now = nowInHonduras()
    const y = now.getFullYear()
    const m = now.getMonth()
    const day = now.getDate()

    const fifteenth = new Date(y, m, 15, 23, 59, 59)
    const lastOfMonth = new Date(y, m + 1, 0, 23, 59, 59)

    return day <= 15 ? fifteenth : lastOfMonth
  }

  const target = useMemo(() => getNextPayrollClose(), [])
  const [nowMs, setNowMs] = useState(() => nowInHonduras().getTime())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(nowInHonduras().getTime()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const remainingMs = Math.max(0, target.getTime() - nowMs)
  const remaining = useMemo(() => {
    const totalSeconds = Math.floor(remainingMs / 1000)
    const days = Math.floor(totalSeconds / (24 * 60 * 60))
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
    const seconds = totalSeconds % 60
    const pad2 = (n: number) => String(n).padStart(2, '0')
    return { days, hours: pad2(hours), minutes: pad2(minutes), seconds: pad2(seconds) }
  }, [remainingMs])

  return (
    <div className="text-center mb-12">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8 backdrop-blur-sm shadow-xl max-w-4xl mx-auto">
        <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
          Tu propuesta a la medida en segundos
        </h3>
        <p className="text-sm sm:text-base text-brand-200/90 mb-5 max-w-2xl mx-auto leading-relaxed">
          El sistema calcula la inversión exacta según el tamaño de tu plantilla y tu país. Recibe de inmediato un PDF detallado, listo para tu revisión gerencial.
        </p>

        <div className="mb-6">
          <p className="text-xs sm:text-sm text-brand-200/70">
            Próximo cierre de planilla (referencia):{' '}
            <span className="text-brand-100 font-medium">{target.toLocaleDateString()}</span>
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-4 py-2">
            <span className="text-xs sm:text-sm text-brand-200/80">Faltan</span>
            <span className="text-white font-semibold tabular-nums">
              {remaining.days}d {remaining.hours}h {remaining.minutes}m {remaining.seconds}s
            </span>
          </div>
        </div>

        <Link
          href="/ventas"
          onClick={() => trackCTAClick('solicitar_cotizacion', 'services_section_cta')}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
          data-analytics="cta_ventas_click"
        >
          Recibir propuesta en PDF
          <ArrowRightIcon className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
