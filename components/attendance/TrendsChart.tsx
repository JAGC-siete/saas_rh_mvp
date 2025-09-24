import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface TrendData {
  date: string
  present: number
  absent: number
  late: number
  checkInTimes: Array<{time: string, employee: string}>
}

interface TrendsChartProps {
  trends: TrendData[]
  loading?: boolean
}

export default function TrendsChart({ trends, loading = false }: TrendsChartProps) {
  // Transformar datos para el gráfico
  const chartData = trends.map(t => {
    const total = t.present + t.late + t.absent
    return {
      date: new Date(t.date + 'T00:00:00').toLocaleDateString('es-HN', { 
        month: 'short', 
        day: 'numeric' 
      }),
      attendanceRate: total ? ((t.present + t.late) / total) * 100 : 0,
      punctualityRate: total ? (t.present / total) * 100 : 0,
      present: t.present,
      late: t.late,
      absent: t.absent,
      total
    }
  })

  if (loading) {
    return (
      <div className="h-[220px] bg-gray-800/50 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Cargando tendencias...</div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[220px] bg-gray-800/50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Sin datos de tendencias</div>
          <div className="text-sm text-gray-500">Selecciona un rango de fechas con datos</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
            tickFormatter={(v) => `${v}%`}
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`, 
              name === 'attendanceRate' ? 'Asistencia' : 'Puntualidad'
            ]}
            labelFormatter={(label) => `Fecha: ${label}`}
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Legend 
            wrapperStyle={{ color: '#F9FAFB', fontSize: '12px' }}
          />
          <Line 
            type="monotone" 
            dataKey="attendanceRate" 
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            name="Asistencia"
          />
          <Line 
            type="monotone" 
            dataKey="punctualityRate" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            name="Puntualidad"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
