import { ArrowPathIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
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
      present: t.present,
      late: t.late,
      absent: t.absent,
      total: dayTotal,
    }
  })

  if (loading) {
    return (
      <div className="h-[260px] bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 backdrop-blur-sm animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Cargando tendencias...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[260px] bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-red-500/20 flex flex-col items-center justify-center gap-3 px-4">
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
      <div className="h-[260px] bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center px-4">
          <ArrowTrendingUpIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" aria-hidden />
          <div className="text-gray-400 mb-2 font-medium">Sin datos de tendencias</div>
          <div className="text-sm text-gray-500">Selecciona un rango de fechas con datos</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[260px] w-full bg-gradient-to-br from-white/5 to-white/0 rounded-xl p-4">
      <ResponsiveContainer width="100%" height={260} minHeight={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              const numValue = typeof value === 'number' ? value : Number(value) || 0
              const key = String(name)
              return [
                `${numValue.toFixed(1)}%`,
                key === 'attendanceRate' ? 'Asistencia' : 'Puntualidad',
              ]
            }}
            labelFormatter={(label) => `Fecha: ${label}`}
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB',
            }}
          />
          <Legend wrapperStyle={{ color: '#F9FAFB', fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey="attendanceRate"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            name="Asistencia"
          />
          <Line
            type="monotone"
            dataKey="punctualityRate"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            name="Puntualidad"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
