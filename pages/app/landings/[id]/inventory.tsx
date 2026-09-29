/**
 * Inventario de una landing. El saldo cambia con un movimiento, no editando la celda.
 */

import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowLeft, Loader2, Pencil, Plus } from 'lucide-react'
import SuperAdminGuard from '../../../../components/SuperAdminGuard'
import AppMeshShell from '../../../../components/landing/AppMeshShell'
import {
  InventoryProductDialog,
  InventoryTable,
  type InventoryDraft,
} from '../../../../components/landings/inventory/InventoryPanel'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent } from '../../../../components/ui/card'
import {
  createInventoryProduct,
  deleteInventoryProduct,
  fetchLanding,
  fetchLandingInventory,
  moveInventoryStock,
  setLandingInventoryEnabled,
  updateInventoryProduct,
} from '../../../../lib/landings/admin-api'
import type { InventoryProductView } from '../../../../lib/landings/inventory'
import { LANDINGS_ADMIN_PATH, landingAdminEditPath } from '../../../../lib/landings/paths'

function parseAmount(raw: string): number | null {
  const value = Number(raw.replace(',', '.'))
  if (!Number.isFinite(value)) return null
  return value
}

function parseCount(raw: string): number | null {
  if (raw.trim() === '') return 0
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) return null
  return value
}

function InventoryDesk({ landingId }: { landingId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [products, setProducts] = useState<InventoryProductView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<null | { mode: 'create' | 'edit'; product: InventoryProductView | null }>(null)
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [page, inventory] = await Promise.all([fetchLanding(landingId), fetchLandingInventory(landingId)])
      setTitle(page.landing.title)
      setEnabled(inventory.enabled)
      setProducts(inventory.products)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario')
    } finally {
      setLoading(false)
    }
  }, [landingId])

  useEffect(() => {
    void load()
  }, [load])

  async function onToggle(next: boolean) {
    const previous = enabled
    setEnabled(next)
    try {
      await setLandingInventoryEnabled(landingId, next)
    } catch (err: unknown) {
      setEnabled(previous)
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el módulo')
    }
  }

  async function onDelta(product: InventoryProductView, delta: 1 | -1) {
    if (pendingId) return
    setPendingId(product.id)
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              stockActual: item.stockActual + delta,
              low: item.stockActual + delta <= item.stockMinimo,
            }
          : item
      )
    )
    try {
      const result = await moveInventoryStock(landingId, product.id, delta)
      setProducts((current) => current.map((item) => (item.id === result.product.id ? result.product : item)))
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo mover el stock')
      const fresh = await fetchLandingInventory(landingId).catch(() => null)
      if (fresh) setProducts(fresh.products)
    } finally {
      setPendingId(null)
    }
  }

  async function onSubmit(draft: InventoryDraft) {
    const precio = parseAmount(draft.precio)
    const stockMinimo = parseCount(draft.stockMinimo)
    if (precio === null || precio < 0 || stockMinimo === null) {
      setDialogError('Revisa el precio y el mínimo.')
      return
    }

    setSaving(true)
    setDialogError(null)
    try {
      if (dialog?.mode === 'edit' && dialog.product) {
        const result = await updateInventoryProduct(landingId, dialog.product.id, {
          nombre: draft.nombre.trim(),
          sku: draft.sku.trim(),
          precio,
          stockMinimo,
        })
        setProducts((current) => current.map((item) => (item.id === result.product.id ? result.product : item)))
      } else {
        const stockInicial = parseCount(draft.stockInicial)
        if (stockInicial === null) {
          setDialogError('El stock inicial tiene que ser un entero.')
          setSaving(false)
          return
        }
        const result = await createInventoryProduct(landingId, {
          nombre: draft.nombre.trim(),
          sku: draft.sku.trim(),
          precio,
          stockMinimo,
          stockInicial,
        })
        if (result.product) {
          setProducts((current) => [...current, result.product as InventoryProductView].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
        }
      }
      setDialog(null)
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!dialog?.product) return
    setSaving(true)
    setDialogError(null)
    try {
      await deleteInventoryProduct(landingId, dialog.product.id)
      setProducts((current) => current.filter((item) => item.id !== dialog.product?.id))
      setDialog(null)
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'No se pudo borrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href={LANDINGS_ADMIN_PATH}>
            <Button variant="ghost" size="icon" aria-label="Volver al listado">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Inventario</h1>
            <p className="text-sm text-gray-300">{title || 'Cargando…'}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push(landingAdminEditPath(landingId))}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar página
        </Button>
      </header>

      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-white">Módulo de inventario</p>
            <p className="text-xs text-gray-400">
              Apagado, la página pública sigue mostrando el precio escrito en cada tarjeta.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => void onToggle(!enabled)}
            className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-white/20'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-5' : 'left-0.5'}`}
            />
          </button>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {enabled ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-4 p-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setDialogError(null)
                  setDialog({ mode: 'create', product: null })
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Producto
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando productos…
              </div>
            ) : (
              <InventoryTable products={products} pendingId={pendingId} onEdit={(product) => {
                setDialogError(null)
                setDialog({ mode: 'edit', product })
              }} onDelta={(product, delta) => void onDelta(product, delta)} />
            )}
          </CardContent>
        </Card>
      ) : null}

      {dialog ? (
        <InventoryProductDialog
          key={dialog.product?.id ?? 'new'}
          mode={dialog.mode}
          product={dialog.product}
          saving={saving}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={(draft) => void onSubmit(draft)}
          onDelete={() => void onDelete()}
        />
      ) : null}
    </div>
  )
}

export default function LandingInventoryPage() {
  const router = useRouter()
  const rawId = router.query.id
  const landingId = Array.isArray(rawId) ? rawId[0] : rawId

  return (
    <SuperAdminGuard redirectPath="/app/landings">
      <Head>
        <title>Inventario | Humano SISU</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AppMeshShell>
        {landingId ? (
          <InventoryDesk landingId={landingId} />
        ) : (
          <div className="px-6 py-10 text-sm text-gray-300">Cargando…</div>
        )}
      </AppMeshShell>
    </SuperAdminGuard>
  )
}
