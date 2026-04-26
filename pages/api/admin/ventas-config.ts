import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../lib/auth/api-auth-fixed'

type TierInput = { min_employees: number; max_employees: number; price: number; sort_order?: number }

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function asNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : NaN
}

function validateTiers(tiers: TierInput[]): { ok: boolean; error?: string } {
  if (!Array.isArray(tiers) || tiers.length === 0) return { ok: false, error: 'Debe incluir al menos un rango.' }

  for (const t of tiers) {
    const min = Math.trunc(asNumber(t.min_employees))
    const max = Math.trunc(asNumber(t.max_employees))
    const price = asNumber(t.price)

    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(price)) {
      return { ok: false, error: 'Rangos inválidos: min/max/precio deben ser numéricos.' }
    }
    if (min < 1 || max < min) return { ok: false, error: 'Rangos inválidos: min>=1 y max>=min.' }
    if (price <= 0) return { ok: false, error: 'El precio debe ser mayor a 0.' }
  }

  // Prevent overlap by sorting and ensuring gaps are ok
  const sorted = [...tiers].sort((a, b) => asNumber(a.min_employees) - asNumber(b.min_employees))
  for (let i = 1; i < sorted.length; i++) {
    const prevMax = Math.trunc(asNumber(sorted[i - 1].max_employees))
    const nextMin = Math.trunc(asNumber(sorted[i].min_employees))
    if (nextMin <= prevMax) {
      return { ok: false, error: 'Los rangos no pueden traslaparse.' }
    }
  }

  return { ok: true }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST', 'PATCH'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  await requireSuperAdmin(req, res)

  const supabase = createAdminClient()

  if (req.method === 'GET') {
    const { data: configRow, error: cfgErr } = await (supabase as any)
      .from('config_ventas')
      .select('id, is_active, currency, coupon_code, coupon_discount_pct, created_at, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cfgErr) return res.status(500).json({ error: 'Error leyendo config_ventas' })
    if (!configRow) return res.status(200).json({ config: null, tiers: [] })

    const { data: tiers, error: tiersErr } = await (supabase as any)
      .from('config_ventas_pricing_tiers')
      .select('id, min_employees, max_employees, price, is_active, sort_order, updated_at')
      .eq('config_id', configRow.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (tiersErr) return res.status(500).json({ error: 'Error leyendo tiers' })
    return res.status(200).json({ config: configRow, tiers: tiers || [] })
  }

  const currency = asString((req.body || {}).currency || 'HNL').trim().toUpperCase()
  const coupon_code = asString((req.body || {}).coupon_code).trim()
  const coupon_discount_pct = (req.body || {}).coupon_discount_pct
  const discount = coupon_discount_pct === null || coupon_discount_pct === undefined ? null : asNumber(coupon_discount_pct)
  const tiersInput: TierInput[] = Array.isArray((req.body || {}).tiers) ? (req.body || {}).tiers : []

  if (!['HNL', 'USD', 'GTQ'].includes(currency)) {
    return res.status(400).json({ error: 'Moneda inválida. Use HNL, USD o GTQ.' })
  }
  if (discount !== null && (!Number.isFinite(discount) || discount < 0 || discount > 1)) {
    return res.status(400).json({ error: 'El descuento debe ser un decimal entre 0 y 1 (ej. 0.45).' })
  }

  const tiersValidation = validateTiers(tiersInput)
  if (!tiersValidation.ok) return res.status(400).json({ error: tiersValidation.error })

  if (req.method === 'POST') {
    // Create new active config (versioning) and deactivate previous
    const { data: prev } = await (supabase as any)
      .from('config_ventas')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (Array.isArray(prev) && prev.length > 0) {
      await (supabase as any).from('config_ventas').update({ is_active: false }).in('id', prev.map((r: any) => r.id))
    }

    const { data: cfg, error: cfgErr } = await (supabase as any)
      .from('config_ventas')
      .insert({
        is_active: true,
        currency,
        coupon_code: coupon_code || null,
        coupon_discount_pct: discount,
      })
      .select('id')
      .single()

    if (cfgErr) return res.status(500).json({ error: 'No se pudo crear config_ventas' })

    const config_id = cfg.id
    const rows = tiersInput.map((t, i) => ({
      config_id,
      min_employees: Math.trunc(asNumber(t.min_employees)),
      max_employees: Math.trunc(asNumber(t.max_employees)),
      price: asNumber(t.price),
      is_active: true,
      sort_order: Number.isFinite(asNumber(t.sort_order)) ? Math.trunc(asNumber(t.sort_order)) : (i + 1) * 10,
    }))

    const { error: tiersErr } = await (supabase as any).from('config_ventas_pricing_tiers').insert(rows)
    if (tiersErr) return res.status(500).json({ error: 'No se pudieron crear los tiers' })

    return res.status(200).json({ success: true, config_id })
  }

  // PATCH: update active config and replace tiers
  const { data: active, error: activeErr } = await (supabase as any)
    .from('config_ventas')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activeErr) return res.status(500).json({ error: 'Error leyendo config activa' })
  if (!active) return res.status(404).json({ error: 'No existe config activa' })

  const config_id = active.id

  const { error: updErr } = await (supabase as any)
    .from('config_ventas')
    .update({
      currency,
      coupon_code: coupon_code || null,
      coupon_discount_pct: discount,
    })
    .eq('id', config_id)

  if (updErr) return res.status(500).json({ error: 'No se pudo actualizar la configuración' })

  // Deactivate existing tiers then insert new ones
  await (supabase as any)
    .from('config_ventas_pricing_tiers')
    .update({ is_active: false })
    .eq('config_id', config_id)

  const rows = tiersInput.map((t, i) => ({
    config_id,
    min_employees: Math.trunc(asNumber(t.min_employees)),
    max_employees: Math.trunc(asNumber(t.max_employees)),
    price: asNumber(t.price),
    is_active: true,
    sort_order: Number.isFinite(asNumber(t.sort_order)) ? Math.trunc(asNumber(t.sort_order)) : (i + 1) * 10,
  }))

  const { error: tiersErr } = await (supabase as any).from('config_ventas_pricing_tiers').insert(rows)
  if (tiersErr) return res.status(500).json({ error: 'No se pudieron actualizar los tiers' })

  return res.status(200).json({ success: true, config_id })
}

