import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { cn } from '../../lib/utils'
import { useCommunications, type CampaignPayload, type RepoCommit } from '../../lib/hooks/useCommunications'
import {
  SEGMENT_LABELS,
  STATUS_LABELS,
  type AudiencePreview,
  type CampaignRow,
  type CommAction,
  type CommBlock,
  type CommSegment,
  type CommStatus,
} from '../../lib/communications/schema'
import { buildBroadcastEmailHtml } from '../../lib/emails/broadcast'
import { Plus, Trash2, Send, Save, Clock, FileText, History, PencilLine, GitCommit, RefreshCw } from 'lucide-react'

type Tab = 'news' | 'compose' | 'drafts' | 'history'

/** Cleans a conventional-commit subject into a human-friendly block title. */
function commitToTitle(c: RepoCommit): string {
  const stripped = c.title.replace(/^(\w+)(\([^)]+\))?!?:\s*/, '')
  const text = stripped || c.title
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const STATUS_STYLES: Record<CommStatus, string> = {
  draft: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  scheduled: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  sending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  sent: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
}

function StatusBadge({ status }: { status: CommStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

const emptyBlock = (): CommBlock => ({ title: '', description: '' })

export default function CommunicationPanel() {
  const {
    campaigns,
    isLoading,
    isSubmitting,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    fetchCommits,
    fetchAudiencePreview,
  } = useCommunications()

  const [tab, setTab] = useState<Tab>('news')

  // Compose state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [intro, setIntro] = useState('')
  const [blocks, setBlocks] = useState<CommBlock[]>([emptyBlock()])
  const [segment, setSegment] = useState<CommSegment>('active_admins')
  const [ctaUrl, setCtaUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sourceCommits, setSourceCommits] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ kind: 'idle' | 'success' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  })

  // Commits queue state
  const [commits, setCommits] = useState<RepoCommit[]>([])
  const [commitsLoading, setCommitsLoading] = useState(false)
  const [commitsError, setCommitsError] = useState<string | null>(null)
  const [githubNotConfigured, setGithubNotConfigured] = useState(false)
  const [selectedShas, setSelectedShas] = useState<Set<string>>(new Set())
  const [onlyRelevant, setOnlyRelevant] = useState(true)

  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null)
  const [audienceLoading, setAudienceLoading] = useState(false)

  const loadAudiencePreview = useCallback(
    async (seg: CommSegment) => {
      setAudienceLoading(true)
      const preview = await fetchAudiencePreview(seg)
      setAudiencePreview(preview)
      setAudienceLoading(false)
    },
    [fetchAudiencePreview]
  )

  const loadCommits = useCallback(async () => {
    setCommitsLoading(true)
    setCommitsError(null)
    try {
      const { commits: rows, notConfigured } = await fetchCommits()
      setGithubNotConfigured(!!notConfigured)
      setCommits(rows)
    } catch (err) {
      setCommitsError(err instanceof Error ? err.message : 'Error al cargar commits')
    } finally {
      setCommitsLoading(false)
    }
  }, [fetchCommits])

  useEffect(() => {
    fetchCampaigns()
    loadCommits()
  }, [fetchCampaigns, loadCommits])

  useEffect(() => {
    if (tab === 'compose') {
      void loadAudiencePreview(segment)
    }
  }, [tab, segment, loadAudiencePreview])

  const resetForm = useCallback(() => {
    setEditingId(null)
    setSubject('')
    setIntro('')
    setBlocks([emptyBlock()])
    setSegment('active_admins')
    setCtaUrl('')
    setCtaLabel('')
    setScheduledAt('')
    setSourceCommits([])
  }, [])

  const previewHtml = useMemo(
    () =>
      buildBroadcastEmailHtml({
        badge: 'Novedades',
        title: subject || 'Asunto del comunicado',
        intro: intro || undefined,
        blocks: blocks.filter((b) => b.title.trim() || b.description.trim()),
        ctaUrl: ctaUrl || undefined,
        ctaLabel: ctaLabel || undefined,
      }),
    [subject, intro, blocks, ctaUrl, ctaLabel]
  )

  const buildPayload = useCallback(
    (action: CommAction): CampaignPayload => ({
      subject,
      intro: intro || null,
      blocks: blocks.filter((b) => b.title.trim() || b.description.trim()),
      segment,
      cta_url: ctaUrl || null,
      cta_label: ctaLabel || null,
      action,
      scheduled_at: action === 'schedule' ? new Date(scheduledAt).toISOString() : null,
      source_commits: sourceCommits.length ? sourceCommits : null,
    }),
    [subject, intro, blocks, segment, ctaUrl, ctaLabel, scheduledAt, sourceCommits]
  )

  const submit = useCallback(
    async (action: CommAction) => {
      setFeedback({ kind: 'idle', message: '' })
      try {
        const payload = buildPayload(action)
        const result = editingId ? await updateCampaign(editingId, payload) : await createCampaign(payload)
        const msg =
          action === 'send'
            ? `Campaña enviada a ${result?.recipientCount ?? 0} destinatarios.`
            : action === 'schedule'
              ? 'Campaña programada.'
              : 'Borrador guardado.'
        setFeedback({ kind: 'success', message: msg })
        resetForm()
        fetchCampaigns()
        if (action !== 'send') setTab('drafts')
      } catch (err) {
        setFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Error' })
      }
    },
    [buildPayload, editingId, updateCampaign, createCampaign, resetForm, fetchCampaigns]
  )

  const loadIntoEditor = useCallback((c: CampaignRow) => {
    setEditingId(c.id)
    setSubject(c.subject)
    setIntro(c.intro ?? '')
    setBlocks(Array.isArray(c.blocks) && c.blocks.length ? c.blocks : [emptyBlock()])
    setSegment((c.target_segment ?? 'active_admins') as CommSegment)
    setCtaUrl(c.cta_url ?? '')
    setCtaLabel(c.cta_label ?? '')
    setScheduledAt(c.scheduled_at ? c.scheduled_at.slice(0, 16) : '')
    setSourceCommits(Array.isArray(c.source_commits) ? (c.source_commits as string[]) : [])
    setTab('compose')
    setFeedback({ kind: 'idle', message: '' })
  }, [])

  const toggleSha = useCallback((sha: string) => {
    setSelectedShas((prev) => {
      const next = new Set(prev)
      if (next.has(sha)) next.delete(sha)
      else next.add(sha)
      return next
    })
  }, [])

  const createDraftFromCommits = useCallback(() => {
    const chosen = commits.filter((c) => selectedShas.has(c.sha))
    if (chosen.length === 0) return
    setEditingId(null)
    setSubject('Novedades de SISU')
    setIntro('Estas son las mejoras más recientes que ya están disponibles para ti.')
    setBlocks(chosen.map((c) => ({ title: commitToTitle(c), description: c.body || '' })))
    setSegment('active_admins')
    setCtaUrl('')
    setCtaLabel('')
    setScheduledAt('')
    setSourceCommits(chosen.map((c) => c.sha))
    setSelectedShas(new Set())
    setTab('compose')
    setFeedback({ kind: 'idle', message: '' })
  }, [commits, selectedShas])

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deleteCampaign(id)
      if (ok) fetchCampaigns()
    },
    [deleteCampaign, fetchCampaigns]
  )

  const drafts = campaigns.filter((c) => c.status === 'draft' || c.status === 'scheduled')
  const history = campaigns.filter((c) => c.status === 'sent' || c.status === 'failed' || c.status === 'sending')

  const RELEVANT_TYPES = ['feat', 'fix', 'perf']
  const visibleCommits = onlyRelevant
    ? commits.filter((c) => c.type && RELEVANT_TYPES.includes(c.type))
    : commits

  const canSubmit = subject.trim().length >= 3
  const canSchedule = canSubmit && scheduledAt.trim().length > 0

  const TabButton = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: typeof FileText }) => (
    <button
      onClick={() => setTab(id)}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        tab === id ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-white/10'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TabButton id="news" label="Novedades" icon={GitCommit} />
        <TabButton id="compose" label={editingId ? 'Editando' : 'Redactar'} icon={PencilLine} />
        <TabButton id="drafts" label={`Borradores (${drafts.length})`} icon={FileText} />
        <TabButton id="history" label="Historial" icon={History} />
      </div>

      {tab === 'news' && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-white">Commits recientes</CardTitle>
                <p className="text-xs text-gray-400">Selecciona los cambios relevantes para difundir.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={onlyRelevant} onChange={(e) => setOnlyRelevant(e.target.checked)} />
                  Solo feat/fix/perf
                </label>
                <Button size="sm" variant="ghost" onClick={loadCommits} disabled={commitsLoading}>
                  <RefreshCw className={cn('mr-1 h-4 w-4', commitsLoading && 'animate-spin')} /> Actualizar
                </Button>
                <Button size="sm" onClick={createDraftFromCommits} disabled={selectedShas.size === 0}>
                  <Plus className="mr-1 h-4 w-4" /> Crear borrador ({selectedShas.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {githubNotConfigured ? (
              <p className="text-sm text-amber-400">
                GitHub no está configurado. Define <code className="text-amber-300">GITHUB_TOKEN</code> (y opcional{' '}
                <code className="text-amber-300">GITHUB_REPO</code>) para ver la cola de commits.
              </p>
            ) : commitsError ? (
              <p className="text-sm text-red-400">{commitsError}</p>
            ) : commitsLoading ? (
              <p className="text-sm text-gray-400">Cargando commits…</p>
            ) : visibleCommits.length === 0 ? (
              <p className="text-sm text-gray-400">No hay commits para mostrar.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {visibleCommits.map((c) => (
                  <label key={c.sha} className="flex cursor-pointer items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedShas.has(c.sha)}
                      onChange={() => toggleSha(c.sha)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {c.type && (
                          <span className="rounded bg-brand-600/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-200">
                            {c.type}
                          </span>
                        )}
                        <p className="truncate text-sm font-medium text-white">{commitToTitle(c)}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {c.shortSha} · {c.author} · {formatDate(c.date)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'compose' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Editor */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">{editingId ? 'Editar comunicado' : 'Nuevo comunicado'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Asunto</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Ej. Novedades de la semana" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Introducción (opcional)</label>
                <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} maxLength={1000} placeholder="Texto del encabezado" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Novedades</label>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setBlocks((b) => [...b, emptyBlock()])}>
                    <Plus className="mr-1 h-4 w-4" /> Agregar
                  </Button>
                </div>
                {blocks.map((b, i) => (
                  <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={b.title}
                        onChange={(e) => setBlocks((arr) => arr.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                        placeholder="Título del cambio"
                        maxLength={120}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setBlocks((arr) => (arr.length > 1 ? arr.filter((_, j) => j !== i) : arr))}
                        aria-label="Eliminar bloque"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                    <Textarea
                      value={b.description}
                      onChange={(e) => setBlocks((arr) => arr.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                      rows={2}
                      maxLength={2000}
                      placeholder="Descripción"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">CTA URL (opcional)</label>
                  <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://humanosisu.net/app" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">CTA texto (opcional)</label>
                  <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Ver en el panel" maxLength={60} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Segmento</label>
                  <select
                    value={segment}
                    onChange={(e) => setSegment(e.target.value as CommSegment)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {(Object.keys(SEGMENT_LABELS) as CommSegment[]).map((value) => (
                      <option key={value} value={value}>
                        {SEGMENT_LABELS[value]}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 min-h-[2.5rem]">
                    {audienceLoading ? (
                      <p className="text-xs text-gray-400">Calculando destinatarios…</p>
                    ) : audiencePreview ? (
                      <div className="space-y-1">
                        <p
                          className={cn(
                            'text-xs',
                            audiencePreview.ready ? 'text-emerald-400' : audiencePreview.recipientCount > 0 ? 'text-amber-400' : 'text-red-400'
                          )}
                        >
                          {audiencePreview.recipientCount > 0
                            ? `${audiencePreview.recipientCount} destinatario${audiencePreview.recipientCount === 1 ? '' : 's'}`
                            : '0 destinatarios para este segmento'}
                          {audiencePreview.profilesMatched > audiencePreview.recipientCount &&
                            audiencePreview.recipientCount > 0 &&
                            ` (${audiencePreview.skippedNoEmail} sin email en Auth)`}
                        </p>
                        {audiencePreview.sampleCompanies.length > 0 && (
                          <p className="text-xs text-gray-500">
                            Ej.: {audiencePreview.sampleCompanies.slice(0, 3).join(', ')}
                          </p>
                        )}
                        {audiencePreview.warnings.map((w) => (
                          <p key={w} className="text-xs text-amber-400">
                            {w}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No se pudo cargar el conteo de destinatarios.</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Programar (opcional)</label>
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </div>
              </div>

              {feedback.kind !== 'idle' && (
                <p className={feedback.kind === 'success' ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>
                  {feedback.message}
                </p>
              )}
              {error && feedback.kind === 'idle' && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => submit('send')}
                  disabled={isSubmitting || !canSubmit || (audiencePreview !== null && audiencePreview.recipientCount === 0)}
                >
                  <Send className="mr-1 h-4 w-4" /> Enviar ahora
                </Button>
                <Button
                  variant="outline"
                  onClick={() => submit('schedule')}
                  disabled={isSubmitting || !canSchedule || (audiencePreview !== null && audiencePreview.recipientCount === 0)}
                >
                  <Clock className="mr-1 h-4 w-4" /> Programar
                </Button>
                <Button variant="ghost" onClick={() => submit('draft')} disabled={isSubmitting || !canSubmit}>
                  <Save className="mr-1 h-4 w-4" /> Guardar borrador
                </Button>
                {editingId && (
                  <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>
                    Cancelar edición
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Vista previa</CardTitle>
              <p className="text-xs text-gray-400">Así se verá el correo (estilo SISU).</p>
            </CardHeader>
            <CardContent>
              <iframe title="preview" srcDoc={previewHtml} className="h-[560px] w-full rounded-lg border border-white/10 bg-white" />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'drafts' && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-gray-400">Cargando…</p>
            ) : drafts.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">No hay borradores ni programados.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {drafts.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{c.subject}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {c.status === 'scheduled' ? `Programado: ${formatDate(c.scheduled_at)}` : `Editado: ${formatDate(c.updated_at)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={c.status} />
                      <Button size="sm" variant="ghost" onClick={() => loadIntoEditor(c)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'history' && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-gray-400">Cargando…</p>
            ) : history.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Aún no hay comunicados enviados.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {history.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{c.subject}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {SEGMENT_LABELS[(c.target_segment ?? 'active_admins') as CommSegment]} · {formatDate(c.updated_at)}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
