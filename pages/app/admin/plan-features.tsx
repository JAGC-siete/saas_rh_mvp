import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { Info, Loader2, Save } from 'lucide-react'

type PlanRow = { plan_key: string; name: string; description: string | null; is_active: boolean }
type FeatureRow = { feature_key: string; name: string; description: string | null }
type PlanFeatureLink = { plan_key: string; feature_key: string }

const PLAN_ORDER = ['free_trial', 'basic', 'pro', 'enterprise'] as const

export default function PlanFeaturesAdminPage() {
  const { addNotification } = useNotificationContext()
  const [loading, setLoading] = useState(true)
  const [savingPlan, setSavingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [links, setLinks] = useState<PlanFeatureLink[]>([])
  /** draft[plan_key][feature_key] = enabled */
  const [draft, setDraft] = useState<Record<string, Record<string, boolean>>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/plan-features', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar')
      setPlans(data.plans || [])
      setFeatures(data.features || [])
      setLinks(data.plan_features || [])
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const next: Record<string, Record<string, boolean>> = {}
    for (const pk of PLAN_ORDER) {
      next[pk] = {}
    }
    for (const l of links) {
      if (!next[l.plan_key]) next[l.plan_key] = {}
      next[l.plan_key][l.feature_key] = true
    }
    setDraft(next)
  }, [links])

  const orderedPlans = useMemo(() => {
    const byKey = new Map(plans.map((p) => [p.plan_key, p]))
    return PLAN_ORDER.map((k) => byKey.get(k)).filter(Boolean) as PlanRow[]
  }, [plans])

  const toggle = (planKey: string, featureKey: string) => {
    setDraft((prev) => ({
      ...prev,
      [planKey]: {
        ...(prev[planKey] || {}),
        [featureKey]: !prev[planKey]?.[featureKey],
      },
    }))
  }

  const dirtyForPlan = (planKey: string) => {
    const d = draft[planKey] || {}
    const prev = new Set(links.filter((l) => l.plan_key === planKey).map((l) => l.feature_key))
    const keys = Object.keys(d).filter((k) => d[k])
    if (keys.length !== prev.size) return true
    return keys.some((k) => !prev.has(k))
  }

  const savePlan = async (planKey: string) => {
    const d = draft[planKey] || {}
    const feature_keys = Object.keys(d).filter((k) => d[k])
    setSavingPlan(planKey)
    try {
      const res = await fetch('/api/admin/plan-features', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_key: planKey, feature_keys }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Error al guardar')
      addNotification({
        type: 'success',
        title: 'Guardado',
        message: `Plan «${planKey}» actualizado (${feature_keys.length} módulos).`,
      })
      await load()
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Error', message: e.message || 'Error al guardar' })
    } finally {
      setSavingPlan(null)
    }
  }

  return (
    <>
      <Head>
        <title>Planes y módulos - Super Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Segmentación</p>
              <h1 className="text-3xl font-semibold text-white">Planes internos y módulos</h1>
              <p className="text-white/70 max-w-3xl">
                Define qué categorías de servicio incluye cada plan interno. Las empresas siguen usando{' '}
                <code className="text-amber-200/90">companies.plan_type</code> (trial, basic, premium, enterprise); el
                sistema mapea eso a estos planes para resolver permisos por módulo.
              </p>
            </div>

            <Card variant="glass" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Info className="h-5 w-5 text-amber-300" />
                  Mapeo comercial → interno
                </CardTitle>
                <CardDescription className="text-white/60">
                  trial → free_trial · basic → basic · premium → pro · enterprise → enterprise
                </CardDescription>
              </CardHeader>
            </Card>

            {error && (
              <Card variant="glass" className="border-red-400/40 bg-red-500/10">
                <CardContent className="pt-4 text-red-100 text-sm">{error}</CardContent>
              </Card>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-amber-300" />
              </div>
            ) : (
              <Card variant="glass" className="border-white/10 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white">Matriz plan × módulo</CardTitle>
                  <CardDescription className="text-white/60">
                    Marca los módulos incluidos en cada plan. Guarda por columna cuando termines de editar ese plan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0 sm:p-6">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-white/15 text-left text-white/70">
                        <th className="py-3 px-3 font-medium w-[220px]">Módulo</th>
                        {orderedPlans.map((p) => (
                          <th key={p.plan_key} className="py-3 px-2 font-medium text-center align-bottom">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-white">{p.name}</span>
                              <span className="text-[10px] font-mono text-white/50">{p.plan_key}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-1 border-amber-300/40 text-amber-100 hover:bg-amber-500/20"
                                disabled={!dirtyForPlan(p.plan_key) || savingPlan === p.plan_key}
                                onClick={() => savePlan(p.plan_key)}
                              >
                                {savingPlan === p.plan_key ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-3.5 w-3.5 mr-1" />
                                    Guardar
                                  </>
                                )}
                              </Button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((f) => (
                        <tr key={f.feature_key} className="border-b border-white/10 hover:bg-white/[0.04]">
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-white">{f.name}</div>
                            <div className="text-[11px] font-mono text-white/45">{f.feature_key}</div>
                          </td>
                          {orderedPlans.map((p) => (
                            <td key={`${p.plan_key}-${f.feature_key}`} className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/30 bg-white/10 text-amber-400 focus:ring-amber-300/50"
                                checked={!!draft[p.plan_key]?.[f.feature_key]}
                                onChange={() => toggle(p.plan_key, f.feature_key)}
                                aria-label={`${p.plan_key} — ${f.feature_key}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}
