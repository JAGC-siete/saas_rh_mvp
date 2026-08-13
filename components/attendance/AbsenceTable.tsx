import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { formatDateOnlyForHonduras, formatTimeDisplay, getTodayInHonduras } from '../../lib/timezone'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import { AttendanceRecordFlagsBadges, type AttendanceListFlags } from './AttendanceRecordFlagsBadges'

interface AbsenceRow {
  id: string
  name: string
  team?: string
  date?: string
  check_in_time?: string
  flags?: AttendanceListFlags
}

interface AbsenceTableProps {
  data: AbsenceRow[]
  title: string
  onSelect?: (id: string, name: string) => void
  pageSize?: number
  /** Show calendar date per row (multi-day ranges). */
  showDate?: boolean
}

function absenceRowKey(row: AbsenceRow): string {
  const datePart = row.date?.slice(0, 10) ?? 'single'
  return `${row.id}-${datePart}`
}

function formatAbsenceDate(dateStr?: string): string {
  if (!dateStr) return ''
  const normalized = dateStr.slice(0, 10)
  return formatDateOnlyForHonduras(normalized)
}

export default function AbsenceTable({
  data,
  title,
  onSelect,
  pageSize = 10,
  showDate = false,
}: AbsenceTableProps) {
  const [page, setPage] = useState(1)
  const today = getTodayInHonduras()
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [data])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white">{title}</h3>

      {data.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No hay ausentes</div>
      ) : (
        <LayoutGroup>
          <motion.div layout className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {paged.map((row) => {
                const rowKey = absenceRowKey(row)
                const dateOnly = row.date?.slice(0, 10)
                const isFuture = Boolean(dateOnly && dateOnly > today)
                const dateLabel = showDate && dateOnly ? formatAbsenceDate(dateOnly) : ''

                return (
                  <motion.button
                    key={rowKey}
                    type="button"
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={() => onSelect?.(row.id, row.name)}
                    className="w-full relative flex rounded-xl hover:bg-white/5 transition-colors duration-200 text-left group"
                  >
                    <div
                      className={`w-[3px] flex-shrink-0 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.4)] ${
                        isFuture
                          ? 'bg-amber-500/80'
                          : 'bg-rose-500 animate-critical-pulse'
                      }`}
                      aria-hidden
                    />
                    <div className="flex-1 flex items-center justify-between gap-3 p-3 min-w-0">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <UserCircleIcon
                          className={`h-8 w-8 flex-shrink-0 ${isFuture ? 'text-amber-400/70' : 'text-red-400/70'}`}
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">{row.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {[row.team, dateLabel].filter(Boolean).join(' · ')}
                          </div>
                          <AttendanceRecordFlagsBadges flags={row.flags} />
                        </div>
                      </div>
                      {row.check_in_time ? (
                        <span className="text-sm text-gray-400 flex-shrink-0 tabular-nums">
                          {formatTimeDisplay(row.check_in_time)}
                        </span>
                      ) : (
                        <span
                          className={`text-sm font-medium flex-shrink-0 ${
                            isFuture ? 'text-amber-400/90' : 'text-rose-400'
                          }`}
                        >
                          {isFuture ? 'Pendiente' : 'Ausente'}
                        </span>
                      )}
                    </div>
                  </motion.button>
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
