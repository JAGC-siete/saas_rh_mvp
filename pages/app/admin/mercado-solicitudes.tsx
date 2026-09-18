/**
 * Bandeja de solicitudes /mercadosanpablosigua/inscripcion. Superadmin only.
 * Crear ficha → approved + vendor_id. reviewed = en proceso.
 */

import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { getBrowserAuthHeaders } from '../../../lib/auth/browser-auth-headers'
import type { VendorApplicationStatus } from '../../../lib/mercado/inscription-schema'
import {
  MERCADO_APPLICATIONS_ADMIN_API_PATH,
  mercadoAdminEditPath,
  mercadoAdminListPath,
  mercadoAdminNewPath,
} from '../../../lib/mercado/paths'
import { formatDateTimeForHonduras } from '../../../lib/timezone'
import { Loader2 } from 'lucide-react'

interface MercadoApplicationRow {
  id: string
  stall_number: string
  merchant_name: string
  business_name: string
  status: VendorApplicationStatus
  source: string
  notified_at: string | null
  created_at: string
  vendor_id: string | null
}

const MANUAL_STATUSES: VendorApplicationStatus[] = ['received', 'reviewed', 'rejected']

const STATUS_LABEL: Record<VendorApplicationStatus, string> = {
  received: 'Recibida',
  reviewed: 'En proceso',
  approved: 'Aprobada (ficha)',
  rejected: 'Descartada',
}

function statusClass(status: VendorApplicationStatus): string {
  if (status === 'approved') return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
  if (status === 'reviewed') return 'bg-sky-500/15 text-sky-300 border-sky-400/30'
  if (status === 'rejected') return 'bg-white/10 text-gray-300 border-white/20'
  return 'bg-amber-500/15 text-amber-300 border-amber-400/30'
}

export default function MercadoSolicitudesPage() {
  const [rows, setRows] = useState<MercadoApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getBrowserAuthHeaders()
      const res = await fetch(MERCADO_APPLICATIONS_ADMIN_API_PATH, { headers })
      const body = (await res.json().catch(() => ({}))) as {
        applications?: MercadoApplicationRow[]
        error?: string
      }
      if (!res.ok) throw new Error(body.error || 'No se pudieron cargar las solicitudes')
      setRows(body.applications ?? [])
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function patchStatus(id: string, status: VendorApplicationStatus) {
    setSavingId(id)
    try {
      const headers = await getBrowserAuthHeaders()
      const res = await fetch(MERCADO_APPLICATIONS_ADMIN_API_PATH, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ id, status }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(body.error || 'No se pudo actualizar')
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <SuperAdminGuard redirectPath="/app/admin/mercado-solicitudes">
      <SuperAdminLayout>
        <Head>
          <title>Solicitudes mercado | Super Admin</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="space-y-6 p-6">
          <header>
            <h1 className="text-2xl font-bold text-white">Mercado San Pablo — Solicitudes</h1>
            <p className="mt-1 text-sm text-white/60">
              Inscripción al directorio Pickup. Revisá → Creá ficha (pasa a Aprobada). No crea
              empresa SISU.
            </p>
            <Link
              href={mercadoAdminListPath()}
              className="mt-2 inline-block text-sm text-amber-200 underline-offset-2 hover:underline"
            >
              Ir a fichas publicadas
            </Link>
          </header>

          {error ? (
            <Card variant="glass">
              <CardContent className="p-5">
                <p className="text-sm text-red-400">{error}</p>
                <Button variant="outline" className="mt-3" onClick={() => void load()}>
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando solicitudes…</span>
            </div>
          ) : rows.length === 0 ? (
            <Card variant="glass">
              <CardContent className="p-6 text-sm text-white/60">Aún no hay solicitudes.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <Card key={row.id} variant="glass">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{row.business_name}</p>
                        <p className="text-sm text-white/70">
                          {row.merchant_name} · local {row.stall_number}
                        </p>
                      </div>
                      <Badge className={statusClass(row.status)}>{STATUS_LABEL[row.status]}</Badge>
                    </div>
                    <p className="text-xs text-white/40">
                      {formatDateTimeForHonduras(row.created_at)}
                      {row.notified_at ? ' · aviso interno enviado' : ' · aviso interno pendiente'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MANUAL_STATUSES.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={row.status === status ? 'default' : 'outline'}
                          disabled={
                            savingId === row.id ||
                            row.status === status ||
                            Boolean(row.vendor_id && status !== 'rejected')
                          }
                          onClick={() => void patchStatus(row.id, status)}
                        >
                          {STATUS_LABEL[status]}
                        </Button>
                      ))}
                      {row.vendor_id ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={mercadoAdminEditPath(row.vendor_id)}>Ver ficha</Link>
                        </Button>
                      ) : (
                        <Button size="sm" asChild>
                          <Link href={mercadoAdminNewPath(row.id)}>Crear ficha</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
