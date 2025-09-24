import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatTimeDisplay } from '../../lib/timezone'
import { getSeverityFromDelta } from '../../lib/hooks/useAttendanceData'

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
    { key: 'all' as SeverityFilter, label: 'Todos', count: unifiedRows.length },
    { key: 'early' as SeverityFilter, label: 'Temprano', count: unifiedRows.filter(r => r.tone === 'info').length },
    { key: 'on_time' as SeverityFilter, label: 'A tiempo', count: unifiedRows.filter(r => r.tone === 'ok').length },
    { key: 'warn' as SeverityFilter, label: 'Tarde 5–10', count: unifiedRows.filter(r => r.tone === 'warn').length },
    { key: 'alert' as SeverityFilter, label: 'Tarde 11–20', count: unifiedRows.filter(r => r.tone === 'alert').length },
    { key: 'danger' as SeverityFilter, label: 'Tarde >20', count: unifiedRows.filter(r => r.tone === 'danger').length },
  ]

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base">{title}</CardTitle>
        
        {/* Chips de filtro por severidad */}
        <div className="flex flex-wrap gap-1 mt-2">
          {severityFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSeverityFilter(filter.key)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                severityFilter === filter.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-300">
            <tr>
              <th className="py-1">Empleado</th>
              <th className="py-1">Equipo</th>
              <th className="py-1">Entrada</th>
              <th className="py-1">Estado</th>
              <th className="py-1">Δ min</th>
            </tr>
          </thead>
          <tbody className="text-gray-100">
            {filteredRows.map((row) => (
              <tr 
                key={row.id} 
                className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer" 
                onClick={() => onSelect && onSelect(row.id, row.name)}
              >
                <td className="py-1">{row.name}</td>
                <td className="py-1">{row.team || '-'}</td>
                <td className="py-1">{formatTimeDisplay(row.check_in_time || null)}</td>
                <td className="py-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${row.bgColor} ${row.color}`}>
                    {row.severity}
                  </span>
                </td>
                <td className={`py-1 font-mono ${row.color}`}>
                  {row.delta > 0 ? '+' : ''}{row.delta}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-400">
                  Sin datos para este filtro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
