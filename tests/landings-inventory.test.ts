import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { collectInventoryProductIds, formatInventoryPrice, toInventoryProductView } from '../lib/landings/inventory'
import {
  createInventoryProductSchema,
  inventoryMovementSchema,
  updateInventoryProductSchema,
} from '../lib/landings/inventory-schema'
import { optionalInventoryProductIdSchema, type LandingPageContent } from '../lib/landings/page-schema'

const PRODUCT = '11111111-1111-4111-8111-111111111111'

describe('inventario de landing', () => {
  it('acepta un alta con stock inicial y rechaza precio negativo', () => {
    const ok = createInventoryProductSchema.safeParse({
      nombre: 'Colonia',
      sku: 'COL-1',
      precio: 250,
      stockMinimo: 2,
      stockInicial: 5,
    })
    assert.equal(ok.success, true)

    const bad = createInventoryProductSchema.safeParse({
      nombre: 'Colonia',
      sku: 'COL-1',
      precio: -1,
      stockMinimo: 0,
    })
    assert.equal(bad.success, false)
  })

  it('la edición no exige saldo y un cuerpo vacío no pasa', () => {
    const ok = updateInventoryProductSchema.safeParse({ precio: 10, stockMinimo: 1 })
    assert.equal(ok.success, true)
    assert.equal('stockActual' in (ok.success ? ok.data : {}), false)

    const empty = updateInventoryProductSchema.safeParse({})
    assert.equal(empty.success, false)
  })

  it('el botón de stock solo mueve una unidad', () => {
    assert.equal(inventoryMovementSchema.safeParse({ delta: 1 }).success, true)
    assert.equal(inventoryMovementSchema.safeParse({ delta: -1 }).success, true)
    assert.equal(inventoryMovementSchema.safeParse({ delta: 2 }).success, false)
    assert.equal(inventoryMovementSchema.safeParse({ delta: 0 }).success, false)
  })

  it('junta los ids citados en listas de precios', () => {
    const content = {
      blocks: [
        {
          kind: 'items',
          items: [{ inventoryProductId: PRODUCT }, { inventoryProductId: PRODUCT }, {}],
        },
        { kind: 'text', body: 'sin stock' },
      ],
    } as LandingPageContent

    assert.deepEqual(collectInventoryProductIds(content), [PRODUCT])
  })

  it('un enlace vacío no es un id y uno mal formado se rechaza', () => {
    assert.equal(optionalInventoryProductIdSchema.parse(''), undefined)
    assert.equal(optionalInventoryProductIdSchema.parse(PRODUCT), PRODUCT)
    assert.equal(optionalInventoryProductIdSchema.safeParse('no-es-uuid').success, false)
  })

  it('marca bajo mínimo y formatea el precio público', () => {
    const view = toInventoryProductView({
      id: PRODUCT,
      nombre: 'Colonia',
      sku: 'COL-1',
      precio: '250.50',
      stock_actual: 1,
      stock_minimo: 1,
    })
    assert.equal(view.low, true)
    assert.equal(view.precio, 250.5)
    assert.match(formatInventoryPrice(250.5), /^L\. 250[.,]50$/)
  })
})
