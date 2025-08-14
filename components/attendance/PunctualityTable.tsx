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
  onSelect?: (id: string, name: string) => void
}

export default function PunctualityTable({ data, type, onSelect }: PunctualityTableProps) {
  return (
    <div className="bg-gray-800 rounded p-4">
      <h3 className="text-white font-semibold mb-2">{type === 'early' ? 'Tempranos' : 'Tarde'} hoy</h3>
      <table className="w-full text-sm text-left">
        <thead className="text-gray-300">
          <tr>
            <th className="py-1">Empleado</th>
            <th className="py-1">Equipo</th>
            <th className="py-1">Entrada</th>
            <th className="py-1">Δ min</th>
          </tr>
        </thead>
        <tbody className="text-gray-100">
          {data.map((row) => (
            <tr key={row.id} className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer" onClick={() => onSelect && onSelect(row.id, row.name)}>
              <td className="py-1">{row.name}</td>
              <td className="py-1">{row.team || '-'}</td>
              <td className="py-1">{new Date(row.check_in_time).toLocaleTimeString('es-HN',{hour:'2-digit',minute:'2-digit'})}</td>
              <td className="py-1">{row.delta_min}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-4 text-gray-400">Sin datos</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
