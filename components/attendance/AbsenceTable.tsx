interface AbsenceRow {
  id: string
  name: string
  team?: string
}

interface AbsenceTableProps {
  data: AbsenceRow[]
  title: string
  onSelect?: (id: string, name: string) => void
}

export default function AbsenceTable({ data, title, onSelect }: AbsenceTableProps) {
  return (
    <div className="bg-gray-800 rounded p-4">
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <table className="w-full text-sm text-left">
        <thead className="text-gray-300">
          <tr>
            <th className="py-1">Empleado</th>
            <th className="py-1">Equipo</th>
          </tr>
        </thead>
        <tbody className="text-gray-100">
          {data.map((row) => (
            <tr key={row.id} className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer" onClick={() => onSelect && onSelect(row.id, row.name)}>
              <td className="py-1">{row.name}</td>
              <td className="py-1">{row.team || '-'}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={2} className="text-center py-4 text-gray-400">Sin datos</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
