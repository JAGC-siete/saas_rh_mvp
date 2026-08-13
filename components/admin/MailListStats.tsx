import { useState, useEffect } from 'react'
import { Card, CardContent } from '../ui/card'
import StatsCard from './StatsCard'
import { Mail, CheckCircle, TrendingUp, Send } from 'lucide-react'

interface MailListStatsData {
  leadsByStatus?: {
    active: number
    completed: number
    unsubscribed: number
    total: number
  }
  subscriptionsByStatus?: {
    active: number
    completed: number
    unsubscribed: number
    total: number
  }
  activeInSequenceRate?: number
  conversionRate?: number
  emailsSentTotal?: number
  awaitingWatchman?: number
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
      console.error('Error loading marketing stats:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} variant="liquid" className="border-white/10 animate-pulse">
            <CardContent className="pt-6 h-24" />
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card variant="liquid" className="border-white/10">
        <CardContent className="pt-6">
          <p className="text-red-400">{error || 'No se pudieron cargar las estadísticas'}</p>
        </CardContent>
      </Card>
    )
  }

  const byStatus = stats.leadsByStatus || stats.subscriptionsByStatus
  if (!byStatus) {
    return null
  }

  const activeRate = stats.activeInSequenceRate ?? stats.conversionRate ?? 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Total leads"
        value={byStatus.total}
        description={`${byStatus.active} activos en secuencia`}
        icon={Mail}
      />

      <StatsCard
        title="Activos"
        value={byStatus.active}
        description={`${stats.awaitingWatchman ?? 0} esperando watchman`}
        icon={TrendingUp}
        iconColor="text-blue-500"
        valueColor="text-blue-400"
      />

      <StatsCard
        title="Completados"
        value={byStatus.completed}
        description="Secuencia 1–4 enviada"
        icon={CheckCircle}
        iconColor="text-green-500"
        valueColor="text-green-400"
      />

      <StatsCard
        title="Emails enviados"
        value={stats.emailsSentTotal ?? 0}
        description={`${activeRate.toFixed(1)}% activos / total · ${byStatus.unsubscribed} bajas`}
        icon={Send}
        iconColor="text-cyan-500"
      />
    </div>
  )
}
