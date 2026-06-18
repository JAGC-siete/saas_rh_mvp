import { useMemo, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { formatTimeDisplay } from '../../lib/timezone'
import { ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { AttendanceRecordFlagsBadges, type AttendanceListFlags } from './AttendanceRecordFlagsBadges'
import EmployeeCell from '../common/EmployeeCell'
import {
  getOutsideSchedulePulseClass,
  getOutsideScheduleTextClass,
} from '../../lib/attendance/severity-styles'

interface OutsideScheduleRow {
  id: string
  name: string
  dni?: string
  team?: string
  check_in_time?: string
  check_in?: string
  check_out?: string
  date?: string
  flags?: AttendanceListFlags
}

interface OutsideScheduleTableProps {
  data: OutsideScheduleRow[]
  title: string
  onSelect?: (id: string, name: string) => void
  pageSize?: number
}

function timeOrDash(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  return formatTimeDisplay(value)
}

function gapLabel(flags?: AttendanceListFlags): string {
  if (flags?.horario_no_detectado) return 'Horario no detectado'
  if (flags?.gap_minutos != null) return `${flags.gap_minutos} min del horario`
  return flags?.razon ?? 'Fuera de horario'
}

export default function OutsideScheduleTable({
  data,
  title,
  onSelect,
  pageSize = 10,
}: OutsideScheduleTableProps) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, page, pageSize])

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white">{title}</h3>

      {data.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="h-10 w-10 mx-auto text-gray-600 mb-3" aria-hidden />
          <p className="text-gray-400 text-sm">Nadie marcó fuera de horario</p>
        </div>
      ) : (
        <LayoutGroup>
          <motion.div layout className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {paged.map((row) => {
                const rowKey = `${row.id}-${row.date ?? 'single'}`
                const isExpanded = expandedId === rowKey
                const checkIn = row.check_in_time ?? row.check_in
                const gapMin = row.flags?.gap_minutos
                const horarioNoDetectado = row.flags?.horario_no_detectado
                const pulseClass = getOutsideSchedulePulseClass(gapMin, horarioNoDetectado)
                const textClass = getOutsideScheduleTextClass(gapMin, horarioNoDetectado)
                const detail = gapLabel(row.flags)

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
                      <div
                        className={`w-[3px] flex-shrink-0 rounded-full ${pulseClass}`}
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
                              <span className={`inline-block mt-1 text-xs font-medium ${textClass}`}>
                                {detail}
                              </span>
                            </div>
                          </button>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {checkIn && (
                              <span className={`text-sm tabular-nums font-medium ${textClass}`}>
                                {formatTimeDisplay(checkIn)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedId((id) => (id === rowKey ? null : rowKey))
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                              aria-expanded={isExpanded}
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
                                  <span className="text-gray-200">{timeOrDash(checkIn)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Salida</span>
                                  <span className="text-gray-200">{timeOrDash(row.check_out)}</span>
                                </div>
                                <div className="flex justify-between gap-2 col-span-2">
                                  <span className="text-gray-500">Desviación</span>
                                  <span className={textClass}>{detail}</span>
                                </div>
                                {row.date && (
                                  <div className="flex justify-between gap-2 col-span-2">
                                    <span className="text-gray-500">Fecha</span>
                                    <span className="text-gray-200">{row.date}</span>
                                  </div>
                                )}
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

      {data.length > pageSize && (
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
