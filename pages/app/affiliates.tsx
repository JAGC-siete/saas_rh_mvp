import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'

type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'none'
interface AffiliateData {
  status: AffiliateStatus
  referral_code?: string
}
interface Commission {
  id: string
  created_at: string
  referred_company_name: string
  amount: number
  status: 'pending' | 'paid' | 'cancelled'
}
interface CommissionStats {
  total_earned: number
  total_pending: number
  total_paid: number
}

const StatCard = ({ title, value }: { title: string; value: number }) => (
  <Card className="bg-gray-800">
    <CardHeader>
      <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">L {value.toLocaleString('en-US')}</div>
    </CardContent>
  </Card>
)

export default function AffiliateDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null)
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          setLoading(true)
          const [affiliateRes, statsRes, commissionsRes] = await Promise.all([
            fetch('/api/affiliates/me'),
            fetch('/api/affiliates/stats'),
            fetch('/api/affiliates/commissions'),
          ])

          if (!affiliateRes.ok || !statsRes.ok || !commissionsRes.ok) {
            throw new Error('Failed to fetch affiliate data')
          }

          const affiliateJson = await affiliateRes.json()
          const statsJson = await statsRes.json()
          const commissionsJson = await commissionsRes.json()

          setAffiliateData(affiliateJson)
          setStats(statsJson)
          setCommissions(commissionsJson.commissions)
        } catch {
          setError('No se pudo cargar la información del afiliado.')
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    }
  }, [user])

  const renderContent = () => {
    if (loading) {
      return <div>Cargando datos de afiliado...</div>
    }

    if (error) {
      return <div className="text-red-500">{error}</div>
    }

    switch (affiliateData?.status) {
      case 'approved':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tu Código de Referido</CardTitle>
                <CardDescription>Estado: <Badge className="bg-green-600">Aprobado</Badge></CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2">Comparte este código con nuevas empresas. Ganarás una comisión por cada una que se suscriba.</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={affiliateData.referral_code}
                    className="bg-gray-800 border-gray-700 text-white rounded px-3 py-2 w-full font-mono"
                  />
                  <Button onClick={() => navigator.clipboard.writeText(affiliateData.referral_code || '')}>Copiar</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard title="Total Ganado" value={stats?.total_earned || 0} />
              <StatCard title="Pendiente de Pago" value={stats?.total_pending || 0} />
              <StatCard title="Total Pagado" value={stats?.total_paid || 0} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Historial de Comisiones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Empresa Referida</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-800">
                      {commissions.map((c) => (
                        <tr key={c.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{c.referred_company_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">L {c.amount.toLocaleString('en-US')}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={c.status === 'paid' ? 'default' : c.status === 'cancelled' ? 'destructive' : 'outline'}>
                              {c.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case 'pending':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Solicitud Pendiente</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Gracias por tu interés. Estamos revisando tu solicitud para el programa de afiliados. Te notificaremos por correo electrónico una vez que haya sido aprobada.</p>
            </CardContent>
          </Card>
        )
      case 'rejected':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Solicitud Rechazada</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Lamentablemente, tu solicitud para unirte al programa de afiliados no fue aprobada en este momento. Si crees que esto es un error, por favor contacta a soporte.</p>
            </CardContent>
          </Card>
        )
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Únete a Nuestro Programa de Afiliados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Gana comisiones recurrentes compartiendo Humano SISU con otras empresas.</p>
              <Button onClick={() => window.location.href = '/afiliados'}>Convertirme en Afiliado</Button>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Programa de Afiliados</h1>
        {renderContent()}
      </div>
    </DashboardLayout>
  )
}
