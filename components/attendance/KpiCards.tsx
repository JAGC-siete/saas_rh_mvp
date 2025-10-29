import { Card, CardContent } from '../ui/card'

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
      label: 'Presentes', 
      value: presentes, 
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      icon: '✅',
      subtitle: total > 0 ? `${asistenciaPct.toFixed(1)}% asistencia` : undefined,
      percentage: total > 0 ? Math.round((presentes / total) * 100) : 0
    },
    { 
      label: 'Ausentes', 
      value: ausentes, 
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: '❌',
      subtitle: total > 0 ? `${(100 - asistenciaPct).toFixed(1)}% ausencia` : undefined,
      percentage: total > 0 ? Math.round((ausentes / total) * 100) : 0
    },
    { 
      label: 'Temprano', 
      value: temprano, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      icon: '⏰',
      subtitle: total > 0 ? `${puntualidadPct.toFixed(1)}% puntualidad` : undefined,
      percentage: total > 0 ? Math.round((temprano / total) * 100) : 0
    },
    { 
      label: 'Tarde', 
      value: tarde, 
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: '⚠️',
      subtitle: total > 0 ? `${((tarde / total) * 100).toFixed(1)}% tardanzas` : undefined,
      percentage: total > 0 ? Math.round((tarde / total) * 100) : 0
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="glass" className="border border-white/10">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-700 rounded animate-pulse mb-3"></div>
              <div className="h-10 bg-gray-700 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((k) => (
        <Card 
          key={k.label} 
          variant="glass" 
          className={`border ${k.borderColor} hover:scale-105 transition-transform cursor-pointer`}
        >
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{k.icon}</span>
              <span className="text-xs text-gray-400 font-medium">{k.percentage}%</span>
            </div>
            
            {/* Value */}
            <div className={`text-4xl font-bold mb-2 ${k.color}`}>
              {k.value}
            </div>
            
            {/* Label */}
            <div className="text-sm text-gray-300 font-medium mb-1">
              {k.label}{presetLabel}
            </div>
            
            {/* Subtitle */}
            {k.subtitle && (
              <div className="text-xs text-gray-400 mt-1">
                {k.subtitle}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
