import Link from 'next/link'
import { daysBetween, type CostPoint, type DashboardOverview } from '../../lib/dashboard/overview'
import { SERIES, shortDate } from './shared'

type Tone = 'good' | 'bad' | 'neutral'

interface Tile {
  label: string
  value: string
  unit?: string
  delta?: { text: string; tone: Tone }
  spark?: number[]
  sparkColor?: string
  href: string
}

const TONE_CLASS: Record<Tone, string> = {
  good: 'text-teal-300',
  bad: 'text-orange-300',
  neutral: 'text-slate-400',
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((v, i) => `${((i * 94) / (values.length - 1) + 1).toFixed(1)},${(30 - ((v - min) / span) * 26).toFixed(1)}`)
    .join(' ')
  return (
    // Tamaño por clase: hay una regla global que fuerza los <svg> sin clase a 24×24.
    <svg width="96" height="32" viewBox="0 0 96 32" aria-hidden className="h-8 w-24 shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Diferencia contra la referencia; `lowerIsBetter` invierte el tono. */
function countDelta(current: number, previous: number | undefined, suffix: string, lowerIsBetter = false) {
  if (previous === undefined) return undefined
  const diff = current - previous
  if (diff === 0) return { text: `= igual que ${suffix}`, tone: 'neutral' as Tone }
  const better = lowerIsBetter ? diff < 0 : diff > 0
  return {
    text: `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toLocaleString('es-HN')} vs. ${suffix}`,
    tone: (better ? 'good' : 'bad') as Tone,
  }
}

function lastCostPoints(trend: CostPoint[] | null | undefined) {
  const withData = (trend ?? []).filter((p) => p.gross > 0)
  return { last: withData[withData.length - 1], prev: withData[withData.length - 2] }
}

export default function KpiTiles({ data, formatMoney }: { data: DashboardOverview; formatMoney: (n: number) => string }) {
  const { today, yesterday, rate7d, rate7dPrev, avgLateMinutesToday, series } = data.attendance
  const recent = series.slice(-7)
  // Último día laborable previo: "ayer" o, tras un fin de semana/feriado, su fecha.
  const yesterdayLabel = yesterday
    ? daysBetween(yesterday.date, data.today) === 1 ? 'ayer' : `el ${shortDate(yesterday.date)}`
    : ''
  const href = '/app/attendance/dashboard'

  const tiles: Tile[] = [
    {
      label: 'Presentes hoy',
      value: today ? today.present.toLocaleString('es-HN') : '—',
      unit: today ? `de ${today.scheduled.toLocaleString('es-HN')}` : 'Sin turnos hoy',
      delta: today ? countDelta(today.present, yesterday?.present, yesterdayLabel) : undefined,
      spark: recent.map((d) => d.present),
      sparkColor: SERIES.onTime,
      href,
    },
    {
      label: 'Ausentes',
      value: today ? today.absent.toLocaleString('es-HN') : '—',
      unit: today && today.scheduled > 0 ? `${Math.round((today.absent / today.scheduled) * 100)} %` : undefined,
      delta: today ? countDelta(today.absent, yesterday?.absent, yesterdayLabel, true) : undefined,
      spark: recent.map((d) => d.absent),
      sparkColor: SERIES.absent,
      href,
    },
    {
      label: 'Tardanzas',
      value: today ? today.late.toLocaleString('es-HN') : '—',
      unit: avgLateMinutesToday !== null ? `prom. ${avgLateMinutesToday} min` : undefined,
      delta: today ? countDelta(today.late, yesterday?.late, yesterdayLabel, true) : undefined,
      spark: recent.map((d) => d.late),
      sparkColor: SERIES.late,
      href,
    },
    {
      label: 'Asistencia 7 días',
      value: rate7d !== null ? rate7d.toLocaleString('es-HN', { maximumFractionDigits: 1 }) : '—',
      unit: rate7d !== null ? '%' : undefined,
      delta:
        rate7d !== null && rate7dPrev !== null
          ? (() => {
              const diff = Math.round((rate7d - rate7dPrev) * 10) / 10
              if (diff === 0) return { text: '= igual que la semana anterior', tone: 'neutral' as Tone }
              return {
                text: `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toLocaleString('es-HN')} pts vs. semana anterior`,
                tone: (diff > 0 ? 'good' : 'bad') as Tone,
              }
            })()
          : undefined,
      spark: recent.map((d) => (d.present + d.absent > 0 ? d.present / (d.present + d.absent) : 0)),
      sparkColor: SERIES.onTime,
      href,
    },
  ]

  const { last, prev } = lastCostPoints(data.payroll?.costTrend)
  if (last) {
    const pct = prev ? Math.round(((last.gross - prev.gross) / prev.gross) * 1000) / 10 : null
    tiles.push({
      label: `Costo de nómina · ${shortDate(`${last.period}-01`, { month: 'long' })}`,
      value: formatMoney(last.gross),
      delta:
        pct === null
          ? undefined
          : { text: `${pct > 0 ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct).toLocaleString('es-HN')} % vs. mes anterior`, tone: 'neutral' },
      // Sin sparkline: el monto completo necesita el ancho y la tendencia ya está en PayrollCostChart.
      href: '/app/payroll',
    })
  }

  return (
    <section aria-label="Indicadores de hoy" className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-slate-900/70 p-[18px] text-white hover:border-white/25 transition-colors"
        >
          <span className="text-[13px] font-medium text-slate-400">{t.label}</span>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[28px] font-bold leading-tight tabular-nums truncate">{t.value}</span>
              {t.unit && <span className="text-[13px] text-slate-400 whitespace-nowrap">{t.unit}</span>}
            </div>
            {t.spark && t.sparkColor && <Sparkline values={t.spark} color={t.sparkColor} />}
          </div>
          {t.delta ? (
            <span className={`text-xs font-semibold ${TONE_CLASS[t.delta.tone]}`}>{t.delta.text}</span>
          ) : (
            <span className="text-xs text-slate-500">&nbsp;</span>
          )}
        </Link>
      ))}
    </section>
  )
}
