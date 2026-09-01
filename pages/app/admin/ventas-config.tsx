import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import {
  DEFAULT_VENTAS_BUSINESS_RULES,
  mergeVentasBusinessRules,
  resolveHardwareMode,
  type VentasAnnualTerminalMode,
  type VentasBusinessRules,
} from '../../../lib/ventas/business-rules'
import { normalizeCouponCode, sortVentasTiersByEmployees } from '../../../lib/ventas/pricing'
import { FALLBACK_VENTAS_TIERS } from '../../../lib/ventas/load-ventas-config'

type TierRow = {
  min_employees: number
  max_employees: number
  price: number
  sort_order: number
  annual_terminal_mode: VentasAnnualTerminalMode
  included_terminals_max: number | ''
}

type PromoRow = {
  code: string
  discount_pct: number
  label: string
  sort_order: number
}

function defaultTiers(): TierRow[] {
  return FALLBACK_VENTAS_TIERS.map((t, idx) => ({
    min_employees: t.min_employees,
    max_employees: t.max_employees,
    price: t.price,
    sort_order: t.sort_order ?? (idx + 1) * 10,
    annual_terminal_mode: t.annual_terminal_mode ?? 'auto',
    included_terminals_max: t.included_terminals_max ?? '',
  }))
}

function defaultPromos(): PromoRow[] {
  return [{ code: 'gastro2026', discount_pct: 0.45, label: '', sort_order: 10 }]
}

function defaultRules(): VentasBusinessRules {
  return mergeVentasBusinessRules(DEFAULT_VENTAS_BUSINESS_RULES)
}

