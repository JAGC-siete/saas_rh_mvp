/**
 * Listado de landings de la empresa + creación desde plantilla.
 *
 * Auth: ProtectedRoute (gate de sesión del shell /app) y, sobre todo, los endpoints
 * con requireCompanyAccess. No usa DashboardLayout porque ese shell arrastra la
 * navegación y los permisos del dominio de RRHH, que no aplica a este módulo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ExternalLink, FileText, Inbox, Loader2, Pencil, Plus, X } from 'lucide-react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import AppMeshShell from '../../../components/landing/AppMeshShell'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { createLanding, fetchLandings } from '../../../lib/landings/admin-api'
import { createLandingSchema } from '../../../lib/landings/admin-schema'
import { landingAdminEditPath, landingAdminLeadsPath, landingPublicPath } from '../../../lib/landings/paths'
import { slugifyBusinessName } from '../../../lib/landings/page-schema'
import { LANDING_TEMPLATE_OPTIONS } from '../../../lib/landings/templates'
import { formatDateTimeForHonduras } from '../../../lib/timezone'
import type { LandingPageListItem, LandingPageStatus, LandingTemplateKey } from '../../../types/landing'

const STATUS_LABEL: Record<LandingPageStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  archived: 'Archivada',
}

function StatusBadge({ status }: { status: LandingPageStatus }) {
  const className =
    status === 'published'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : status === 'draft'
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : 'bg-white/10 text-gray-300 border-white/20'

  return <Badge className={className}>{STATUS_LABEL[status]}</Badge>
}

function CreateLandingForm({
  onCreated,
  onCancel,
}: {
  // eslint-disable-next-line no-unused-vars -- falso positivo: parámetro en posición de tipo
  onCreated: (id: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [templateType, setTemplateType] = useState<LandingTemplateKey>('papeleria')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const effectiveSlug = slugTouched ? slug : slugifyBusinessName(title)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const parsed = createLandingSchema.safeParse({ title, slug: effectiveSlug, templateType })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }

    setError(null)
    setSaving(true)
    try {
      const { landing } = await createLanding(parsed.data)
      onCreated(landing.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la landing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Nueva landing</CardTitle>
        <button type="button" onClick={onCancel} aria-label="Cerrar" className="text-gray-300 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="landing-title" className="mb-1 block text-sm font-medium text-gray-200">
              Título interno
            </label>
            <Input
              id="landing-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Barbería El Corte"
              className="bg-white/10 text-white placeholder:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="landing-slug" className="mb-1 block text-sm font-medium text-gray-200">
              Dirección pública
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">/p/</span>
              <Input
                id="landing-slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                placeholder="barberia-el-corte"
                className="bg-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Solo minúsculas, números y guiones. Es único en todo el sistema, así que conviene incluir el
              nombre del negocio o la ciudad.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-gray-200">Plantilla</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LANDING_TEMPLATE_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    templateType === option.key
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-white/15 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="templateType"
                      value={option.key}
                      checked={templateType === option.key}
                      onChange={() => setTemplateType(option.key)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{option.label}</p>
                      <p className="text-xs text-gray-400">{option.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creando…' : 'Crear y editar'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function LandingsContent() {
  const router = useRouter()
  const [landings, setLandings] = useState<LandingPageListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { landings: rows } = await fetchLandings()
      setLandings(rows)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las landings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => landings.filter((row) => row.status !== 'archived'), [landings])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Páginas web</h1>
          <p className="text-sm text-gray-300">
            Crea la página de tu negocio desde una plantilla, edítala y publícala cuando esté lista.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva landing
          </Button>
        )}
      </header>

      {creating && (
        <CreateLandingForm
          onCancel={() => setCreating(false)}
          onCreated={(id) => router.push(landingAdminEditPath(id))}
        />
      )}

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
          <span className="text-sm">Cargando…</span>
        </div>
      ) : visible.length === 0 ? (
        <Card variant="glass">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <FileText className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-300">
              Todavía no tienes páginas. Empieza con una plantilla de tu rubro.
            </p>
            {!creating && <Button onClick={() => setCreating(true)}>Crear la primera</Button>}
          </CardContent>
        </Card>
      ) : (
        <Card variant="glass">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-3">Título</th>
                    <th className="px-5 py-3">Dirección</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Actualizada</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visible.map((row) => (
                    <tr key={row.id} className="text-gray-200">
                      <td className="px-5 py-3 font-medium text-white">{row.title}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-400">
                        {landingPublicPath(row.slug)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {formatDateTimeForHonduras(new Date(row.updated_at))}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Link href={landingAdminEditPath(row.id)}>
                            <Button size="sm" variant="outline">
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </Link>
                          <Link href={landingAdminLeadsPath(row.id)}>
                            <Button size="sm" variant="ghost">
                              <Inbox className="mr-1.5 h-3.5 w-3.5" />
                              Leads
                            </Button>
                          </Link>
                          {row.status === 'published' && (
                            <a
                              href={landingPublicPath(row.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="ghost">
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                Ver
                              </Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function LandingsPage() {
  return (
    <ProtectedRoute>
      <Head>
        <title>Páginas web | Humano SISU</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AppMeshShell>
        <LandingsContent />
      </AppMeshShell>
    </ProtectedRoute>
  )
}
