import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import StatsCard from './StatsCard'
import { Users, DollarSign, Building2, TrendingUp } from 'lucide-react'

interface AffiliateStatsData {
  affiliatesByStatus: {
    pending: number
    approved: number
    rejected: number
    total: number
  }
  commissionsByStatus: {
    pending: number
    paid: number
    cancelled: number
    total: number
  }
  commissionsAmountByStatus: {
    pending: number
    paid: number
    cancelled: number
    total: number
  }
  totalReferredCompanies: number
  companiesByAffiliate: { [key: string]: number }
  monthlyGrowth: Array<{ month: string; count: number }>
}

export default function AffiliateStats() {
  const [stats, setStats] = useState<AffiliateStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/affiliates/stats', { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setStats(data.data)
        } else {
          setError(data.error || 'Error al cargar estadísticas')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        setError(errorData.error || 'Error al cargar estadísticas')
      }
    } catch (err) {
      console.error('Error loading affiliate stats:', err)
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-white/20 rounded w-24"></div>
              <div className="h-5 w-5 bg-white/20 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-white/20 rounded w-16 mb-2"></div>
              <div className="h-3 bg-white/20 rounded w-20"></div>
            </CardContent>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Total Afiliados"
        value={stats.affiliatesByStatus.total}
        description={`${stats.affiliatesByStatus.approved} aprobados, ${stats.affiliatesByStatus.pending} pendientes`}
        icon={Users}
      />
      
      <StatsCard
        title="Comisiones Pendientes"
        value={stats.commissionsByStatus.pending}
        description={`L. ${stats.commissionsAmountByStatus.pending.toLocaleString()} en total`}
        icon={DollarSign}
        iconColor="text-yellow-500"
        valueColor="text-yellow-600"
      />
      
      <StatsCard
        title="Comisiones Pagadas"
        value={stats.commissionsByStatus.paid}
        description={`L. ${stats.commissionsAmountByStatus.paid.toLocaleString()} en total`}
        icon={DollarSign}
        iconColor="text-green-500"
        valueColor="text-green-600"
      />
      
      <StatsCard
        title="Empresas Referidas"
        value={stats.totalReferredCompanies}
        description="Total de empresas referidas"
        icon={Building2}
        iconColor="text-blue-500"
      />
    </div>
  )
}








