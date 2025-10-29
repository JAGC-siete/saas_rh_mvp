import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface KpiBarsChartProps {
  kpis: {
    presentes: number
    ausentes: number
    tempranos: number
    tardes: number
    total_empleados?: number
  }
  loading?: boolean
}

export default function KpiBarsChart({ kpis, loading = false }: KpiBarsChartProps) {
  // Preparar datos para el gráfico de barras apiladas
  const chartData = [{
    name: 'Hoy',
    presentes: kpis.presentes || 0,
    tardes: kpis.tardes || 0,
    ausentes: kpis.ausentes || 0,
    total: (kpis.presentes || 0) + (kpis.tardes || 0) + (kpis.ausentes || 0)
  }]

  if (loading) {
    return (
      <div className="h-[220px] bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 backdrop-blur-sm animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Cargando datos...</div>
      </div>
    )
  }

  if (chartData[0].total === 0) {
    return (
      <div className="h-[220px] bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-gray-400 mb-2 font-medium">Sin datos de asistencia</div>
          <div className="text-sm text-gray-500">No hay registros disponibles</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[220px] w-full bg-gradient-to-br from-white/5 to-white/0 rounded-xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              value, 
              name === 'presentes' ? 'Presentes' : 
              name === 'tardes' ? 'Tardes' : 'Ausentes'
            ]}
            labelFormatter={() => 'Distribución de asistencia'}
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
          <Bar 
            dataKey="presentes" 
            stackId="a" 
            fill="#10B981"
            name="Presentes"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="tardes" 
            stackId="a" 
            fill="#F59E0B"
            name="Tardes"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="ausentes" 
            stackId="a" 
            fill="#EF4444"
            name="Ausentes"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
