import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '../ui/card'

interface KpiCardsProps {
  presentes: number
  ausentes: number
  temprano: number
  tarde: number
  presetLabel?: string
  asistenciaPct?: number
  puntualidadSobreLlegadasPct?: number
  tempranosSobreLlegadasPct?: number
  tardesSobreLlegadasPct?: number
  total?: number
  llegadas?: number
  loading?: boolean
}

export default function KpiCards({
  presentes,
  ausentes,
  temprano,
  tarde,
  presetLabel = '',
  asistenciaPct = 0,
  puntualidadSobreLlegadasPct = 0,
  tempranosSobreLlegadasPct = 0,
  tardesSobreLlegadasPct = 0,
  total = 0,
  llegadas = 0,
  loading = false,
}: KpiCardsProps) {
  const items = [
    {
      label: 'Presentes',
      value: presentes,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      Icon: CheckCircleIcon,
      subtitle:
        total > 0
          ? `${asistenciaPct.toFixed(1)}% asistencia (sobre presentes + tardes + ausentes)`
          : undefined,
      subtitle2:
        llegadas > 0
          ? `${puntualidadSobreLlegadasPct.toFixed(1)}% llegaron en horario (vs tarde, sobre quienes llegaron)`
          : undefined,
      percentage: total > 0 ? Math.round((presentes / total) * 100) : 0,
    },
    {
      label: 'Ausentes',
      value: ausentes,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      Icon: XCircleIcon,
      subtitle:
        total > 0 ? `${(100 - asistenciaPct).toFixed(1)}% ausencia (mismo denominador)` : undefined,
      subtitle2: undefined,
      percentage: total > 0 ? Math.round((ausentes / total) * 100) : 0,
    },
    {
      label: 'Temprano',
      value: temprano,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      Icon: ClockIcon,
      subtitle:
        llegadas > 0
          ? `${tempranosSobreLlegadasPct.toFixed(1)}% de quienes llegaron`
          : undefined,
      subtitle2: undefined,
      percentage: total > 0 ? Math.round((temprano / total) * 100) : 0,
    },
    {
      label: 'Tarde',
      value: tarde,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      Icon: ExclamationTriangleIcon,
      subtitle:
        llegadas > 0
          ? `${tardesSobreLlegadasPct.toFixed(1)}% de quienes llegaron`
          : undefined,
      subtitle2: undefined,
      percentage: total > 0 ? Math.round((tarde / total) * 100) : 0,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="liquid" className="border border-white/10">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-700 rounded animate-pulse mb-3" />
              <div className="h-10 bg-gray-700 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((k) => (
          <Card
            key={k.label}
            variant="liquid"
            className={`border ${k.borderColor} hover:scale-[1.02] transition-transform`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <k.Icon className="h-8 w-8 text-gray-300" aria-hidden />
                <span className="text-xs text-gray-400 font-medium tabular-nums">{k.percentage}%</span>
              </div>

              <div className={`text-4xl font-bold mb-2 ${k.color} tabular-nums`}>{k.value}</div>

              <div className="text-sm text-gray-300 font-medium mb-1">
                {k.label}
                {presetLabel}
              </div>

              {k.subtitle && <div className="text-xs text-gray-400 mt-1 leading-snug">{k.subtitle}</div>}
              {k.subtitle2 && (
                <div className="text-xs text-gray-500 mt-1 leading-snug">{k.subtitle2}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {total > 0 && (
        <p className="text-xs text-gray-500 px-1">
          Denominador común del porcentaje grande en cada tarjeta: presentes + tardes + ausentes (
          {total}) para el período y filtros actuales.
        </p>
      )}
    </div>
  )
}
