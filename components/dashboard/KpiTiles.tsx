import Link from 'next/link'
import { daysBetween, type CostPoint, type DashboardOverview } from '../../lib/dashboard/overview'
import { SERIES } from './shared'
import { useDashboardText } from './i18n'

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

function lastCostPoints(trend: CostPoint[] | null | undefined) {
  const withData = (trend ?? []).filter((p) => p.gross > 0)
  return { last: withData[withData.length - 1], prev: withData[withData.length - 2] }
}

export default function KpiTiles({ data, formatMoney }: { data: DashboardOverview; formatMoney: (n: number) => string }) {
  const { t, date: shortDate, number } = useDashboardText()
  /** Diferencia contra la referencia; `lowerIsBetter` invierte el tono. */
  const countDelta = (current: number, previous: number | undefined, ref: string, lowerIsBetter = false) => {
    if (previous === undefined) return undefined
    const diff = current - previous
    if (diff === 0) return { text: t('kpi.same', { ref }), tone: 'neutral' as Tone }
    const better = lowerIsBetter ? diff < 0 : diff > 0
    return {
      text: t('kpi.delta', { arrow: diff > 0 ? '▲' : '▼', value: number(Math.abs(diff)), ref }),
      tone: (better ? 'good' : 'bad') as Tone,
    }
  }
  const { today, yesterday, rate7d, rate7dPrev, avgLateMinutesToday, series } = data.attendance
  const recent = series.slice(-7)
  // Último día laborable previo: "ayer" o, tras un fin de semana/feriado, su fecha.
  const yesterdayLabel = yesterday
    ? daysBetween(yesterday.date, data.today) === 1 ? t('kpi.yesterday') : t('kpi.onDate', { date: shortDate(yesterday.date) })
    : ''
  const href = '/app/attendance/dashboard'

  const tiles: Tile[] = [
    {
      label: t('kpi.presentToday'),
      value: today ? number(today.present) : '—',
      unit: today ? t('kpi.ofScheduled', { count: number(today.scheduled) }) : t('kpi.noShifts'),
      delta: today ? countDelta(today.present, yesterday?.present, yesterdayLabel) : undefined,
      spark: recent.map((d) => d.present),
      sparkColor: SERIES.onTime,
      href,
    },
    {
      label: t('kpi.absent'),
      value: today ? number(today.absent) : '—',
      unit: today && today.scheduled > 0 ? `${Math.round((today.absent / today.scheduled) * 100)} %` : undefined,
      delta: today ? countDelta(today.absent, yesterday?.absent, yesterdayLabel, true) : undefined,
      spark: recent.map((d) => d.absent),
      sparkColor: SERIES.absent,
      href,
    },
    {
      label: t('kpi.late'),
      value: today ? number(today.late) : '—',
      unit: avgLateMinutesToday !== null ? t('kpi.avgLate', { minutes: avgLateMinutesToday }) : undefined,
      delta: today ? countDelta(today.late, yesterday?.late, yesterdayLabel, true) : undefined,
      spark: recent.map((d) => d.late),
      sparkColor: SERIES.late,
      href,
    },
    {
      label: t('kpi.rate7d'),
      value: rate7d !== null ? number(rate7d, { maximumFractionDigits: 1 }) : '—',
      unit: rate7d !== null ? '%' : undefined,
      delta:
        rate7d !== null && rate7dPrev !== null
          ? (() => {
              const diff = Math.round((rate7d - rate7dPrev) * 10) / 10
              if (diff === 0) return { text: t('kpi.sameWeek'), tone: 'neutral' as Tone }
              return {
                text: t('kpi.deltaWeek', { arrow: diff > 0 ? '▲' : '▼', value: number(Math.abs(diff)) }),
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
      label: t('kpi.payrollCost', { month: shortDate(`${last.period}-01`, { month: 'long' }) }),
      value: formatMoney(last.gross),
      delta:
        pct === null
          ? undefined
          : { text: t('kpi.deltaMonth', { arrow: pct > 0 ? '▲' : pct < 0 ? '▼' : '=', value: number(Math.abs(pct)) }), tone: 'neutral' },
      // Sin sparkline: el monto completo necesita el ancho y la tendencia ya está en PayrollCostChart.
      href: '/app/payroll',
    })
  }

  return (
    <section aria-label={t('kpi.aria')} className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
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
