import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'

type TierRow = {
  min_employees: number
  max_employees: number
  price: number
  sort_order: number
}

function defaultTiers(): TierRow[] {
  return [
    { min_employees: 1, max_employees: 30, price: 65000, sort_order: 10 },
    { min_employees: 31, max_employees: 50, price: 74000, sort_order: 20 },
    { min_employees: 51, max_employees: 100, price: 85000, sort_order: 30 },
    { min_employees: 101, max_employees: 200, price: 97450, sort_order: 40 },
  ]
}

export default function VentasConfigPage() {
  const { addNotification } = useNotificationContext()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)

  const [currency, setCurrency] = useState<'HNL' | 'USD' | 'GTQ'>('HNL')
  const [couponCode, setCouponCode] = useState('gastro2026')
  const [discountPct, setDiscountPct] = useState(0.45)
  const [tiers, setTiers] = useState<TierRow[]>(defaultTiers())

  const discountPctText = useMemo(() => `${Math.round((Number(discountPct) || 0) * 100)}%`, [discountPct])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ventas-config', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar config')

      const cfg = data?.config
      const rows = Array.isArray(data?.tiers) ? data.tiers : []

      if (cfg) {
        setCurrency((cfg.currency || 'HNL').toUpperCase())
        setCouponCode(cfg.coupon_code || 'gastro2026')
        setDiscountPct(Number(cfg.coupon_discount_pct ?? 0.45))
      }

      if (rows.length > 0) {
        setTiers(
          rows.map((r: any, idx: number) => ({
            min_employees: Number(r.min_employees) || 1,
            max_employees: Number(r.max_employees) || 1,
            price: Number(r.price) || 0,
            sort_order: Number(r.sort_order) || (idx + 1) * 10,
          }))
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
    setTiers((prev) => [
      ...prev,
      { min_employees: 201, max_employees: 250, price: 100000, sort_order: (prev.length + 1) * 10 },
    ])
  }

  const removeTier = (idx: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== idx))
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/ventas-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currency,
          coupon_code: couponCode,
          coupon_discount_pct: discountPct,
          tiers,
        }),
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
    setCreating(true)
    try {
      const res = await fetch('/api/admin/ventas-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currency,
          coupon_code: couponCode,
          coupon_discount_pct: discountPct,
          tiers,
        }),
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
                <p className="text-white/70">Edita rangos, precios y cupón sin deploy.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => load()} variant="outline" className="border-white/30 text-white hover:bg-white/10" disabled={loading || saving || creating}>
                  Recargar
                </Button>
                <Button onClick={save} disabled={loading || saving || creating}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </Button>
                <Button
                  onClick={createNewVersion}
                  disabled={loading || saving || creating}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  {creating ? 'Creando…' : 'Crear nueva versión (activar)'}
                </Button>
              </div>
            </div>

            <Card variant="liquid" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Parámetros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-white/70 text-sm">Cargando…</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-white/80 mb-1">Moneda</label>
                      <select
                        className="input-glass w-full text-white"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                      >
                        <option value="HNL" className="bg-slate-800">HNL</option>
                        <option value="USD" className="bg-slate-800">USD</option>
                        <option value="GTQ" className="bg-slate-800">GTQ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-white/80 mb-1">Cupón</label>
                      <input
                        className="input-glass w-full text-white placeholder:text-white/50"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="gastro2026"
                      />
                      <p className="text-xs text-white/50 mt-1">Se valida case-insensitive.</p>
                    </div>
                    <div>
                      <label className="block text-sm text-white/80 mb-1">Descuento (0–1)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        className="input-glass w-full text-white placeholder:text-white/50"
                        value={discountPct}
                        onChange={(e) => setDiscountPct(Number(e.target.value))}
                      />
                      <p className="text-xs text-white/50 mt-1">Vista: {discountPctText}</p>
                    </div>
                  </div>
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
                  disabled={loading || saving || creating}
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
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-[120px_120px_1fr_140px] gap-3 items-end border border-white/10 rounded-lg p-4 bg-white/5">
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Min</label>
                          <input
                            type="number"
                            min={1}
                            className="input-glass w-full text-white"
                            value={t.min_employees}
                            onChange={(e) => updateTier(idx, { min_employees: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Max</label>
                          <input
                            type="number"
                            min={1}
                            className="input-glass w-full text-white"
                            value={t.max_employees}
                            onChange={(e) => updateTier(idx, { max_employees: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Precio</label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            className="input-glass w-full text-white"
                            value={t.price}
                            onChange={(e) => updateTier(idx, { price: Number(e.target.value) })}
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
                      Los rangos no pueden traslaparse. Ejemplo recomendado: 1–30, 31–50, 51–100, 101–200.
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

