/**
 * Edición y borrado de un producto. El saldo no se acepta en este cuerpo.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../../../lib/logger'
import { parseLandingIdParam, requireLandingAdmin } from '../../../../../lib/landings/admin-auth'
import { updateInventoryProductSchema } from '../../../../../lib/landings/inventory-schema'
import { toInventoryProductView, type InventoryProductRow } from '../../../../../lib/landings/inventory'
import { INVENTORY_PRODUCTS_TABLE, loadInventoryLanding } from '../../../../../lib/landings/inventory-server'

const UNIQUE_VIOLATION = '23505'
const PRODUCT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function productIdOf(req: NextApiRequest): string | null {
  const raw = req.query.productId
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id || !PRODUCT_ID_RE.test(id)) return null
  return id
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireLandingAdmin(req, res)
  if (!auth) return

  const landingId = parseLandingIdParam(req)
  const productId = productIdOf(req)
  if (!landingId || !productId) return res.status(400).json({ error: 'Identificador inválido' })

  const { supabase } = auth
  const loaded = await loadInventoryLanding(supabase, landingId)
  if (loaded.error) return res.status(500).json({ error: 'No se pudo cargar el inventario' })
  if (!loaded.landing) return res.status(404).json({ error: 'Landing no encontrada' })

  if (req.method === 'PATCH') {
    if (req.body && typeof req.body === 'object' && ('stockActual' in req.body || 'stock_actual' in req.body)) {
      return res.status(400).json({ error: 'El saldo se cambia con un movimiento.' })
    }

    const parsed = updateInventoryProductSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' })
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.nombre !== undefined) patch.nombre = parsed.data.nombre
    if (parsed.data.sku !== undefined) patch.sku = parsed.data.sku
    if (parsed.data.precio !== undefined) patch.precio = parsed.data.precio
    if (parsed.data.stockMinimo !== undefined) patch.stock_minimo = parsed.data.stockMinimo

    const { data, error } = await supabase
      .from(INVENTORY_PRODUCTS_TABLE)
      .update(patch)
      .eq('id', productId)
      .eq('landing_id', landingId)
      .select('id, nombre, sku, precio, stock_actual, stock_minimo')
      .maybeSingle()

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return res.status(409).json({ error: 'Ese SKU ya existe en esta página.' })
      }
      logger.error('Error editando producto de inventario', { landingId, productId, error: error.message })
      return res.status(500).json({ error: 'No se pudo guardar el producto' })
    }
    if (!data) return res.status(404).json({ error: 'Producto no encontrado' })
    return res.status(200).json({ product: toInventoryProductView(data as InventoryProductRow) })
  }

  if (req.method === 'DELETE') {
    const { data, error } = await supabase
      .from(INVENTORY_PRODUCTS_TABLE)
      .delete()
      .eq('id', productId)
      .eq('landing_id', landingId)
      .select('id')
      .maybeSingle()

    if (error) {
      logger.error('Error borrando producto de inventario', { landingId, productId, error: error.message })
      return res.status(500).json({ error: 'No se pudo borrar el producto' })
    }
    if (!data) return res.status(404).json({ error: 'Producto no encontrado' })
    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', 'PATCH, DELETE')
  return res.status(405).json({ error: 'Método no permitido' })
}
