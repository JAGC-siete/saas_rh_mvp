/**
 * Listado de landings de ejemplo + creación desde plantilla.
 *
 * Herramienta de superadmin para visitas a clientes: se capturan datos básicos
 * del negocio y se genera un ejemplo publicable. No exige empresa de RRHH activa.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ExternalLink, FileText, Inbox, Loader2, Pencil, Plus, X } from 'lucide-react'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
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
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const effectiveSlug = slugTouched ? slug : slugifyBusinessName(title)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const parsed = createLandingSchema.safeParse({
      title,
      slug: effectiveSlug,
      templateType,
      city,
      address,
      phone,
      whatsapp,
      email,
    })
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
        <CardTitle className="text-lg">Nueva landing de ejemplo</CardTitle>
        <button type="button" onClick={onCancel} aria-label="Cerrar" className="text-gray-300 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="landing-title" className="mb-1 block text-sm font-medium text-gray-200">
              Nombre del negocio
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
              Solo minúsculas, números y guiones. Conviene incluir el nombre o la ciudad.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-gray-200">Rubro</legend>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="landing-city" className="mb-1 block text-sm font-medium text-gray-200">
                Ciudad
              </label>
              <Input
                id="landing-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Tegucigalpa"
                className="bg-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <label htmlFor="landing-address" className="mb-1 block text-sm font-medium text-gray-200">
                Dirección
              </label>
              <Input
                id="landing-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Blvd. Morazán, local 12"
                className="bg-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <label htmlFor="landing-phone" className="mb-1 block text-sm font-medium text-gray-200">
                Teléfono
              </label>
              <Input
                id="landing-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2222-0000"
                inputMode="tel"
                className="bg-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <label htmlFor="landing-whatsapp" className="mb-1 block text-sm font-medium text-gray-200">
                WhatsApp
              </label>
              <Input
                id="landing-whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="9999-0000"
                inputMode="tel"
                className="bg-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="landing-email" className="mb-1 block text-sm font-medium text-gray-200">
                Correo
              </label>
              <Input
                id="landing-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hola@negocio.com"
                className="bg-white/10 text-white placeholder:text-gray-400"
              />
            </div>
          </div>

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
  const [dismissedCreate, setDismissedCreate] = useState(false)

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

  useEffect(() => {
    if (!loading && visible.length === 0 && !dismissedCreate && !error) {
      setCreating(true)
    }
  }, [loading, visible.length, dismissedCreate, error])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Landings de ejemplo</h1>
          <p className="text-sm text-gray-300">
            En la visita, anota nombre, rubro, ciudad, teléfono y WhatsApp. Aquí se arma un ejemplo
            para mostrárselo al cliente.
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
          onCancel={() => {
            setCreating(false)
            setDismissedCreate(true)
          }}
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
        !creating ? (
          <Card variant="glass">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <FileText className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-300">
                Todavía no hay ejemplos. Crea uno con los datos del negocio que estás visitando.
              </p>
              <Button onClick={() => setCreating(true)}>Crear la primera</Button>
            </CardContent>
          </Card>
        ) : null
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
    <SuperAdminGuard redirectPath="/app/landings">
      <Head>
        <title>Landings de ejemplo | Humano SISU</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AppMeshShell>
        <LandingsContent />
      </AppMeshShell>
    </SuperAdminGuard>
  )
}
