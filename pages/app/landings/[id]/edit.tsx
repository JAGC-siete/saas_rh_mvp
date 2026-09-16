/**
 * Editor de una landing: formulario a la izquierda, vista previa en vivo a la derecha.
 *
 * La vista previa usa el MISMO LandingRenderer de la ruta pública, alimentado por
 * watch() de react-hook-form. Si el borrador queda momentáneamente inválido mientras
 * se escribe, se conserva la última vista válida en vez de mostrar la página en blanco.
 *
 * Guardar valida estricto (el resolver de Zod). Publicar es una acción aparte que copia
 * el borrador a published_content_json en el servidor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ExternalLink, Eye, Globe, Inbox, Loader2, Save } from 'lucide-react'
import SuperAdminGuard from '../../../../components/SuperAdminGuard'
import AppMeshShell from '../../../../components/landing/AppMeshShell'
import LandingRenderer from '../../../../components/landings/LandingRenderer'
import {
  asEditorControls,
  BlockAccordion,
  GlobalFields,
  type EditableBlockRef,
} from '../../../../components/landings/editor/LandingEditorPanel'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import {
  fetchLanding,
  publishLanding,
  saveLanding,
  type LandingEditRecord,
} from '../../../../lib/landings/admin-api'
import {
  landingPageContentSchema,
  readLandingPageContent,
} from '../../../../lib/landings/page-schema'
import { LANDINGS_ADMIN_PATH, landingAdminLeadsPath, landingPublicPath } from '../../../../lib/landings/paths'
import { formatDateTimeForHonduras } from '../../../../lib/timezone'
import type {
  LandingPageContent,
  LandingPageContentInput,
  LandingPageStatus,
  PublicLandingPage,
} from '../../../../types/landing'

function EditorContent({ landingId }: { landingId: string }) {
  const router = useRouter()
  const [record, setRecord] = useState<LandingEditRecord | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [status, setStatus] = useState<LandingPageStatus>('draft')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  // Tres genéricos: valores del formulario (entrada), contexto y valores ya validados
  // por Zod (salida). Sin esto, los campos con default del esquema no calzan.
  const form = useForm<LandingPageContentInput, unknown, LandingPageContent>({
    resolver: zodResolver(landingPageContentSchema),
    mode: 'onSubmit',
  })
  const { handleSubmit, reset, watch, formState } = form
  const controls = asEditorControls(form)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { landing } = await fetchLanding(landingId)
        if (!active) return

        const parsed = readLandingPageContent(landing.content_json)
        if (!parsed.ok) {
          setMessage({ tone: 'error', text: `El borrador guardado no se pudo leer: ${parsed.reason}` })
          setLoading(false)
          return
        }

        setRecord(landing)
        setTitle(landing.title)
        setSlug(landing.slug)
        setNotifyEmail(landing.lead_notify_email ?? '')
        setStatus(landing.status)
        reset(parsed.content)
      } catch (err: unknown) {
        if (active) {
          setMessage({
            tone: 'error',
            text: err instanceof Error ? err.message : 'No se pudo cargar la landing',
          })
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [landingId, reset])

  const values = watch()
  const lastValidPreview = useRef<LandingPageContent | null>(null)

  const preview = useMemo<{ page: PublicLandingPage | null; stale: boolean }>(() => {
    const read = readLandingPageContent(values)
    if (read.ok) {
      lastValidPreview.current = read.content
      return {
        page: {
          id: landingId,
          slug,
          title,
          templateType: record?.template_type ?? 'papeleria',
          content: read.content,
        },
        stale: false,
      }
    }
    if (!lastValidPreview.current) return { page: null, stale: false }
    return {
      page: {
        id: landingId,
        slug,
        title,
        templateType: record?.template_type ?? 'papeleria',
        content: lastValidPreview.current,
      },
      stale: true,
    }
  }, [values, landingId, slug, title, record?.template_type])

  const onSave = useCallback(
    async (content: LandingPageContent) => {
      setSaving(true)
      setMessage(null)
      try {
        await saveLanding(landingId, {
          title,
          slug,
          leadNotifyEmail: notifyEmail.trim() ? notifyEmail.trim() : null,
          content,
        })
        setMessage({ tone: 'ok', text: 'Borrador guardado.' })
      } catch (err: unknown) {
        setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'No se pudo guardar' })
      } finally {
        setSaving(false)
      }
    },
    [landingId, title, slug, notifyEmail]
  )

  const onPublishAction = useCallback(
    async (action: 'publish' | 'unpublish') => {
      setPublishing(true)
      setMessage(null)
      try {
        const result = await publishLanding(landingId, action)
        setStatus(result.status)
        setMessage({
          tone: 'ok',
          text:
            action === 'publish'
              ? 'Publicada. Ya se puede abrir la dirección pública.'
              : 'Despublicada. La dirección pública deja de responder.',
        })
      } catch (err: unknown) {
        setMessage({
          tone: 'error',
          text: err instanceof Error ? err.message : 'No se pudo cambiar la publicación',
        })
      } finally {
        setPublishing(false)
      }
    },
    [landingId]
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-10 text-gray-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando el borrador…</span>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="px-6 py-10">
        <p className="text-sm text-red-400">{message?.text ?? 'Landing no encontrada'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(LANDINGS_ADMIN_PATH)}>
          Volver al listado
        </Button>
      </div>
    )
  }

  const firstError = Object.keys(formState.errors).length > 0

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href={LANDINGS_ADMIN_PATH}>
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{title || 'Sin título'}</h1>
            <p className="font-mono text-xs text-gray-400">{landingPublicPath(slug)}</p>
          </div>
          <Badge
            className={
              status === 'published'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }
          >
            {status === 'published' ? 'Publicada' : status === 'draft' ? 'Borrador' : 'Archivada'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={landingAdminLeadsPath(landingId)}>
            <Button variant="ghost">
              <Inbox className="mr-2 h-4 w-4" />
              Leads
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => setShowPreview((prev) => !prev)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? 'Ocultar vista previa' : 'Ver vista previa'}
          </Button>
          <Button onClick={handleSubmit(onSave)} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando…' : 'Guardar borrador'}
          </Button>
          {status === 'published' ? (
            <>
              <a href={landingPublicPath(slug)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir
                </Button>
              </a>
              <Button variant="outline" onClick={() => void onPublishAction('unpublish')} disabled={publishing}>
                Despublicar
              </Button>
            </>
          ) : (
            <Button variant="modern" onClick={() => void onPublishAction('publish')} disabled={publishing}>
              <Globe className="mr-2 h-4 w-4" />
              {publishing ? 'Publicando…' : 'Publicar'}
            </Button>
          )}
        </div>
      </header>

      {message && (
        <p className={`mb-4 text-sm ${message.tone === 'ok' ? 'text-emerald-300' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}

      {firstError && (
        <p className="mb-4 text-sm text-amber-300">
          Hay campos inválidos en el formulario. Revisa los bloques marcados antes de guardar.
        </p>
      )}

      <div className={`grid gap-5 ${showPreview ? 'lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]' : ''}`}>
        <div className="space-y-4">
          <Card variant="glass">
            <CardContent className="space-y-3 p-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-300">Título interno</span>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-white/10 text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-300">Dirección pública</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">/p/</span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-white/10 text-white"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-300">
                  Correo para avisos de leads
                </span>
                <Input
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="dueno@negocio.hn"
                  className="bg-white/10 text-white placeholder:text-gray-500"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  Si lo dejas vacío, el aviso llega al correo de quien creó la página.
                </span>
              </label>
              {record.published_at && (
                <p className="text-xs text-gray-500">
                  Última publicación: {formatDateTimeForHonduras(new Date(record.published_at))}
                </p>
              )}
            </CardContent>
          </Card>

          <GlobalFields register={controls.register} />
          <BlockAccordion
            blocks={(values.blocks ?? []) as EditableBlockRef[]}
            control={controls.control}
            register={controls.register}
          />
        </div>

        {showPreview && (
          <div className="space-y-2">
            {preview.stale && (
              <p className="text-xs text-amber-300">
                Vista previa en pausa: hay un campo incompleto. Se muestra la última versión válida.
              </p>
            )}
            <div className="overflow-hidden rounded-xl border border-white/10">
              {preview.page ? (
                <div className="max-h-[80vh] overflow-y-auto">
                  <LandingRenderer page={preview.page} />
                </div>
              ) : (
                <p className="p-6 text-sm text-gray-400">
                  Completa los datos básicos para ver la vista previa.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LandingEditorPage() {
  const router = useRouter()
  const rawId = router.query.id
  const landingId = Array.isArray(rawId) ? rawId[0] : rawId

  return (
    <SuperAdminGuard redirectPath="/app/landings">
      <Head>
        <title>Editor de página | Humano SISU</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AppMeshShell>
        {landingId ? (
          <EditorContent landingId={landingId} />
        ) : (
          <div className="px-6 py-10 text-sm text-gray-300">Cargando…</div>
        )}
      </AppMeshShell>
    </SuperAdminGuard>
  )
}
