import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import StatsCard from '../../../components/admin/StatsCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import {
  MARKETING_KPI_DAYS,
  type MarketingKpiDays,
  type MarketingKpisPayload,
} from '../../../lib/admin/marketing-kpis'
import {
  CheckCircle,
  DollarSign,
  FileText,
  Mail,
  Send,
  TrendingUp,
  Users,
} from 'lucide-react'

const KIND_LABELS: Record<string, string> = {
  activar: 'Activar (trial)',
  ventas: 'Ventas (cotización)',
  info: 'Info / lead magnet',
  suscripcion: 'Suscripción / alertas',
}

function formatHnl(value: number): string {
  return `L ${value.toLocaleString('es-HN', { maximumFractionDigits: 0 })}`
}

export default function MarketingKpisPage() {
  const [days, setDays] = useState<MarketingKpiDays>(30)
  const [data, setData] = useState<MarketingKpisPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (range: MarketingKpiDays) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/admin/marketing/kpis?days=${range}`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        setError(errorData.error || 'Error al cargar KPIs')
        setData(null)
        return
      }
      const json = await response.json()
      if (json.success && json.data) {
        setData(json.data as MarketingKpisPayload)
      } else {
        setError(json.error || 'Formato de respuesta inválido')
        setData(null)
      }
    } catch (err) {
      console.error('Error loading marketing KPIs:', err)
      setError('Error de conexión')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(days)
  }, [days, load])

  const maxDaily = data
    ? Math.max(1, ...data.dailySeries.map((p) => p.total))
    : 1

  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <Head>
          <title>Marketing KPIs | Super Admin | Humano SISU</title>
        </Head>

        <div className="space-y-6 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Marketing KPIs</h1>
              <p className="text-sm text-white/70 mt-1">
                Conversiones propias: leads, secuencia de email y cotizaciones. Sin tráfico web.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {MARKETING_KPI_DAYS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={days === d ? 'default' : 'outline'}
                  className={
                    days === d
                      ? 'bg-brand-600 hover:bg-brand-700 text-white'
                      : 'border-white/20 text-white hover:bg-white/10'
                  }
                  onClick={() => setDays(d)}
                  disabled={loading}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} variant="liquid" className="border-white/10 animate-pulse">
                  <CardContent className="pt-6 h-24" />
                </Card>
              ))}
            </div>
          )}

          {!loading && error && (
            <Card variant="liquid" className="border-white/10">
              <CardContent className="pt-6">
                <p className="text-red-400">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 border-white/20 text-white"
                  onClick={() => void load(days)}
                >
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Leads nuevos"
                  value={data.leads.total}
                  description={`Últimos ${data.range.days} días`}
                  icon={Users}
                />
                <StatsCard
                  title="Activos en secuencia"
                  value={data.leads.byStatus.active}
                  description={`${data.sequence.awaitingWatchman} esperando watchman (global)`}
                  icon={TrendingUp}
                  iconColor="text-blue-500"
                  valueColor="text-blue-400"
                />
                <StatsCard
                  title="Completados"
                  value={data.leads.byStatus.completed}
                  description={`${data.leads.byStatus.unsubscribed} bajas en el periodo`}
                  icon={CheckCircle}
                  iconColor="text-green-500"
                  valueColor="text-green-400"
                />
                <StatsCard
                  title="Emails enviados"
                  value={data.email.sentInRange}
                  description={`Ledger · últimos ${data.range.days} días`}
                  icon={Send}
                  iconColor="text-cyan-500"
                  valueColor="text-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="liquid" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Mail className="h-5 w-5 text-brand-300" />
                      Leads por origen
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Normalizado (activar / ventas / info / suscripción). Viernes ⊆ info.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(Object.keys(KIND_LABELS) as Array<keyof typeof data.leads.byKind>).map(
                      (kind) => (
                        <div
                          key={kind}
                          className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0"
                        >
                          <span className="text-white/80">{KIND_LABELS[kind]}</span>
                          <span className="font-semibold text-white tabular-nums">
                            {data.leads.byKind[kind].toLocaleString()}
                          </span>
                        </div>
                      )
                    )}
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-amber-200/90">De los cuales viernes</span>
                      <span className="font-semibold text-amber-200 tabular-nums">
                        {data.leads.viernesLeads.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-sky-200/90">De los cuales paz</span>
                      <span className="font-semibold text-sky-200 tabular-nums">
                        {data.leads.pazLeads.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="liquid" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-300" />
                      Comercial
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Cotizaciones y depósitos · ventana fija {data.commercialWindowDays} días
                      (independiente del selector de leads)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!data.commercial.available ? (
                      <p className="text-sm text-white/60">
                        Métricas comerciales no disponibles (migración de billing pendiente).
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <StatsCard
                          title="Cotizaciones enviadas"
                          value={data.commercial.quotesSent30d}
                          description={`${data.commercialWindowDays}d`}
                          icon={FileText}
                        />
                        <StatsCard
                          title="Depósitos (mes)"
                          value={data.commercial.depositsMonthCount}
                          description={formatHnl(data.commercial.depositsMonthTotalHnl)}
                          icon={DollarSign}
                          iconColor="text-emerald-500"
                          valueColor="text-emerald-400"
                        />
                        <StatsCard
                          title="Con conversión"
                          value={data.commercial.quotesDepositReceived30d}
                          description={
                            data.commercial.conversionRate30d == null
                              ? 'Sin base'
                              : `${data.commercial.conversionRate30d}% conversión`
                          }
                          icon={CheckCircle}
                          iconColor="text-green-500"
                        />
                        <StatsCard
                          title="Pipeline pendiente"
                          value={formatHnl(data.commercial.pipelineQuotedTotalHnl)}
                          description={`${data.commercial.quotesPendingPayment} cotiz. pendientes`}
                          icon={TrendingUp}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card variant="liquid" className="border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Leads por día</CardTitle>
                  <CardDescription className="text-white/60">
                    Zona horaria Honduras · últimos {data.range.days} días
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {data.dailySeries.map((point) => (
                      <div key={point.date} className="flex items-center gap-3 text-sm">
                        <span className="w-24 shrink-0 text-white/60 tabular-nums">
                          {point.date}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-500/80"
                            style={{ width: `${(point.total / maxDaily) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-white tabular-nums">
                          {point.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {Object.keys(data.email.byStep).length > 0 && (
                <Card variant="liquid" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Emails por paso de secuencia</CardTitle>
                    <CardDescription className="text-white/60">
                      Envios del ledger en el periodo seleccionado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(data.email.byStep)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([step, count]) => (
                          <div
                            key={step}
                            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm"
                          >
                            <span className="text-white/60">Paso {step}: </span>
                            <span className="text-white font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
