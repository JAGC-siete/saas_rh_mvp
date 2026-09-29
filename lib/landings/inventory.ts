/**
 * Saldo vivo de una landing. El precio público sale de aquí, no del JSON publicado.
 */

import type { LandingPageContent } from './page-schema'

export interface InventoryProductView {
  id: string
  nombre: string
  sku: string
  precio: number
  stockActual: number
  stockMinimo: number
  low: boolean
}

export interface PublicInventoryOffer {
  precio: number
  stockActual: number
}

export interface InventoryProductRow {
  id: string
  nombre: string
  sku: string
  precio: number | string
  stock_actual: number
  stock_minimo: number
}

export function toInventoryProductView(row: InventoryProductRow): InventoryProductView {
  const precio = typeof row.precio === 'number' ? row.precio : Number(row.precio)
  return {
    id: row.id,
    nombre: row.nombre,
    sku: row.sku,
    precio,
    stockActual: row.stock_actual,
    stockMinimo: row.stock_minimo,
    low: row.stock_actual <= row.stock_minimo,
  }
}

export function formatInventoryPrice(amount: number): string {
  const formatted = amount.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `L. ${formatted}`
}

/** Ids de inventory_products citados por bloques `items` del JSON. */
export function collectInventoryProductIds(content: LandingPageContent): string[] {
  const ids = new Set<string>()
  for (const block of content.blocks) {
    if (block.kind !== 'items') continue
    for (const item of block.items) {
      if (item.inventoryProductId) ids.add(item.inventoryProductId)
    }
  }
  return [...ids]
}
