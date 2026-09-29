/**
 * Lectura y movimientos de inventario. El saldo se mueve solo con inventory_apply_movement.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { LANDING_PAGES_TABLE } from './db'
import { toInventoryProductView, type InventoryProductRow, type InventoryProductView } from './inventory'

export const INVENTORY_PRODUCTS_TABLE = 'inventory_products'

const PRODUCT_COLUMNS = 'id, nombre, sku, precio, stock_actual, stock_minimo'

export interface InventoryLanding {
  id: string
  company_id: string
  inventory_enabled: boolean
}

export async function loadInventoryLanding(
  supabase: SupabaseClient,
  landingId: string
): Promise<{ landing: InventoryLanding | null; error: string | null }> {
  const { data, error } = await supabase
    .from(LANDING_PAGES_TABLE)
    .select('id, company_id, inventory_enabled')
    .eq('id', landingId)
    .maybeSingle()

  if (error) return { landing: null, error: error.message }
  return { landing: (data as InventoryLanding | null) ?? null, error: null }
}

export async function listInventoryProducts(
  supabase: SupabaseClient,
  landingId: string
): Promise<{ products: InventoryProductView[]; error: string | null }> {
  const { data, error } = await supabase
    .from(INVENTORY_PRODUCTS_TABLE)
    .select(PRODUCT_COLUMNS)
    .eq('landing_id', landingId)
    .order('nombre', { ascending: true })

  if (error) return { products: [], error: error.message }
  return {
    products: ((data ?? []) as InventoryProductRow[]).map(toInventoryProductView),
    error: null,
  }
}

export async function applyInventoryMovement(
  admin: SupabaseClient,
  productId: string,
  landingId: string,
  delta: number,
  actorId: string
): Promise<{ product: InventoryProductView | null; status: number; error: string | null }> {
  const { data: owned, error: ownedError } = await admin
    .from(INVENTORY_PRODUCTS_TABLE)
    .select('id')
    .eq('id', productId)
    .eq('landing_id', landingId)
    .maybeSingle()

  if (ownedError) return { product: null, status: 500, error: 'No se pudo mover el stock' }
  if (!owned) return { product: null, status: 404, error: 'Producto no encontrado' }

  const { data, error } = await admin.rpc('inventory_apply_movement', {
    p_product_id: productId,
    p_delta: delta,
    p_actor: actorId,
  })

  if (error) {
    const message = error.message ?? ''
    if (message.includes('stock_negative') || error.code === '23514') {
      return { product: null, status: 409, error: 'No hay stock para sacar.' }
    }
    return { product: null, status: 500, error: 'No se pudo mover el stock' }
  }

  const row = (Array.isArray(data) ? data[0] : data) as InventoryProductRow | null
  if (!row?.id) return { product: null, status: 500, error: 'No se pudo mover el stock' }
  return { product: toInventoryProductView(row), status: 200, error: null }
}
