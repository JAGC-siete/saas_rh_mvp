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
}

export default function AbsenceTable({ data, title, onSelect }: AbsenceTableProps) {
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
            {data.map((row) => (
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
