import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useTranslations } from 'next-intl'
import { formatTimeDisplay } from '../../lib/timezone'

interface Row {
  id: string
  name: string
  team?: string
  delta_min: number
  check_in_time: string
}

interface PunctualityTableProps {
  data: Row[]
  type: 'early' | 'late'
  title?: string
  onSelect?: (id: string, name: string) => void
}

export default function PunctualityTable({ data, type, title, onSelect }: PunctualityTableProps) {
  const ta = useTranslations('attendance.punctuality')
  // Usar título personalizado o generar uno por defecto
  const displayTitle = title || (type === 'early' ? ta('earlyToday') : ta('lateToday'))
  
  return (
    <Card variant="liquid">
      <CardHeader className="pb-2"><CardTitle className="text-white text-base">{displayTitle}</CardTitle></CardHeader>
      <CardContent className="pt-0">
      <table className="w-full text-sm text-left">
        <thead className="text-gray-300">
          <tr>
            <th className="py-1">{ta('employee')}</th>
            <th className="py-1">{ta('team')}</th>
            <th className="py-1">{ta('checkIn')}</th>
            <th className="py-1">{ta('delta')}</th>
          </tr>
        </thead>
        <tbody className="text-gray-100">
          {data.map((row) => (
            <tr key={row.id} className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer" onClick={() => onSelect && onSelect(row.id, row.name)}>
              <td className="py-1">{row.name}</td>
              <td className="py-1">{row.team || '-'}</td>
              <td className="py-1">{formatTimeDisplay(row.check_in_time)}</td>
              <td className="py-1">{row.delta_min}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-4 text-gray-400">{ta('noData')}</td>
            </tr>
          )}
        </tbody>
      </table>
      </CardContent>
    </Card>
  )
}
