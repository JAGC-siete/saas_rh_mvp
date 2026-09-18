/**
 * Bandeja de solicitudes /webycitas. Superadmin only. No crea tenant de planilla.
 */

import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { getBrowserAuthHeaders } from '../../../lib/auth/browser-auth-headers'
import {
  DEMO_LOCAL_ADMIN_API_PATH,
  formatDemoLocalServices,
  rubroLabel,
  WEBYCITAS_LEAD_STATUSES,
  type DemoLocalRubro,
  type DemoLocalService,
  type WebycitasLeadStatus,
} from '../../../lib/marketing/demo-local'
import { formatDateTimeForHonduras } from '../../../lib/timezone'
import { Loader2 } from 'lucide-react'

interface WebycitasLeadRow {
  id: string
  owner_name: string
  business_name: string
  email: string
  phone: string
  rubro: DemoLocalRubro
  city: string
  note: string | null
  services: DemoLocalService[]
  status: WebycitasLeadStatus
  preview_slug: string | null
  landing_id: string | null
  consented_at: string
  notified_at: string | null
  created_at: string
}

const STATUS_LABEL: Record<WebycitasLeadStatus, string> = {
  received: 'Recibida',
  reviewed: 'Revisada',
  rejected: 'Descartada',
}

function statusClass(status: WebycitasLeadStatus): string {
  if (status === 'reviewed') return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
  if (status === 'rejected') return 'bg-white/10 text-gray-300 border-white/20'
  return 'bg-amber-500/15 text-amber-300 border-amber-400/30'
}

export default function WebycitasLeadsPage() {
  const [leads, setLeads] = useState<WebycitasLeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getBrowserAuthHeaders()
      const res = await fetch(DEMO_LOCAL_ADMIN_API_PATH, { headers })
      const body = (await res.json().catch(() => ({}))) as { leads?: WebycitasLeadRow[]; error?: string }
      if (!res.ok) throw new Error(body.error || 'No se pudieron cargar las solicitudes')
      setLeads(body.leads ?? [])
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

  async function patchStatus(id: string, status: WebycitasLeadStatus) {
    setSavingId(id)
    try {
      const headers = await getBrowserAuthHeaders()
      const res = await fetch(DEMO_LOCAL_ADMIN_API_PATH, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ id, status }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(body.error || 'No se pudo actualizar')
      setLeads((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <SuperAdminGuard redirectPath="/app/admin/webycitas">
      <SuperAdminLayout>
        <Head>
          <title>Web y citas | Super Admin</title>
        </Head>
        <div className="space-y-6 p-6">
          <header>
            <h1 className="text-2xl font-bold text-white">Solicitudes /webycitas</h1>
            <p className="mt-1 text-sm text-white/60">
              Página web y reservas. La maqueta vive en /p/slug; no crea empresa de planilla.
            </p>
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
          ) : leads.length === 0 ? (
            <Card variant="glass">
              <CardContent className="p-6 text-sm text-white/60">Aún no hay solicitudes.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <Card key={lead.id} variant="glass">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{lead.business_name}</p>
                        <p className="text-sm text-white/70">
                          {lead.owner_name} · {rubroLabel(lead.rubro)} · {lead.city}
                        </p>
                      </div>
                      <Badge className={statusClass(lead.status)}>{STATUS_LABEL[lead.status]}</Badge>
                    </div>
                    <p className="text-sm text-white/80">{formatDemoLocalServices(lead.services)}</p>
                    <p className="text-sm text-white/70">
                      <a className="underline-offset-2 hover:underline" href={`mailto:${lead.email}`}>
                        {lead.email}
                      </a>
                      {' · '}
                      <a className="underline-offset-2 hover:underline" href={`tel:${lead.phone}`}>
                        {lead.phone}
                      </a>
                    </p>
                    {lead.preview_slug ? (
                      <p className="text-sm text-white/70">
                        Maqueta:{' '}
                        <a
                          className="underline-offset-2 hover:underline"
                          href={`/p/${lead.preview_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          /p/{lead.preview_slug}
                        </a>
                      </p>
                    ) : null}
                    {lead.note ? <p className="text-sm text-white/60">{lead.note}</p> : null}
                    <p className="text-xs text-white/40">
                      {formatDateTimeForHonduras(lead.created_at)}
                      {lead.notified_at ? ' · aviso interno enviado' : ' · aviso interno pendiente'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {WEBYCITAS_LEAD_STATUSES.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={lead.status === status ? 'default' : 'outline'}
                          disabled={savingId === lead.id || lead.status === status}
                          onClick={() => void patchStatus(lead.id, status)}
                        >
                          {STATUS_LABEL[status]}
                        </Button>
                      ))}
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
