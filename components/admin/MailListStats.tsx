import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import StatsCard from './StatsCard'
import { Mail, CheckCircle, Clock, TrendingUp } from 'lucide-react'

interface MailListStatsData {
  subscriptionsByStatus: {
    pending: number
    confirmed: number
    unsubscribed: number
    total: number
  }
  conversionRate: number
  subscriptionsBySource: { [key: string]: number }
  monthlyGrowth: Array<{ month: string; total: number; confirmed: number }>
}

export default function MailListStats() {
  const [stats, setStats] = useState<MailListStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/mail-list/stats', { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setStats(data.data)
        } else {
          setError(data.error || 'Formato de respuesta inválido')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        setError(errorData.error || 'Error al cargar estadísticas')
      }
    } catch (err) {
      console.error('Error loading mail list stats:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500">{error || 'No se pudieron cargar las estadísticas'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Total Suscriptores"
        value={stats.subscriptionsByStatus.total}
        description={`${stats.subscriptionsByStatus.confirmed} confirmados`}
        icon={Mail}
      />
      
      <StatsCard
        title="Pendientes"
        value={stats.subscriptionsByStatus.pending}
        description="Esperando confirmación"
        icon={Clock}
        iconColor="text-yellow-500"
        valueColor="text-yellow-600"
      />
      
      <StatsCard
        title="Confirmados"
        value={stats.subscriptionsByStatus.confirmed}
        description={`${stats.conversionRate.toFixed(1)}% tasa de conversión`}
        icon={CheckCircle}
        iconColor="text-green-500"
        valueColor="text-green-600"
      />
      
      <StatsCard
        title="Tasa de Conversión"
        value={`${stats.conversionRate.toFixed(1)}%`}
        description="Confirmados / Total"
        icon={TrendingUp}
        iconColor="text-blue-500"
      />
    </div>
  )
}








