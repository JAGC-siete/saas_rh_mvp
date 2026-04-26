import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import SuperAdminLayout from '../../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { useNotificationContext } from '../../../../components/NotificationProvider'
import {
  COMMERCIAL_PLAN_LABELS,
  COMMERCIAL_PLAN_TYPES,
  COMMERCIAL_TO_INTERNAL,
  type CommercialPlanType,
} from '../../../../lib/billing/plans'
import { Loader2, RotateCcw, Save, ShieldCheck, ShieldOff } from 'lucide-react'

interface EffectiveFeature {
  feature_key: string
  feature_name: string
  is_enabled: boolean
  has_override: boolean
  override_reason: string | null
}

interface FeaturesResponse {
  success: boolean
  company_id: string
  plan: { commercial: string; internal_key: string }
  features: Array<{ feature_key: string; name: string; description: string | null }>
  effective: EffectiveFeature[]
  overrides: Array<{ feature_key: string; is_enabled: boolean; reason: string | null; updated_at: string }>
}

export default function CompanyDetailPage() {
  const router = useRouter()
  const { id, edit } = router.query
  const { addNotification } = useNotificationContext()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [company, setCompany] = useState<any>(null)
  const [features, setFeatures] = useState<FeaturesResponse | null>(null)
  const [savingFeature, setSavingFeature] = useState<string | null>(null)

  const isEdit = useMemo(() => edit === '1', [edit])
  const companyId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined

  const [form, setForm] = useState<{
    name: string
    subdomain: string
    plan_type: CommercialPlanType
    is_active: boolean
  }>({
    name: '',
    subdomain: '',
    plan_type: 'basic',
    is_active: true,
  })

  const loadFeatures = useCallback(async () => {
    if (!companyId) return
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/features`, { credentials: 'include' })
      const data = (await res.json()) as FeaturesResponse
      if (!res.ok) throw new Error((data as any)?.error || 'Error cargando módulos')
      setFeatures(data)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Módulos', message: err.message || 'Error cargando módulos' })
    }
  }, [companyId, addNotification])

  const loadCompany = useCallback(async () => {
    if (!companyId) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/companies/${companyId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error cargando empresa')
      const data = await res.json()
      setCompany(data.company)
    } catch (err: any) {
      setError(err.message || 'Error cargando empresa')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadCompany()
    loadFeatures()
  }, [loadCompany, loadFeatures])

  useEffect(() => {
    if (!company) return
    const planRaw = String(company.plan_type || 'basic').toLowerCase()
    const plan = (COMMERCIAL_PLAN_TYPES as readonly string[]).includes(planRaw)
      ? (planRaw as CommercialPlanType)
      : 'basic'
    setForm({
      name: company.name || '',
      subdomain: company.subdomain || '',
      plan_type: plan,
      is_active: !!company.is_active,
    })
  }, [company])

  const save = async () => {
    if (!companyId || !company) return
    // Build a diff payload so untouched legacy values (e.g. subdomain with uppercase
    // or underscore) don't trip the server-side validators.
    const originalPlan = String(company.plan_type || 'basic').toLowerCase()
    const payload: Record<string, unknown> = {}
    if (form.name !== (company.name || '')) payload.name = form.name
    if (form.subdomain !== (company.subdomain || '')) payload.subdomain = form.subdomain
    if (form.plan_type !== originalPlan) payload.plan_type = form.plan_type
    if (form.is_active !== !!company.is_active) payload.is_active = form.is_active

    if (Object.keys(payload).length === 0) {
      addNotification({ type: 'info', title: 'Sin cambios', message: 'No hay cambios por guardar' })
      return
    }

    try {
      setError(null)
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error actualizando')
      setCompany(data.company)
      addNotification({ type: 'success', title: 'Empresa actualizada', message: 'Cambios guardados' })
      await loadFeatures()
    } catch (err: any) {
      setError(err.message || 'Error actualizando')
      addNotification({ type: 'error', title: 'Error', message: err.message || 'Error actualizando' })
    }
  }

  const toggleActive = async () => {
    if (!companyId || !company) return
    try {
      setError(null)
      const next = !company.is_active
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error actualizando estado')
      setCompany(data.company)
    } catch (err: any) {
      setError(err.message || 'Error actualizando estado')
    }
  }

  const setOverride = async (feature_key: string, is_enabled: boolean) => {
    if (!companyId) return
    setSavingFeature(feature_key)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'set', feature_key, is_enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error aplicando override')
      await loadFeatures()
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Override', message: err.message || 'Error aplicando override' })
    } finally {
      setSavingFeature(null)
    }
  }

  const clearOverride = async (feature_key: string) => {
    if (!companyId) return
    setSavingFeature(feature_key)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'clear', feature_key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error quitando override')
      await loadFeatures()
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Override', message: err.message || 'Error quitando override' })
    } finally {
      setSavingFeature(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="glass border border-white/20 rounded-lg shadow-2xl p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando...</p>
        </div>
      </div>
    )
  }

  const internalPlan = features?.plan?.internal_key || COMMERCIAL_TO_INTERNAL[form.plan_type]

  return (
    <>
      <Head>
        <title>Empresa - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <Button variant="outline" onClick={() => router.back()} className="border-white/30 text-white hover:bg-white/10">
              ← Volver
            </Button>

            {error && (
              <Card variant="glass" className="border-red-400/40 bg-red-500/10">
                <CardContent className="pt-4 text-red-100 text-sm">{error}</CardContent>
              </Card>
            )}

            {company && (
              <Card variant="glass" className="border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Empresa</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEdit ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Nombre</label>
                        <input
                          className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Subdominio</label>
                        <input
                          className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                          value={form.subdomain}
                          onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Plan</label>
                        <select
                          className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                          value={form.plan_type}
                          onChange={(e) => setForm({ ...form, plan_type: e.target.value as CommercialPlanType })}
                        >
                          {COMMERCIAL_PLAN_TYPES.map((p) => (
                            <option key={p} value={p} className="bg-slate-800">
                              {COMMERCIAL_PLAN_LABELS[p]} ({p})
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[11px] text-white/50">
                          Mapea a plan interno <span className="font-mono text-amber-200/90">{COMMERCIAL_TO_INTERNAL[form.plan_type]}</span>.
                          Los módulos base se administran en{' '}
                          <Link href="/app/admin/plan-features" className="underline decoration-dotted hover:text-amber-200">
                            Planes y módulos
                          </Link>.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="is_active"
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 text-amber-300 focus:ring-amber-300/50"
                        />
                        <label htmlFor="is_active" className="text-sm">Activa</label>
                      </div>
                      <div className="md:col-span-2">
                        <Button onClick={save}>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-white/80 space-y-1">
                        <div><b>Nombre:</b> {company.name}</div>
                        <div><b>Subdominio:</b> {company.subdomain || '—'}</div>
                        <div>
                          <b>Plan:</b> {COMMERCIAL_PLAN_LABELS[(company.plan_type || '').toLowerCase() as CommercialPlanType] || company.plan_type}
                          <span className="ml-2 text-[11px] font-mono text-white/50">
                            (interno: {internalPlan})
                          </span>
                        </div>
                        <div><b>Estado:</b> {company.is_active ? 'Activa' : 'Inactiva'}</div>
                        <div><b>Empleados:</b> {company.employee_count ?? 0}</div>
                        <div><b>Usuarios:</b> {company.user_count ?? 0}</div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" onClick={() => router.push(`/app/admin/companies/${companyId}?edit=1`)} className="border-white/30 text-white hover:bg-white/10">
                          Editar
                        </Button>
                        <Button variant="outline" onClick={toggleActive} className="border-white/30 text-white hover:bg-white/10">
                          {company?.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {features && (
              <Card variant="glass" className="border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Módulos efectivos</CardTitle>
                  <p className="text-xs text-white/60 mt-1">
                    Acceso resuelto por <span className="font-mono">has_feature()</span>: override por empresa gana sobre el plan asignado.
                    Plan actual: <span className="font-mono text-amber-200/90">{features.plan.commercial}</span> → interno{' '}
                    <span className="font-mono text-amber-200/90">{features.plan.internal_key}</span>.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="border-b border-white/15 text-left text-white/70">
                          <th className="py-2.5 px-3 font-medium w-[260px]">Módulo</th>
                          <th className="py-2.5 px-3 font-medium">Origen</th>
                          <th className="py-2.5 px-3 font-medium text-center">Efectivo</th>
                          <th className="py-2.5 px-3 font-medium text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.effective.map((f) => {
                          const busy = savingFeature === f.feature_key
                          return (
                            <tr key={f.feature_key} className="border-b border-white/10 hover:bg-white/[0.04]">
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-white">{f.feature_name}</div>
                                <div className="text-[11px] font-mono text-white/45">{f.feature_key}</div>
                              </td>
                              <td className="py-2 px-3 text-xs text-white/70">
                                {f.has_override ? (
                                  <span className="inline-flex items-center gap-1 text-amber-200">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Override empresa
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-white/60">
                                    <ShieldOff className="h-3.5 w-3.5" />
                                    Plan {features.plan.internal_key}
                                  </span>
                                )}
                                {f.override_reason && (
                                  <div className="text-[11px] text-white/50 mt-0.5">“{f.override_reason}”</div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={
                                    'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ' +
                                    (f.is_enabled
                                      ? 'bg-emerald-500/15 text-emerald-100 border-emerald-300/40'
                                      : 'bg-red-500/15 text-red-100 border-red-300/40')
                                  }
                                >
                                  {f.is_enabled ? 'Habilitado' : 'Bloqueado'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-white/30 text-white hover:bg-white/10"
                                    disabled={busy}
                                    onClick={() => setOverride(f.feature_key, !f.is_enabled)}
                                  >
                                    {busy ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : f.is_enabled ? (
                                      'Forzar off'
                                    ) : (
                                      'Forzar on'
                                    )}
                                  </Button>
                                  {f.has_override && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-amber-300/40 text-amber-100 hover:bg-amber-500/20"
                                      disabled={busy}
                                      onClick={() => clearOverride(f.feature_key)}
                                    >
                                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                      Usar plan
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}