export default function VentasConfigPage() {
  const { addNotification } = useNotificationContext()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)

  const [currency, setCurrency] = useState<'HNL' | 'USD' | 'GTQ'>('HNL')
  const [promoCodes, setPromoCodes] = useState<PromoRow[]>(defaultPromos())
  const [tiers, setTiers] = useState<TierRow[]>(defaultTiers())
  const [businessRules, setBusinessRules] = useState<VentasBusinessRules>(defaultRules)

  const duplicatePromoNorms = useMemo(() => {
    const seen = new Set<string>()
    const dups = new Set<string>()
    for (const p of promoCodes) {
      const n = normalizeCouponCode(p.code)
      if (!n) continue
      if (seen.has(n)) dups.add(n)
      else seen.add(n)
    }
    return dups
  }, [promoCodes])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ventas-config', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar config')

      const cfg = data?.config
      const rows = Array.isArray(data?.tiers) ? data.tiers : []
      const promos = Array.isArray(data?.promo_codes) ? data.promo_codes : []

      if (cfg) {
        setCurrency((cfg.currency || 'HNL').toUpperCase())
      }

      setBusinessRules(mergeVentasBusinessRules(data?.business_rules || cfg?.business_rules))

      if (promos.length > 0) {
        setPromoCodes(
          promos.map((p: any, idx: number) => ({
            code: String(p.code || ''),
            discount_pct: Number(p.discount_pct ?? 0),
            label: String(p.label || ''),
            sort_order: Number(p.sort_order) || (idx + 1) * 10,
          }))
        )
      } else if (cfg?.coupon_code) {
        setPromoCodes([
          {
            code: cfg.coupon_code,
            discount_pct: Number(cfg.coupon_discount_pct ?? 0),
            label: '',
            sort_order: 10,
          },
        ])
      }

      if (rows.length > 0) {
        setTiers(
          sortVentasTiersByEmployees(
            rows.map((r: any, idx: number) => ({
              min_employees: Number(r.min_employees) || 1,
              max_employees: Number(r.max_employees) || 1,
              price: Number(r.price) || 0,
              sort_order: Number(r.sort_order) || (idx + 1) * 10,
              annual_terminal_mode: (['auto', 'included', 'sale'].includes(r.annual_terminal_mode)
                ? r.annual_terminal_mode
                : 'auto') as VentasAnnualTerminalMode,
              included_terminals_max:
                r.included_terminals_max == null || r.included_terminals_max === ''
                  ? ''
                  : Number(r.included_terminals_max),
            }))
          )
        )
      }
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Error', message: e?.message || 'No se pudo cargar' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateTier = (idx: number, patch: Partial<TierRow>) => {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }

  const addTier = () => {
    setTiers((prev) => {
      const last = prev[prev.length - 1]
      const min = (last?.max_employees || 200) + 1
      return [
        ...prev,
        {
          min_employees: min,
          max_employees: min + 49,
          price: 100000,
          sort_order: (prev.length + 1) * 10,
          annual_terminal_mode: 'auto',
          included_terminals_max: '',
        },
      ]
    })
  }

  const removeTier = (idx: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== idx))
  }

  const updatePromo = (idx: number, patch: Partial<PromoRow>) => {
    setPromoCodes((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  const addPromo = () => {
    setPromoCodes((prev) => [
      ...prev,
      { code: '', discount_pct: 0.1, label: '', sort_order: (prev.length + 1) * 10 },
    ])
  }

  const removePromo = (idx: number) => {
    setPromoCodes((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateRules = (patch: Partial<VentasBusinessRules>) => {
    setBusinessRules((prev) => mergeVentasBusinessRules({ ...prev, ...patch }))
  }

  const updateContinuity = (patch: Partial<VentasBusinessRules['hardware_continuity']>) => {
    setBusinessRules((prev) =>
      mergeVentasBusinessRules({
        ...prev,
        hardware_continuity: { ...prev.hardware_continuity, ...patch },
      })
    )
  }

  const payload = () => ({
    currency,
    promo_codes: promoCodes,
    business_rules: businessRules,
    tiers: tiers.map((t) => ({
      ...t,
      included_terminals_max: t.included_terminals_max === '' ? null : Number(t.included_terminals_max),
    })),
  })

  const save = async () => {
    if (duplicatePromoNorms.size > 0) {
      addNotification({
        type: 'error',
        title: 'Cupones',
        message: 'Hay códigos de cupón duplicados. Cada código debe ser único.',
      })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/ventas-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar')
      addNotification({ type: 'success', title: 'Ventas', message: 'Configuración guardada' })
      await load()
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Error', message: e?.message || 'No se pudo guardar' })
    } finally {
      setSaving(false)
    }
  }

  const createNewVersion = async () => {
    if (duplicatePromoNorms.size > 0) {
      addNotification({
        type: 'error',
        title: 'Cupones',
        message: 'Hay códigos de cupón duplicados. Cada código debe ser único.',
      })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/ventas-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear')
      addNotification({ type: 'success', title: 'Ventas', message: 'Nueva configuración activa creada' })
      await load()
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Error', message: e?.message || 'No se pudo crear' })
    } finally {
      setCreating(false)
    }
  }

  const runtimePreviews = useMemo(() => {
    const samples = [8, 30, 80, 150, 250]
    return samples.map((emps) => {
      const tier = tiers.find((t) => emps >= t.min_employees && emps <= t.max_employees)
      const tierHints = tier
        ? {
            annual_terminal_mode: tier.annual_terminal_mode,
            included_terminals_max:
              tier.included_terminals_max === '' ? null : Number(tier.included_terminals_max),
          }
        : { annual_terminal_mode: 'auto' as const }
      const mode = resolveHardwareMode('annual', emps, {
        rules: businessRules,
        tier: tierHints,
      })
      const cap =
        tier?.included_terminals_max === '' || tier?.included_terminals_max == null
          ? null
          : Number(tier.included_terminals_max)
      const detail =
        mode === 'included' && cap != null
          ? `${mode} (hasta ${cap})`
          : mode === 'included'
            ? `${mode} (tope form ${businessRules.max_auto_quote_terminals})`
            : mode
      return { emps, mode: detail, hasTier: Boolean(tier) }
    })
  }, [businessRules, tiers])

  const busy = loading || saving || creating

  return (
    <>
      <Head>
        <title>Ventas - Configuración</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Landing /ventas</p>
                <h1 className="text-3xl font-semibold text-white">Configuración de Ventas</h1>
                <p className="text-white/70">
                  Rangos, cupones, modalidades y terminales — sin deploy.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => load()}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  disabled={busy}
                >
                  Recargar
                </Button>
                <Button onClick={save} disabled={busy || duplicatePromoNorms.size > 0}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </Button>
                <Button
                  onClick={createNewVersion}
                  disabled={busy || duplicatePromoNorms.size > 0}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  {creating ? 'Creando…' : 'Crear nueva versión (activar)'}
                </Button>
              </div>
            </div>

            <Card variant="liquid" className="border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Cupones promocionales</CardTitle>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={addPromo}
                  disabled={busy}
                >
                  + Agregar cupón
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-white/70 text-sm">Cargando…</div>
                ) : (
                  <>
                    <div className="max-w-xs">
                      <label className="block text-sm text-white/80 mb-1">Moneda</label>
                      <select
                        className="input-glass w-full text-white"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as 'HNL' | 'USD' | 'GTQ')}
                      >
                        <option value="HNL" className="bg-slate-800">
                          HNL
                        </option>
                        <option value="USD" className="bg-slate-800">
                          USD
                        </option>
                        <option value="GTQ" className="bg-slate-800">
                          GTQ
                        </option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      {promoCodes.map((p, idx) => {
                        const norm = normalizeCouponCode(p.code)
                        const isDup = !!norm && duplicatePromoNorms.has(norm)
                        return (
                          <div
                            key={idx}
                            className="grid grid-cols-1 md:grid-cols-[1fr_140px_1fr_100px] gap-3 items-end border border-white/10 rounded-lg p-4 bg-white/5"
                          >
                            <div>
                              <label className="block text-xs text-white/70 mb-1">Código</label>
                              <input
                                className={`input-glass w-full text-white placeholder:text-white/50 ${isDup ? 'border-red-400' : ''}`}
                                value={p.code}
                                onChange={(e) => updatePromo(idx, { code: e.target.value })}
                                placeholder="aghas"
                              />
                              <p className="text-xs text-white/50 mt-1">
                                Case-insensitive.{' '}
                                {isDup ? (
                                  <span className="text-red-300">Duplicado.</span>
                                ) : null}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs text-white/70 mb-1">Descuento (0–1)</label>
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                max={1}
                                className="input-glass w-full text-white"
                                value={p.discount_pct}
                                onChange={(e) =>
                                  updatePromo(idx, { discount_pct: Number(e.target.value) })
                                }
                              />
                              <p className="text-xs text-white/50 mt-1">
                                Vista: {Math.round((Number(p.discount_pct) || 0) * 100)}%
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs text-white/70 mb-1">
                                Etiqueta interna (opcional)
                              </label>
                              <input
                                className="input-glass w-full text-white placeholder:text-white/50"
                                value={p.label}
                                onChange={(e) => updatePromo(idx, { label: e.target.value })}
                                placeholder="Campaña gastro"
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                className="border-white/30 text-white hover:bg-white/10"
                                onClick={() => removePromo(idx)}
                                disabled={promoCodes.length <= 1}
                              >
                                Quitar
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-white/60">
                      El formulario en /ventas valida el código ingresado contra esta lista.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card variant="liquid" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Modalidades y hardware</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-white/70 text-sm">Cargando…</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-white/70 mb-1">
                          Min. empleados plan mensual
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="input-glass w-full text-white"
                          value={businessRules.monthly_min_employees}
                          onChange={(e) =>
                            updateRules({ monthly_min_employees: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">
                          Umbral anual → terminales incluidas (modo Auto)
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="input-glass w-full text-white"
                          value={businessRules.annual_terminals_included_min_employees}
                          onChange={(e) =>
                            updateRules({
                              annual_terminals_included_min_employees: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">
                          Máx. terminales cotización web
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="input-glass w-full text-white"
                          value={businessRules.max_auto_quote_terminals}
                          onChange={(e) =>
                            updateRules({ max_auto_quote_terminals: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">
                          Precio venta unitario terminal
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input-glass w-full text-white"
                          value={businessRules.hardware_sale_unit_price}
                          onChange={(e) =>
                            updateRules({ hardware_sale_unit_price: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">
                          Continuidad: cuota base (1ª)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input-glass w-full text-white"
                          value={businessRules.hardware_continuity.base_monthly}
                          onChange={(e) =>
                            updateContinuity({ base_monthly: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">
                          Continuidad: descuento incremental
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input-glass w-full text-white"
                          value={businessRules.hardware_continuity.incremental_discount}
                          onChange={(e) =>
                            updateContinuity({ incremental_discount: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">
                          Continuidad: piso mensual
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input-glass w-full text-white"
                          value={businessRules.hardware_continuity.floor_monthly}
                          onChange={(e) =>
                            updateContinuity({ floor_monthly: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80 space-y-1">
                      <p className="text-xs uppercase tracking-wide text-white/50">
                        Preview runtime (reglas + rango)
                      </p>
                      {runtimePreviews.map((p) => (
                        <p key={p.emps}>
                          {p.emps} empleados · anual →{' '}
                          <span className="text-white font-medium">{p.mode}</span>
                          {!p.hasTier ? (
                            <span className="text-amber-300/80"> · sin rango</span>
                          ) : null}
                        </p>
                      ))}
                      <p className="text-xs text-white/50">
                        Mensual siempre usa continuidad. Override por rango gana sobre umbral
                        Auto. Form máx. terminales = «Máx. terminales cotización web».
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card variant="liquid" className="border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Rangos y precios</CardTitle>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={addTier}
                  disabled={busy}
                >
                  + Agregar rango
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-white/70 text-sm">Cargando…</div>
                ) : (
                  <div className="space-y-3">
                    {tiers.map((t, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 md:grid-cols-[100px_100px_1fr_180px_120px_100px] gap-3 items-end border border-white/10 rounded-lg p-4 bg-white/5"
                      >
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Min</label>
                          <input
                            type="number"
                            min={1}
                            className="input-glass w-full text-white"
                            value={t.min_employees}
                            onChange={(e) =>
                              updateTier(idx, { min_employees: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Max</label>
                          <input
                            type="number"
                            min={1}
                            className="input-glass w-full text-white"
                            value={t.max_employees}
                            onChange={(e) =>
                              updateTier(idx, { max_employees: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Precio anual</label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            className="input-glass w-full text-white"
                            value={t.price}
                            onChange={(e) => updateTier(idx, { price: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/70 mb-1">
                            Terminales (anual)
                          </label>
                          <select
                            className="input-glass w-full text-white"
                            value={t.annual_terminal_mode}
                            onChange={(e) =>
                              updateTier(idx, {
                                annual_terminal_mode: e.target.value as VentasAnnualTerminalMode,
                              })
                            }
                          >
                            <option value="auto" className="bg-slate-800">
                              Auto (umbral global)
                            </option>
                            <option value="included" className="bg-slate-800">
                              Incluidas
                            </option>
                            <option value="sale" className="bg-slate-800">
                              Venta aparte
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Hasta N (opc.)</label>
                          <input
                            type="number"
                            min={1}
                            placeholder={String(businessRules.max_auto_quote_terminals)}
                            className="input-glass w-full text-white placeholder:text-white/40"
                            value={t.included_terminals_max}
                            disabled={t.annual_terminal_mode === 'sale'}
                            onChange={(e) =>
                              updateTier(idx, {
                                included_terminals_max:
                                  e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            className="border-white/30 text-white hover:bg-white/10"
                            onClick={() => removeTier(idx)}
                            disabled={tiers.length <= 1}
                          >
                            Quitar
                          </Button>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-white/60">
                      Los rangos no pueden traslaparse. “Hasta N” = cupo de terminales incluidas
                      sin cargo (modo Incluidas/Auto). El máximo seleccionable en el form es
                      «Máx. terminales cotización web». Vacío = todas incluidas hasta ese tope.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}
