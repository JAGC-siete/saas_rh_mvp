import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatTimeDisplay } from '../../lib/timezone'
import { UserCircleIcon } from '@heroicons/react/24/outline'

interface AbsenceRow {
  id: string
  name: string
  team?: string
  check_in_time?: string
}

interface AbsenceTableProps {
  data: AbsenceRow[]
  title: string
  onSelect?: (id: string, name: string) => void
  pageSize?: number
}

export default function AbsenceTable({ data, title, onSelect, pageSize = 10 }: AbsenceTableProps) {
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
          <span className="text-xl">❌</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <UserCircleIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No hay ausentes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paged.map((row) => (
              <button
                key={row.id}
                onClick={() => onSelect && onSelect(row.id, row.name)}
                className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/30 transition-all text-left group"
              >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{row.name}</div>
                  {row.team && (
                    <div className="text-xs text-gray-400 truncate">{row.team}</div>
                  )}
                </div>
              </div>
              {row.check_in_time ? (
                <div className="text-sm text-gray-400 flex-shrink-0">
                  {formatTimeDisplay(row.check_in_time)}
                </div>
              ) : (
                <div className="text-sm text-red-400 font-medium flex-shrink-0 whitespace-nowrap">
                  Ausente
                </div>
              )}
            </div>
              </button>
            ))}
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
