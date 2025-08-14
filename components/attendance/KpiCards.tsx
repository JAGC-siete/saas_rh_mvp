import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

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
        <Card key={k.label} variant="glass" className="text-center">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-gray-300 font-medium">{k.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
