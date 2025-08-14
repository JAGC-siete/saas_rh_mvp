interface KpiCardsProps {
  presentes: number
  ausentes: number
  temprano: number
  tarde: number
}

export default function KpiCards({ presentes, ausentes, temprano, tarde }: KpiCardsProps) {
  const items = [
    { label: 'Presentes', value: presentes, color: 'text-emerald-400' },
    { label: 'Ausentes', value: ausentes, color: 'text-red-400' },
    { label: 'Temprano', value: temprano, color: 'text-blue-400' },
    { label: 'Tarde', value: tarde, color: 'text-yellow-400' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((k) => (
        <div key={k.label} className="bg-gray-800 rounded p-4 text-center">
          <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          <div className="text-gray-300 text-sm">{k.label}</div>
        </div>
      ))}
    </div>
  )
}
