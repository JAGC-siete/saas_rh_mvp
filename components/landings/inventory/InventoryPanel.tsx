/**
 * Tabla, alta/edición y botones +/− del inventario de una landing.
 */

import { useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { formatInventoryPrice, type InventoryProductView } from '../../../lib/landings/inventory'

export function StockStepper({
  stock,
  pending,
  onDelta,
}: {
  stock: number
  pending: boolean
  onDelta: (delta: 1 | -1) => void
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Sacar una unidad"
        disabled={pending || stock <= 0}
        onClick={() => onDelta(-1)}
      >
        −
      </Button>
      <span className="min-w-8 text-center font-mono text-sm text-white">{stock}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Entrar una unidad"
        disabled={pending}
        onClick={() => onDelta(1)}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : '+'}
      </Button>
    </div>
  )
}

export function InventoryTable({
  products,
  pendingId,
  onEdit,
  onDelta,
}: {
  products: InventoryProductView[]
  pendingId: string | null
  onEdit: (product: InventoryProductView) => void
  onDelta: (product: InventoryProductView, delta: 1 | -1) => void
}) {
  if (products.length === 0) {
    return <p className="text-sm text-gray-400">Todavía no hay productos en esta página.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-200">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-400">
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 font-medium">Nombre</th>
            <th className="px-3 py-2 font-medium">Precio</th>
            <th className="px-3 py-2 font-medium">Stock</th>
            <th className="px-3 py-2 font-medium">Aviso</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-white/5">
              <td className="px-3 py-3 font-mono text-xs">{product.sku}</td>
              <td className="px-3 py-3">{product.nombre}</td>
              <td className="px-3 py-3 whitespace-nowrap">{formatInventoryPrice(product.precio)}</td>
              <td className="px-3 py-3">
                <StockStepper
                  stock={product.stockActual}
                  pending={pendingId === product.id}
                  onDelta={(delta) => onDelta(product, delta)}
                />
              </td>
              <td className="px-3 py-3">
                {product.low ? (
                  <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                    Bajo mínimo
                  </span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-right">
                <Button type="button" variant="ghost" size="icon" aria-label="Editar producto" onClick={() => onEdit(product)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface InventoryDraft {
  nombre: string
  sku: string
  precio: string
  stockMinimo: string
  stockInicial: string
}

const EMPTY_DRAFT: InventoryDraft = {
  nombre: '',
  sku: '',
  precio: '',
  stockMinimo: '0',
  stockInicial: '',
}

export function InventoryProductDialog({
  mode,
  product,
  saving,
  error,
  onClose,
  onSubmit,
  onDelete,
}: {
  mode: 'create' | 'edit'
  product: InventoryProductView | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (draft: InventoryDraft) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<InventoryDraft>(() =>
    mode === 'edit' && product
      ? {
          nombre: product.nombre,
          sku: product.sku,
          precio: String(product.precio),
          stockMinimo: String(product.stockMinimo),
          stockInicial: '',
        }
      : EMPTY_DRAFT
  )

  function setField(key: keyof InventoryDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-slate-950 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(draft)
        }}
      >
        <h2 className="text-lg font-semibold text-white">
          {mode === 'create' ? 'Nuevo producto' : 'Editar producto'}
        </h2>
        <label className="block text-sm text-gray-300">
          Nombre
          <Input
            value={draft.nombre}
            onChange={(event) => setField('nombre', event.target.value)}
            className="mt-1 bg-white/10 text-white"
            required
          />
        </label>
        <label className="block text-sm text-gray-300">
          SKU
          <Input
            value={draft.sku}
            onChange={(event) => setField('sku', event.target.value)}
            className="mt-1 bg-white/10 text-white"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-gray-300">
            Precio
            <Input
              value={draft.precio}
              onChange={(event) => setField('precio', event.target.value)}
              inputMode="decimal"
              className="mt-1 bg-white/10 text-white"
              required
            />
          </label>
          <label className="block text-sm text-gray-300">
            Mínimo
            <Input
              value={draft.stockMinimo}
              onChange={(event) => setField('stockMinimo', event.target.value)}
              inputMode="numeric"
              className="mt-1 bg-white/10 text-white"
              required
            />
          </label>
        </div>
        {mode === 'create' ? (
          <label className="block text-sm text-gray-300">
            Stock inicial
            <Input
              value={draft.stockInicial}
              onChange={(event) => setField('stockInicial', event.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="mt-1 bg-white/10 text-white"
            />
          </label>
        ) : (
          <p className="text-xs text-gray-500">El saldo se mueve con los botones + y − de la tabla.</p>
        )}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex items-center justify-between gap-2">
          {mode === 'edit' ? (
            <Button type="button" variant="ghost" onClick={onDelete} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Borrar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
