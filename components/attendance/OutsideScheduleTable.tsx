import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatTimeDisplay } from '../../lib/timezone'
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { AttendanceRecordFlagsBadges, type AttendanceListFlags } from './AttendanceRecordFlagsBadges'

interface OutsideScheduleRow {
  id: string
  name: string
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

export default function OutsideScheduleTable({
  data,
  title,
  onSelect,
  pageSize = 10,
}: OutsideScheduleTableProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, page, pageSize])
  const canPrev = page > 1
  const canNext = page < totalPages
  const goPrev = () => setPage((p) => (p > 1 ? p - 1 : p))
  const goNext = () => setPage((p) => (p < totalPages ? p + 1 : p))

  return (
    <Card variant="glass" className="border border-white/10">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <ExclamationTriangleIcon className="h-6 w-6 text-amber-400 shrink-0" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">Nadie marcó fuera de horario</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paged.map((row) => {
              const checkIn = row.check_in_time ?? row.check_in
              const flagInfo =
                row.flags?.gap_minutos != null
                  ? `${row.flags.gap_minutos} min del horario`
                  : row.flags?.razon ?? 'Fuera de horario'
              return (
                <button
                  key={`${row.id}-${row.date ?? 'single'}`}
                  onClick={() => onSelect && onSelect(row.id, row.name)}
                  className="w-full p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{row.name}</div>
                        {row.team && (
                          <div className="text-xs text-gray-400 truncate">{row.team}</div>
                        )}
                        <AttendanceRecordFlagsBadges flags={row.flags} />
                        <span
                          className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300"
                          title={flagInfo}
                        >
                          Fuera de horario
                        </span>
                      </div>
                    </div>
                    {checkIn && (
                      <div className="text-sm text-amber-300 flex-shrink-0">
                        {formatTimeDisplay(checkIn)}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
            {/* Pagination */}
            <div className="flex items-center justify-between pt-3">
              <span className="text-xs text-gray-400">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={goPrev}
                  disabled={!canPrev}
                  className={`px-3 py-1 rounded bg-white/10 text-xs ${canPrev ? 'hover:bg-white/20' : 'opacity-40 cursor-not-allowed'}`}
                >
                  Anterior
                </button>
                <button
                  onClick={goNext}
                  disabled={!canNext}
                  className={`px-3 py-1 rounded bg-white/10 text-xs ${canNext ? 'hover:bg-white/20' : 'opacity-40 cursor-not-allowed'}`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
