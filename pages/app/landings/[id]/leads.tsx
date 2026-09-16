/**
 * Bandeja de leads capturados por una landing de la empresa.
 *
 * Auth: ProtectedRoute + endpoint con requireCompanyAccess.
 * Fetching: el mismo patrón useState/useEffect del listado (SWR no está en el repo).
 */

import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowLeft, Download, Inbox, Loader2, Pencil } from 'lucide-react'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import AppMeshShell from '../../../../components/landing/AppMeshShell'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent } from '../../../../components/ui/card'
import { fetchLandingLeads } from '../../../../lib/landings/admin-api'
import { downloadLandingLeadsCsv, landingLeadsToCsv } from '../../../../lib/landings/leads-csv'
import { landingAdminEditPath, LANDINGS_ADMIN_PATH } from '../../../../lib/landings/paths'
import { formatDateTimeForHonduras } from '../../../../lib/timezone'
import type { LandingLeadListItem } from '../../../../types/landing'

function LeadsInbox({ landingId }: { landingId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState<string>('')
  const [slug, setSlug] = useState<string>('')
  const [leads, setLeads] = useState<LandingLeadListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchLandingLeads(landingId)
      setTitle(data.landing.title)
      setSlug(data.landing.slug)
      setLeads(data.leads)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los leads')
    } finally {
      setLoading(false)
    }
  }, [landingId])

  useEffect(() => {
    void load()
  }, [load])

  function onExport() {
    const csv = landingLeadsToCsv(leads)
    const safeSlug = slug || landingId.slice(0, 8)
    downloadLandingLeadsCsv(`leads-${safeSlug}`, csv)
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
            <h1 className="text-2xl font-bold text-white">Leads capturados</h1>
            <p className="text-sm text-gray-300">
              {title || 'Cargando…'}
              {slug ? <span className="ml-2 font-mono text-xs text-gray-500">/p/{slug}</span> : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push(landingAdminEditPath(landingId))}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar página
          </Button>
          <Button onClick={onExport} disabled={loading || leads.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar a CSV
          </Button>
        </div>
      </header>

      {error && (
        <Card variant="glass">
          <CardContent className="p-5">
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => void load()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando leads…</span>
        </div>
      ) : leads.length === 0 && !error ? (
        <Card variant="glass">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Inbox className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-white">Todavía no hay leads en esta página</p>
            <p className="max-w-md text-sm text-gray-300">
              Cuando alguien llene el formulario publicado, el contacto aparece aquí. También te llega un
              correo si configuraste el aviso.
            </p>
          </CardContent>
        </Card>
      ) : leads.length > 0 ? (
        <Card variant="glass">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Nombre</th>
                    <th className="px-5 py-3">Contacto</th>
                    <th className="px-5 py-3">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="align-top text-gray-200">
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-400">
                        {formatDateTimeForHonduras(lead.created_at)}
                      </td>
                      <td className="px-5 py-3 font-medium text-white">{lead.full_name}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          {lead.email ? (
                            <a href={`mailto:${lead.email}`} className="text-brand-300 hover:underline">
                              {lead.email}
                            </a>
                          ) : null}
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} className="text-gray-300 hover:underline">
                              {lead.phone}
                            </a>
                          ) : null}
                          {!lead.email && !lead.phone ? <span className="text-gray-500">—</span> : null}
                        </div>
                      </td>
                      <td className="max-w-md px-5 py-3 text-gray-300">
                        {lead.message ? (
                          <p className="whitespace-pre-wrap break-words">{lead.message}</p>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default function LandingLeadsPage() {
  const router = useRouter()
  const rawId = router.query.id
  const landingId = Array.isArray(rawId) ? rawId[0] : rawId

  return (
    <ProtectedRoute>
      <Head>
        <title>Leads capturados | Humano SISU</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AppMeshShell>
        {landingId ? (
          <LeadsInbox landingId={landingId} />
        ) : (
          <div className="px-6 py-10 text-sm text-gray-300">Cargando…</div>
        )}
      </AppMeshShell>
    </ProtectedRoute>
  )
}
