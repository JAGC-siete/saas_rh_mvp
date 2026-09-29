/**
 * Contratos del panel de inventario. El saldo no entra por aquí: solo un movimiento lo cambia.
 */

import { z } from 'zod'

const nombre = z.string().trim().min(1, 'El nombre es obligatorio.').max(80)
const sku = z
  .string()
  .trim()
  .min(1, 'El SKU es obligatorio.')
  .max(40)
const precio = z.number().finite().min(0, 'El precio no puede ser negativo.')
const stockMinimo = z.number().int().min(0, 'El mínimo no puede ser negativo.')
const stockInicial = z.number().int().min(0).optional()

export const createInventoryProductSchema = z.object({
  nombre,
  sku,
  precio,
  stockMinimo,
  stockInicial,
})

export const updateInventoryProductSchema = z
  .object({
    nombre: nombre.optional(),
    sku: sku.optional(),
    precio: precio.optional(),
    stockMinimo: stockMinimo.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No hay cambios.' })

export const setInventoryEnabledSchema = z.object({
  enabled: z.boolean(),
})

export const inventoryMovementSchema = z.object({
  delta: z.union([z.literal(1), z.literal(-1)]),
})

export type CreateInventoryProductInput = z.infer<typeof createInventoryProductSchema>
export type UpdateInventoryProductInput = z.infer<typeof updateInventoryProductSchema>
