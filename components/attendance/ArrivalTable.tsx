import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatTimeDisplay } from '../../lib/timezone'
import { getSeverityFromDelta } from '../../lib/hooks/useAttendanceData'
import {
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { AttendanceRecordFlagsBadges, type AttendanceListFlags } from './AttendanceRecordFlagsBadges'

interface ArrivalRow {
  id: string
  name: string
  team?: string
  check_in_time?: string
  check_in?: string
  check_out?: string
  lunch_start?: string | null
  lunch_end?: string | null
  date?: string
  delta_min?: number
  late_minutes?: number
  flags?: AttendanceListFlags
}

interface ArrivalTableProps {
  earlyData: ArrivalRow[]
  lateData: ArrivalRow[]
  title: string
  onSelect?: (id: string, name: string) => void
  pageSize?: number
}

type SeverityFilter = 'all' | 'early' | 'on_time' | 'warn' | 'alert' | 'danger'

function timeOrDash(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  return formatTimeDisplay(value)
}

export default function ArrivalTable({ earlyData, lateData, title, onSelect, pageSize = 10 }: ArrivalTableProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])
  const canPrev = page > 1
  const canNext = page < totalPages
  const goPrev = () => setPage((p) => (p > 1 ? p - 1 : p))
  const goNext = () => setPage((p) => (p < totalPages ? p + 1 : p))

  const severityFilters: {
    key: SeverityFilter
    label: string
    count: number
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  }[] = [
    { key: 'all', label: 'Todos', count: unifiedRows.length, Icon: FunnelIcon },
    {
      key: 'early',
      label: 'Temprano',
      count: unifiedRows.filter((r) => r.tone === 'info').length,
      Icon: ClockIcon,
    },
    {
      key: 'on_time',
      label: 'A tiempo',
      count: unifiedRows.filter((r) => r.tone === 'ok').length,
      Icon: CheckCircleIcon,
    },
    {
      key: 'warn',
      label: 'Tarde 5–10',
      count: unifiedRows.filter((r) => r.tone === 'warn').length,
      Icon: ExclamationTriangleIcon,
    },
    {
      key: 'alert',
      label: 'Tarde 11–20',
      count: unifiedRows.filter((r) => r.tone === 'alert').length,
      Icon: ExclamationCircleIcon,
    },
    {
      key: 'danger',
      label: 'Tarde >20',
      count: unifiedRows.filter((r) => r.tone === 'danger').length,
      Icon: XCircleIcon,
    },
  ]

  return (
    <Card variant="glass" className="border border-white/10">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <ClockIcon className="h-6 w-6 text-gray-300 shrink-0" aria-hidden />
          {title}
        </CardTitle>
        
        {/* Chips de filtro por severidad */}
        {unifiedRows.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {severityFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setSeverityFilter(filter.key)}
                aria-pressed={severityFilter === filter.key}
                aria-label={`${filter.label}, ${filter.count} registros`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  severityFilter === filter.key
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                }`}
              >
                <filter.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {filter.label}{' '}
                <span className="opacity-75 tabular-nums">({filter.count})</span>
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
            {paged.map((row) => {
              const rowKey = `${row.id}-${row.date ?? 'single'}`
              const isExpanded = expandedId === rowKey
              return (
                <div key={rowKey} className="space-y-0">
                  <div
                    className={`w-full p-3 rounded-lg hover:scale-[1.01] transition-all text-left group border ${
                      row.tone === 'info' ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50' :
                      row.tone === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50' :
                      row.tone === 'warn' ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50' :
                      row.tone === 'alert' ? 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50' :
                      'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelect && onSelect(row.id, row.name)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${row.bgColor}`}
                          aria-hidden
                        >
                          {row.tone === 'info' && <ClockIcon className="h-4 w-4 text-blue-300" />}
                          {row.tone === 'ok' && <CheckCircleIcon className="h-4 w-4 text-emerald-300" />}
                          {row.tone === 'warn' && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-300" />
                          )}
                          {row.tone === 'alert' && (
                            <ExclamationCircleIcon className="h-4 w-4 text-orange-300" />
                          )}
                          {row.tone === 'danger' && <XCircleIcon className="h-4 w-4 text-red-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{row.name}</div>
                          {row.team && (
                            <div className="text-xs text-gray-400 truncate">{row.team}</div>
                          )}
                          <AttendanceRecordFlagsBadges flags={row.flags} />
                        </div>
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-sm font-medium ${row.color}`}>
                          {row.delta > 0 ? `+${row.delta}m` : row.delta < 0 ? `${row.delta}m` : '0m'}
                        </span>
                        <span className="text-sm text-gray-400">
                          {formatTimeDisplay(row.check_in_time ?? row.check_in ?? null)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedId((id) => (id === rowKey ? null : rowKey))
                          }}
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="ml-4 pl-6 py-3 border-l-2 border-white/20 space-y-1.5 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Entrada</span>
                        <span className="text-gray-200">{timeOrDash(row.check_in_time ?? row.check_in)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Inicio almuerzo</span>
                        <span className="text-gray-200">{timeOrDash(row.lunch_start)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Fin almuerzo</span>
                        <span className="text-gray-200">{timeOrDash(row.lunch_end)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Salida</span>
                        <span className="text-gray-200">{timeOrDash(row.check_out)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {/* Pagination */}
            <div className="flex items-center justify-between pt-3">
              <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={goPrev} disabled={!canPrev} className={`px-3 py-1 rounded bg-white/10 text-xs ${canPrev ? 'hover:bg-white/20' : 'opacity-40 cursor-not-allowed'}`}>Anterior</button>
                <button onClick={goNext} disabled={!canNext} className={`px-3 py-1 rounded bg-white/10 text-xs ${canNext ? 'hover:bg-white/20' : 'opacity-40 cursor-not-allowed'}`}>Siguiente</button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
