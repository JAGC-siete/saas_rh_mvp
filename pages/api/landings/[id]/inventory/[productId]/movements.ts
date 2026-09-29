/**
 * Entrada o salida de una unidad. El saldo lo escribe inventory_apply_movement.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../../../../lib/logger'
import { parseLandingIdParam, requireLandingAdmin } from '../../../../../../lib/landings/admin-auth'
import { inventoryMovementSchema } from '../../../../../../lib/landings/inventory-schema'
import { applyInventoryMovement, loadInventoryLanding } from '../../../../../../lib/landings/inventory-server'

const PRODUCT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const auth = await requireLandingAdmin(req, res)
  if (!auth) return

  const landingId = parseLandingIdParam(req)
  const rawProduct = req.query.productId
  const productId = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct
  if (!landingId || !productId || !PRODUCT_ID_RE.test(productId)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const parsed = inventoryMovementSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'El movimiento es +1 o -1.' })

  const { supabase, adminClient, user } = auth
  const loaded = await loadInventoryLanding(supabase, landingId)
  if (loaded.error) return res.status(500).json({ error: 'No se pudo mover el stock' })
  if (!loaded.landing) return res.status(404).json({ error: 'Landing no encontrada' })

  const moved = await applyInventoryMovement(adminClient, productId, landingId, parsed.data.delta, user.id)
  if (moved.error || !moved.product) {
    if (moved.status >= 500) {
      logger.error('Error aplicando movimiento de inventario', { landingId, productId, error: moved.error })
    }
    return res.status(moved.status).json({ error: moved.error })
  }

  return res.status(200).json({ product: moved.product })
}
