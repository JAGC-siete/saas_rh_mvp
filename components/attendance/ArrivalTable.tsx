import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatTimeDisplay } from '../../lib/timezone'
import { getSeverityFromDelta } from '../../lib/hooks/useAttendanceData'
import { UserCircleIcon } from '@heroicons/react/24/outline'

interface ArrivalRow {
  id: string
  name: string
  team?: string
  check_in_time?: string
  delta_min?: number
  late_minutes?: number
}

interface ArrivalTableProps {
  earlyData: ArrivalRow[]
  lateData: ArrivalRow[]
  title: string
  onSelect?: (id: string, name: string) => void
}

type SeverityFilter = 'all' | 'early' | 'on_time' | 'warn' | 'alert' | 'danger'

export default function ArrivalTable({ earlyData, lateData, title, onSelect }: ArrivalTableProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

  // Unificar y procesar datos con severidad
  const unifiedRows = useMemo(() => {
    const mapRow = (r: ArrivalRow) => {
      const delta = r.delta_min ?? r.late_minutes ?? 0
      const severity = getSeverityFromDelta(delta)
      return { 
        ...r, 
        delta,
        severity: severity.label,
        tone: severity.tone,
        color: severity.color,
        bgColor: severity.bgColor
      }
    }
    
    return [...earlyData.map(mapRow), ...lateData.map(mapRow)]
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
  }, [earlyData, lateData])

  // Filtrar por severidad
  const filteredRows = useMemo(() => {
    if (severityFilter === 'all') return unifiedRows
    
    return unifiedRows.filter(row => {
      switch (severityFilter) {
        case 'early': return row.tone === 'info'
        case 'on_time': return row.tone === 'ok'
        case 'warn': return row.tone === 'warn'
        case 'alert': return row.tone === 'alert'
        case 'danger': return row.tone === 'danger'
        default: return true
      }
    })
  }, [unifiedRows, severityFilter])

  const severityFilters = [
    { key: 'all' as SeverityFilter, label: 'Todos', count: unifiedRows.length, icon: '🔍' },
    { key: 'early' as SeverityFilter, label: 'Temprano', count: unifiedRows.filter(r => r.tone === 'info').length, icon: '✅' },
    { key: 'on_time' as SeverityFilter, label: 'A tiempo', count: unifiedRows.filter(r => r.tone === 'ok').length, icon: '🕐' },
    { key: 'warn' as SeverityFilter, label: 'Tarde 5–10', count: unifiedRows.filter(r => r.tone === 'warn').length, icon: '⚠️' },
    { key: 'alert' as SeverityFilter, label: 'Tarde 11–20', count: unifiedRows.filter(r => r.tone === 'alert').length, icon: '🔴' },
    { key: 'danger' as SeverityFilter, label: 'Tarde >20', count: unifiedRows.filter(r => r.tone === 'danger').length, icon: '🚨' },
  ]

  return (
    <Card variant="glass" className="border border-white/10">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <span className="text-xl">⏰</span>
          {title}
        </CardTitle>
        
        {/* Chips de filtro por severidad */}
        {unifiedRows.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {severityFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSeverityFilter(filter.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  severityFilter === filter.key
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                }`}
              >
                <span className="mr-1.5">{filter.icon}</span>
                {filter.label} <span className="ml-1 opacity-75">({filter.count})</span>
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-4">
        {filteredRows.length === 0 ? (
          <div className="text-center py-12">
            <UserCircleIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No hay registros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRows.map((row) => (
              <button
                key={row.id}
                onClick={() => onSelect && onSelect(row.id, row.name)}
                className={`w-full p-3 rounded-lg hover:scale-[1.01] transition-all text-left group border ${
                  row.tone === 'info' ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50' :
                  row.tone === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50' :
                  row.tone === 'warn' ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50' :
                  row.tone === 'alert' ? 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50' :
                  'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${row.bgColor}`}>
                      <span className="text-lg">{row.tone === 'info' ? '✅' : row.tone === 'ok' ? '🕐' : row.tone === 'warn' ? '⚠️' : '🔴'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{row.name}</div>
                      {row.team && (
                        <div className="text-xs text-gray-400 truncate">{row.team}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={`text-sm font-medium ${row.color}`}>
                      {row.delta > 0 ? `+${row.delta}m` : row.delta < 0 ? `${row.delta}m` : '0m'}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatTimeDisplay(row.check_in_time || null)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
