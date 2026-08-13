import { ArrowPathIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts'
import { parseDateOnlyAsHonduras, HONDURAS_TIMEZONE } from '../../lib/timezone'

export interface TrendData {
  date: string
  present: number
  absent: number
  late: number
  checkInTimes: Array<{ time: string; employee: string }>
}

interface TrendsChartProps {
  trends: TrendData[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number; dataKey?: string; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const attendance = payload.find((p) => p.dataKey === 'attendanceRate')
  const punctuality = payload.find((p) => p.dataKey === 'punctualityRate')

  return (
    <div className="rounded-xl border border-white/15 bg-slate-900/80 backdrop-blur-xl px-4 py-3 shadow-glass text-sm">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      {attendance != null && (
        <p className="text-emerald-300 font-medium tabular-nums">
          Asistencia: {Number(attendance.value).toFixed(1)}%
        </p>
      )}
      {punctuality != null && (
        <p className="text-brand-300 font-medium tabular-nums mt-0.5">
          Puntualidad: {Number(punctuality.value).toFixed(1)}%
        </p>
      )}
    </div>
  )
}

export default function TrendsChart({
  trends,
  loading = false,
  error = null,
  onRetry,
}: TrendsChartProps) {
  const chartData = trends.map((t) => {
    const dayTotal = t.present + t.late + t.absent
    return {
      date: parseDateOnlyAsHonduras(t.date).toLocaleDateString('es-HN', {
        timeZone: HONDURAS_TIMEZONE,
        month: 'short',
        day: 'numeric',
      }),
      attendanceRate: dayTotal ? ((t.present + t.late) / dayTotal) * 100 : 0,
      punctualityRate: dayTotal ? (t.present / dayTotal) * 100 : 0,
    }
  })

  if (loading) {
    return (
      <div className="h-[260px] rounded-xl animate-pulse flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando tendencias...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[260px] rounded-xl border border-red-500/20 flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-red-200 text-center">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-sm text-white hover:bg-white/15 border border-white/20"
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden />
            Reintentar
          </button>
        )}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center">
        <div className="text-center px-4">
          <ArrowTrendingUpIcon className="h-10 w-10 mx-auto text-gray-600 mb-3" aria-hidden />
          <div className="text-gray-400 text-sm font-medium">Sin datos de tendencias</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="attendanceGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="punctualityGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="attendanceRate"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#attendanceGlow)"
            dot={false}
            activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="punctualityRate"
            stroke="#60A5FA"
            strokeWidth={2}
            fill="url(#punctualityGlow)"
            dot={false}
            activeDot={{ r: 4, fill: '#60A5FA', stroke: '#fff', strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          Asistencia
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-brand-400 rounded-full shadow-[0_0_6px_rgba(96,165,250,0.5)]" />
          Puntualidad
        </span>
      </div>
    </div>
  )
}
