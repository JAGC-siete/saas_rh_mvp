import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { formatTimeDisplay } from '../../lib/timezone'
import { getSeverityFromDelta } from '../../lib/hooks/useAttendanceData'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { AttendanceRecordFlagsBadges, type AttendanceListFlags } from './AttendanceRecordFlagsBadges'
import EmployeeCell from '../common/EmployeeCell'
import { getSeverityPulseClass, type SeverityTone } from '../../lib/attendance/severity-styles'

interface ArrivalRow {
  id: string
  name: string
  dni?: string
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
  externalSeverityFilter?: 'all' | 'early' | 'on_time' | 'warn' | 'alert' | 'danger' | 'late'
}

type SeverityFilter = 'all' | 'early' | 'on_time' | 'warn' | 'alert' | 'danger'

function timeOrDash(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  return formatTimeDisplay(value)
}

export default function ArrivalTable({
  earlyData,
  lateData,
  title,
  onSelect,
  pageSize = 10,
  externalSeverityFilter = 'all',
}: ArrivalTableProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (externalSeverityFilter === 'all') return
    if (externalSeverityFilter === 'late') {
      setSeverityFilter('warn')
    } else if (
      externalSeverityFilter === 'early' ||
      externalSeverityFilter === 'on_time' ||
      externalSeverityFilter === 'warn' ||
      externalSeverityFilter === 'alert' ||
      externalSeverityFilter === 'danger'
    ) {
      setSeverityFilter(externalSeverityFilter)
    }
    setPage(1)
  }, [externalSeverityFilter])

  const unifiedRows = useMemo(() => {
    const mapRow = (r: ArrivalRow) => {
      const delta = r.delta_min ?? r.late_minutes ?? 0
      const severity = getSeverityFromDelta(delta)
      return {
        ...r,
        delta,
        severity: severity.label,
        tone: severity.tone as SeverityTone,
        color: severity.color,
      }
    }

    return [...earlyData.map(mapRow), ...lateData.map(mapRow)].sort(
      (a, b) => (b.delta ?? 0) - (a.delta ?? 0)
    )
  }, [earlyData, lateData])

  const filteredRows = useMemo(() => {
    let rows = unifiedRows

    if (externalSeverityFilter === 'late') {
      rows = rows.filter((row) => ['warn', 'alert', 'danger'].includes(row.tone))
    } else if (severityFilter !== 'all') {
      rows = rows.filter((row) => {
        switch (severityFilter) {
          case 'early':
            return row.tone === 'info'
          case 'on_time':
            return row.tone === 'ok'
          case 'warn':
            return row.tone === 'warn'
          case 'alert':
            return row.tone === 'alert'
          case 'danger':
            return row.tone === 'danger'
          default:
            return true
        }
      })
    }

    return rows
  }, [unifiedRows, severityFilter, externalSeverityFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const severityFilters = [
    { key: 'all' as SeverityFilter, label: 'Todos', count: unifiedRows.length },
    { key: 'early' as SeverityFilter, label: 'Temprano', count: unifiedRows.filter((r) => r.tone === 'info').length },
    { key: 'on_time' as SeverityFilter, label: 'A tiempo', count: unifiedRows.filter((r) => r.tone === 'ok').length },
    { key: 'warn' as SeverityFilter, label: 'Tarde 5–10', count: unifiedRows.filter((r) => r.tone === 'warn').length },
    { key: 'alert' as SeverityFilter, label: 'Tarde 11–20', count: unifiedRows.filter((r) => r.tone === 'alert').length },
    { key: 'danger' as SeverityFilter, label: 'Tarde >20', count: unifiedRows.filter((r) => r.tone === 'danger').length },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {unifiedRows.length > 0 && externalSeverityFilter === 'all' && (
          <div className="flex flex-wrap gap-1.5">
            {severityFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  setSeverityFilter(filter.key)
                  setPage(1)
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                  severityFilter === filter.key
                    ? 'bg-brand-600/90 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No hay registros</div>
      ) : (
        <LayoutGroup>
          <motion.div layout className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {paged.map((row) => {
                const rowKey = `${row.id}-${row.date ?? 'single'}`
                const isExpanded = expandedId === rowKey
                return (
                  <motion.div
                    key={rowKey}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="group"
                  >
                    <div className="relative flex rounded-xl hover:bg-white/5 transition-colors duration-200 overflow-hidden">
                      {/* Severity pulse line */}
                      <div
                        className={`w-[3px] flex-shrink-0 rounded-full ${getSeverityPulseClass(row.tone)}`}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onSelect?.(row.id, row.name)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <EmployeeCell
                                name={row.name}
                                dni={row.dni}
                                subtitle={row.team}
                                nameClassName="font-medium text-white truncate"
                                dniClassName="text-xs text-gray-500 truncate"
                                subtitleClassName="text-xs text-gray-500 truncate"
                              />
                              <AttendanceRecordFlagsBadges flags={row.flags} />
                            </div>
                          </button>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`text-sm font-medium tabular-nums ${row.color}`}>
                              {row.delta > 0 ? `+${row.delta}m` : row.delta < 0 ? `${row.delta}m` : '0m'}
                            </span>
                            <span className="text-sm text-gray-400 tabular-nums">
                              {formatTimeDisplay(row.check_in_time ?? row.check_in ?? null)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedId((id) => (id === rowKey ? null : rowKey))
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="h-4 w-4" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Entrada</span>
                                  <span className="text-gray-200">{timeOrDash(row.check_in_time ?? row.check_in)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Salida</span>
                                  <span className="text-gray-200">{timeOrDash(row.check_out)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Almuerzo inicio</span>
                                  <span className="text-gray-200">{timeOrDash(row.lunch_start)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Almuerzo fin</span>
                                  <span className="text-gray-200">{timeOrDash(row.lunch_end)}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}

      {filteredRows.length > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg bg-white/5 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-lg bg-white/5 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
