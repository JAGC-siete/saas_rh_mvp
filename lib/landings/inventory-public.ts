/**
 * Saldo que ve /p/[slug]. Solo precio y stock de los ids citados en el snapshot.
 */

import { createAdminClient } from '../supabase/admin-client'
import { LANDING_PAGES_TABLE } from './db'
import type { PublicInventoryOffer } from './inventory'
import { INVENTORY_PRODUCTS_TABLE } from './inventory-server'

interface OfferRow {
  id: string
  precio: number | string
  stock_actual: number
}

export async function readPublishedInventory(
  landingId: string,
  productIds: string[]
): Promise<{ live: boolean; offers: Record<string, PublicInventoryOffer> }> {
  if (productIds.length === 0) return { live: false, offers: {} }

  const admin = createAdminClient()
  const { data: page, error: pageError } = await admin
    .from(LANDING_PAGES_TABLE)
    .select('inventory_enabled')
    .eq('id', landingId)
    .maybeSingle()

  if (pageError) throw new Error(pageError.message)
  if (!page || page.inventory_enabled !== true) return { live: false, offers: {} }

  const { data, error } = await admin
    .from(INVENTORY_PRODUCTS_TABLE)
    .select('id, precio, stock_actual')
    .eq('landing_id', landingId)
    .in('id', productIds)

  if (error) throw new Error(error.message)

  const offers: Record<string, PublicInventoryOffer> = {}
  for (const row of (data ?? []) as OfferRow[]) {
    offers[row.id] = {
      precio: typeof row.precio === 'number' ? row.precio : Number(row.precio),
      stockActual: row.stock_actual,
    }
  }
  return { live: true, offers }
}
