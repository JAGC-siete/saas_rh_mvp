import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatTimeDisplay } from '../../lib/timezone'

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
    <Card variant="glass">
      <CardHeader className="pb-2"><CardTitle className="text-white text-base">{title}</CardTitle></CardHeader>
      <CardContent className="pt-0">
      <table className="w-full text-sm text-left">
        <thead className="text-gray-300">
          <tr>
            <th className="py-1">Empleado</th>
            <th className="py-1">Equipo</th>
            <th className="py-1">Entrada</th>
          </tr>
        </thead>
        <tbody className="text-gray-100">
          {data.map((row) => (
            <tr key={row.id} className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer" onClick={() => onSelect && onSelect(row.id, row.name)}>
              <td className="py-1">{row.name}</td>
              <td className="py-1">{row.team || '-'}</td>
              <td className="py-1">{formatTimeDisplay(row.check_in_time || null)}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-gray-400">Sin datos</td>
            </tr>
          )}
        </tbody>
      </table>
      </CardContent>
    </Card>
  )
}
