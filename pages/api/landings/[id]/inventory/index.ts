/**
 * Lista y alta de productos de una landing, más el interruptor del módulo.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../../../lib/logger'
import { parseLandingIdParam, requireLandingAdmin } from '../../../../../lib/landings/admin-auth'
import { LANDING_PAGES_TABLE } from '../../../../../lib/landings/db'
import { createInventoryProductSchema, setInventoryEnabledSchema } from '../../../../../lib/landings/inventory-schema'
import {
  INVENTORY_PRODUCTS_TABLE,
  applyInventoryMovement,
  listInventoryProducts,
  loadInventoryLanding,
} from '../../../../../lib/landings/inventory-server'

const UNIQUE_VIOLATION = '23505'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireLandingAdmin(req, res)
  if (!auth) return

  const landingId = parseLandingIdParam(req)
  if (!landingId) return res.status(400).json({ error: 'Identificador inválido' })

  const { supabase, adminClient, user } = auth
  const loaded = await loadInventoryLanding(supabase, landingId)
  if (loaded.error) {
    logger.error('Error leyendo landing para inventario', { landingId, error: loaded.error })
    return res.status(500).json({ error: 'No se pudo cargar el inventario' })
  }
  if (!loaded.landing) return res.status(404).json({ error: 'Landing no encontrada' })

  if (req.method === 'GET') {
    const listed = await listInventoryProducts(supabase, landingId)
    if (listed.error) {
      logger.error('Error listando inventario', { landingId, error: listed.error })
      return res.status(500).json({ error: 'No se pudo cargar el inventario' })
    }
    return res.status(200).json({ enabled: loaded.landing.inventory_enabled, products: listed.products })
  }

  if (req.method === 'PATCH') {
    const parsed = setInventoryEnabledSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

    const { error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .update({ inventory_enabled: parsed.data.enabled, updated_by: user.id })
      .eq('id', landingId)

    if (error) {
      logger.error('Error cambiando inventario de la landing', { landingId, error: error.message })
      return res.status(500).json({ error: 'No se pudo actualizar' })
    }
    return res.status(200).json({ enabled: parsed.data.enabled })
  }

  if (req.method === 'POST') {
    const parsed = createInventoryProductSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' })
    }

    const { nombre, sku, precio, stockMinimo, stockInicial } = parsed.data
    const { data, error } = await supabase
      .from(INVENTORY_PRODUCTS_TABLE)
      .insert({
        landing_id: landingId,
        company_id: loaded.landing.company_id,
        nombre,
        sku,
        precio,
        stock_minimo: stockMinimo,
        stock_actual: 0,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return res.status(409).json({ error: 'Ese SKU ya existe en esta página.' })
      }
      logger.error('Error creando producto de inventario', { landingId, error: error.message })
      return res.status(500).json({ error: 'No se pudo crear el producto' })
    }

    const createdId = (data as { id: string }).id
    if (stockInicial && stockInicial > 0) {
      const moved = await applyInventoryMovement(adminClient, createdId, landingId, stockInicial, user.id)
      if (moved.error || !moved.product) {
        await supabase.from(INVENTORY_PRODUCTS_TABLE).delete().eq('id', createdId)
        return res.status(moved.status).json({ error: moved.error })
      }
      return res.status(201).json({ product: moved.product })
    }

    const listed = await listInventoryProducts(supabase, landingId)
    const product = listed.products.find((item) => item.id === createdId) ?? null
    return res.status(201).json({ product })
  }

  res.setHeader('Allow', 'GET, POST, PATCH')
  return res.status(405).json({ error: 'Método no permitido' })
}
