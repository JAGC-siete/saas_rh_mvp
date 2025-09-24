import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface KpiCardsProps {
  presentes: number
  ausentes: number
  temprano: number
  tarde: number
  presetLabel?: string
  asistenciaPct?: number
  puntualidadPct?: number
  total?: number
  loading?: boolean
}

export default function KpiCards({ 
  presentes, 
  ausentes, 
  temprano, 
  tarde, 
  presetLabel = '', 
  asistenciaPct = 0, 
  puntualidadPct = 0, 
  total = 0,
  loading = false 
}: KpiCardsProps) {
  const items = [
    { 
      label: `Presentes${presetLabel}`, 
      value: presentes, 
      color: 'text-emerald-400',
      subtitle: total > 0 ? `${asistenciaPct}% asistencia` : undefined
    },
    { 
      label: `Ausentes${presetLabel}`, 
      value: ausentes, 
      color: 'text-red-400',
      subtitle: total > 0 ? `${(100 - asistenciaPct).toFixed(1)}% ausencia` : undefined
    },
    { 
      label: `Temprano${presetLabel}`, 
      value: temprano, 
      color: 'text-blue-400',
      subtitle: total > 0 ? `${puntualidadPct}% puntualidad` : undefined
    },
    { 
      label: `Tarde${presetLabel}`, 
      value: tarde, 
      color: 'text-yellow-400',
      subtitle: total > 0 ? `${(asistenciaPct - puntualidadPct).toFixed(1)}% tardanzas` : undefined
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="glass" className="text-center">
            <CardHeader className="pb-1">
              <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((k) => (
        <Card key={k.label} variant="glass" className="text-center">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-gray-300 font-medium">{k.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
            {k.subtitle && (
              <div className="text-xs text-gray-400 mt-1">{k.subtitle}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
