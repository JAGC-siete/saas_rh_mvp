import { useCallback, useEffect, useMemo, useState } from 'react'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { useNotificationContext } from '../../../components/NotificationProvider'
import {
  DEFAULT_OUTREACH_BODY,
  DEFAULT_OUTREACH_SUBJECT,
  MAX_PROSPECTION_SEND_BATCH,
  PREFERRED_SEND_CONFIDENCES,
  renderOutreachBody,
  type B2bProspectCandidate,
  type B2bProspectContact,
  type B2bProspectRun,
} from '../../../lib/admin/prospection'
import {
  normalizeResearchImport,
  parseResearchImportPaste,
} from '../../../lib/admin/prospection-research'
import { DEFAULT_WHATSAPP_TEMPLATE } from '../../../lib/admin/prospection-whatsapp'
import {
  MapPin,
  Search,
  Send,
  MessageCircle,
  RefreshCw,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  ClipboardPaste,
} from 'lucide-react'

type LedgerRow = {
  id: string
  contact_id: string
  to_email: string
  status: string
  resend_id: string | null
  error: string | null
  sent_at: string
}

type WaResult = {
  contactId: string
  comercio: string
  status: string
  link: string | null
  message: string | null
  error: string | null
}

type Step = 1 | 2 | 3 | 4

async function readJson(res: Response) {
  return res.json().catch(() => ({ success: false, error: 'Respuesta inválida' }))
}

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Parámetros' },
  { id: 2, label: 'Resultados' },
  { id: 3, label: 'Outreach' },
  { id: 4, label: 'Auditoría' },
]

export default function ProspectionPage() {
  const { addNotification } = useNotificationContext()

  const [step, setStep] = useState<Step>(1)
  const [runs, setRuns] = useState<B2bProspectRun[]>([])
  const [run, setRun] = useState<B2bProspectRun | null>(null)
  const [candidates, setCandidates] = useState<B2bProspectCandidate[]>([])
  const [contacts, setContacts] = useState<B2bProspectContact[]>([])
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [researching, setResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [ciudad, setCiudad] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [rubros, setRubros] = useState('ferreterías, agroferreterías, comercial ferretero')
  const [importJson, setImportJson] = useState('')

  const [emailSubject, setEmailSubject] = useState(DEFAULT_OUTREACH_SUBJECT)
  const [emailBody, setEmailBody] = useState(DEFAULT_OUTREACH_BODY)
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE)

  const [candidateSelected, setCandidateSelected] = useState<Set<string>>(new Set())
  const [contactSelected, setContactSelected] = useState<Set<string>>(new Set())
  const [waResults, setWaResults] = useState<WaResult[] | null>(null)

  const previewBody = useMemo(
    () => renderOutreachBody(emailBody, run?.ciudad || ciudad || 'Siguatepeque'),
    [emailBody, run?.ciudad, ciudad]
  )

  const importPreview = useMemo(() => {
    const raw = importJson.trim()
    if (!raw) return { ok: false as const, count: 0, error: null as string | null }
    try {
      const rows = parseResearchImportPaste(raw)
      const normalized = normalizeResearchImport(rows)
      if (!normalized.length) {
        return { ok: false as const, count: 0, error: 'JSON sin comercios válidos (falta campo comercio)' }
      }
      return { ok: true as const, count: normalized.length, error: null }
    } catch (e) {
      return {
        ok: false as const,
        count: 0,
        error: e instanceof Error ? e.message : 'JSON inválido',
      }
    }
  }, [importJson])

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/admin/prospection/runs', { credentials: 'include' })
    const data = await readJson(res)
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudieron cargar corridas')
    setRuns(data.data.runs || [])
  }, [])

  const loadRun = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/prospection/runs/${id}`, { credentials: 'include' })
    const data = await readJson(res)
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo cargar la corrida')
    const nextRun = data.data.run as B2bProspectRun
    const nextCandidates = (data.data.candidates || []) as B2bProspectCandidate[]
    const nextContacts = (data.data.contacts || []) as B2bProspectContact[]
    setRun(nextRun)
    setCandidates(nextCandidates)
    setContacts(nextContacts)
    setLedger(data.data.ledger || [])
    setEmailSubject(nextRun.email_subject)
    setEmailBody(nextRun.email_body)
    setCiudad(nextRun.ciudad)
    setDepartamento(nextRun.departamento || '')
    setRubros((nextRun.rubros || []).join(', '))
    setCandidateSelected(
      new Set(
        nextCandidates
          .filter((c) => c.selected || (PREFERRED_SEND_CONFIDENCES as readonly string[]).includes(c.confianza))
          .map((c) => c.id)
      )
    )
    setContactSelected(new Set())
    setWaResults(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await fetchRuns()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchRuns])

  const investigate = async (mode: 'serper' | 'import' = 'serper') => {
    if (!ciudad.trim() || !departamento.trim() || !rubros.trim()) {
      addNotification({
        type: 'error',
        title: 'Campos requeridos',
        message: 'Rubro(s), ciudad y departamento son obligatorios.',
      })
      return
    }

    if (mode === 'import') {
      if (!importPreview.ok) {
        addNotification({
          type: 'error',
          title: 'JSON',
          message: importPreview.error || 'Pega el JSON del skill antes de cargar.',
        })
        return
      }
    }

    try {
      setResearching(true)
      setBusy(true)
      setError(null)

      const createRes = await fetch('/api/admin/prospection/runs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciudad: ciudad.trim(),
          departamento: departamento.trim(),
          rubros,
          email_subject: emailSubject,
          email_body: emailBody,
        }),
      })
      const createData = await readJson(createRes)
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'No se pudo crear la corrida')
      }

      const runId = createData.data.run.id as string
      const researchBody: Record<string, unknown> = {}
      if (mode === 'import' || importJson.trim()) {
        researchBody.candidates = parseResearchImportPaste(importJson)
      }

      const researchRes = await fetch(`/api/admin/prospection/runs/${runId}/research`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(researchBody),
      })
      const researchData = await readJson(researchRes)
      if (!researchRes.ok || !researchData.success) {
        throw new Error(researchData.error || 'Investigación falló')
      }

      await fetchRuns()
      await loadRun(runId)
      setStep(2)
      addNotification({
        type: 'success',
        title: mode === 'import' ? 'JSON cargado' : 'Investigación lista',
        message: `${researchData.data.summary?.found ?? 0} hallazgos`,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      addNotification({ type: 'error', title: 'Investigación', message })
    } finally {
      setResearching(false)
      setBusy(false)
    }
  }

  const toggleCandidate = (id: string) => {
    setCandidateSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const loadSelected = async () => {
    if (!run || candidateSelected.size === 0) return
    try {
      setBusy(true)
      const res = await fetch(`/api/admin/prospection/runs/${run.id}/load-selected`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds: Array.from(candidateSelected) }),
      })
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo cargar')
      await loadRun(run.id)
      setStep(3)
      addNotification({
        type: 'success',
        title: 'Tabla de trabajo',
        message: `${data.data.summary?.loaded ?? 0} contactos cargados`,
      })
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const toggleContact = (id: string) => {
    setContactSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectContactsPreferred = () => {
    setContactSelected(
      new Set(
        contacts
          .filter(
            (c) =>
              (c.email_normalized || c.email || c.telefono) &&
              (PREFERRED_SEND_CONFIDENCES as readonly string[]).includes(c.confianza)
          )
          .map((c) => c.id)
          .slice(0, MAX_PROSPECTION_SEND_BATCH)
      )
    )
  }

  const saveTemplate = async () => {
    if (!run) return
    const res = await fetch(`/api/admin/prospection/runs/${run.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_subject: emailSubject, email_body: emailBody }),
    })
    const data = await readJson(res)
    if (!res.ok || !data.success) {
      addNotification({ type: 'error', title: 'Plantilla', message: data.error || 'Error' })
      return
    }
    setRun(data.data.run)
    addNotification({ type: 'success', title: 'Plantilla guardada', message: 'OK' })
  }

  const sendEmails = async (dryRun: boolean) => {
    if (!run || contactSelected.size === 0) return
    if (contactSelected.size > MAX_PROSPECTION_SEND_BATCH) {
      addNotification({
        type: 'error',
        title: 'Batch',
        message: `Máximo ${MAX_PROSPECTION_SEND_BATCH} por envío`,
      })
      return
    }
    if (!dryRun) {
      const ok = confirm(
        `Enviar correo REAL a ${contactSelected.size} contacto(s)?\nIdempotente (no reenvía sent).\nNo enrolla marketing_leads.`
      )
      if (!ok) return
    }
    try {
      setBusy(true)
      const res = await fetch(`/api/admin/prospection/runs/${run.id}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: Array.from(contactSelected),
          dryRun,
          email_subject: emailSubject,
          email_body: emailBody,
          persistTemplate: true,
        }),
      })
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'Envío falló')
      await loadRun(run.id)
      setStep(4)
      const s = data.data.summary
      addNotification({
        type: dryRun ? 'info' : 'success',
        title: dryRun ? 'Dry-run' : 'Enviado',
        message: `sent=${s.sent} dry=${s.dryRun} skip=${s.skipped} err=${s.errors}`,
      })
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Envío',
        message: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const generateWhatsApp = async () => {
    if (!run || contactSelected.size === 0) return
    try {
      setBusy(true)
      const res = await fetch(`/api/admin/prospection/runs/${run.id}/whatsapp`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: Array.from(contactSelected),
          whatsapp_template: waTemplate,
        }),
      })
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'WhatsApp falló')
      setWaResults(data.data.results || [])
      await loadRun(run.id)
      setStep(4)
      addNotification({
        type: 'success',
        title: 'WhatsApp',
        message: `${data.data.summary?.ok ?? 0} enlaces wa.me generados`,
      })
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'WhatsApp',
        message: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const openExistingRun = async (id: string) => {
    try {
      setBusy(true)
      await loadRun(id)
      setStep(2)
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <div className="space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <MapPin className="h-6 w-6 text-brand-400" aria-hidden />
                Prospección leads
              </h1>
              <p className="text-sm text-white/60 mt-1">
                Parámetros → Investigar → Seleccionar → Outreach (correo / WhatsApp)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white"
              disabled={busy || loading}
              onClick={async () => {
                await fetchRuns()
                if (run) await loadRun(run.id)
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </div>

          {/* Stepper */}
          <div className="flex flex-wrap gap-2">
            {STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  step === s.id
                    ? 'border-brand-400/40 bg-brand-600/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="font-semibold">{idx + 1}</span>
                {s.label}
                {idx < STEPS.length - 1 && <ChevronRight className="h-3 w-3 opacity-40" />}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card variant="liquid" className="border-white/10 xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">1. Parámetros de búsqueda</CardTitle>
                  <CardDescription className="text-white/60">
                    Rubro(s), ciudad y departamento obligatorios. País: Honduras.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                    placeholder="Rubro(s) * — ej. ferreterías, agroferreterías"
                    value={rubros}
                    onChange={(e) => setRubros(e.target.value)}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                      placeholder="Ciudad *"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                    />
                    <input
                      className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                      placeholder="Departamento *"
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value)}
                    />
                  </div>

                  <div className="rounded-lg border border-brand-400/30 bg-brand-600/10 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <ClipboardPaste className="h-5 w-5 text-brand-300 mt-0.5 shrink-0" aria-hidden />
                      <div>
                        <p className="text-sm font-medium text-white">Pegar resultados del agente</p>
                        <p className="text-xs text-white/55 mt-0.5">
                          Copia el bloque JSON de la skill{' '}
                          <code className="text-white/80">local-business-leads</code> y pégalo aquí.
                          Acepta array, {'{ "candidates": [] }'} o bloque markdown json del agente.
                        </p>
                      </div>
                    </div>
                    <textarea
                      id="prospection-import-json"
                      aria-label="Pegar JSON de hallazgos del agente"
                      className="w-full min-h-[180px] rounded-md bg-black/30 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                      placeholder={`[\n  {\n    "comercio": "Ferretería Ejemplo",\n    "rubro": "ferretería",\n    "telefono": "+504 9999-0000",\n    "email": "ventas@ejemplo.hn",\n    "confianza": "alta",\n    "fuentes": "Maps; sitio"\n  }\n]`}
                      value={importJson}
                      onChange={(e) => setImportJson(e.target.value)}
                    />
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <p className="text-xs text-white/50">
                        {importJson.trim() === '' && 'Sin JSON todavía.'}
                        {importJson.trim() !== '' && importPreview.ok && (
                          <span className="text-emerald-300">
                            {importPreview.count} comercios listos para cargar
                          </span>
                        )}
                        {importJson.trim() !== '' && !importPreview.ok && (
                          <span className="text-amber-300">{importPreview.error}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {importJson.trim() !== '' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-white/70"
                            onClick={() => setImportJson('')}
                          >
                            Limpiar
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => investigate('import')}
                          disabled={busy || researching || !importPreview.ok}
                        >
                          {researching ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Cargando…
                            </>
                          ) : (
                            <>
                              <ClipboardPaste className="h-4 w-4 mr-2" />
                              Cargar JSON pegado
                              {importPreview.ok ? ` (${importPreview.count})` : ''}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/20 text-white"
                      onClick={() => investigate('serper')}
                      disabled={busy || researching || importJson.trim() !== ''}
                      title={
                        importJson.trim()
                          ? 'Limpia el JSON para investigar con Serper'
                          : 'Buscar con SERPER_API_KEY'
                      }
                    >
                      {researching ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Investigando…
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Investigar con Serper
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-white/40">
                      Con JSON pegado usa “Cargar JSON pegado”. Serper queda deshabilitado hasta limpiar.
                    </p>
                  </div>
                  {researching && (
                    <p className="text-xs text-white/50">
                      No se inventan teléfonos ni emails. Tras cargar → paso 2 (selección).
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card variant="liquid" className="border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-base">Corridas recientes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[360px] overflow-y-auto">
                  {loading && <p className="text-sm text-white/50">Cargando…</p>}
                  {!loading && runs.length === 0 && (
                    <p className="text-sm text-white/50">Sin corridas.</p>
                  )}
                  {runs.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openExistingRun(r.id)}
                      className="w-full text-left rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-sm text-white font-medium">{r.ciudad}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/50 truncate mt-1">
                        {(r.rubros || []).join(', ')}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {step === 2 && (
            <Card variant="liquid" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">2. Resultados de investigación</CardTitle>
                <CardDescription className="text-white/60">
                  {run
                    ? `${run.ciudad}${run.departamento ? `, ${run.departamento}` : ''} — marca los relevantes`
                    : 'Sin corrida activa'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white"
                    onClick={() =>
                      setCandidateSelected(
                        new Set(
                          candidates
                            .filter((c) =>
                              (PREFERRED_SEND_CONFIDENCES as readonly string[]).includes(c.confianza)
                            )
                            .map((c) => c.id)
                        )
                      )
                    }
                  >
                    Preseleccionar alta/media
                  </Button>
                  <Button onClick={loadSelected} disabled={busy || candidateSelected.size === 0}>
                    Cargar seleccionados a la tabla de trabajo ({candidateSelected.size})
                  </Button>
                  <Button variant="outline" size="sm" className="border-white/20 text-white" onClick={() => setStep(1)}>
                    Volver
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/5 text-white/60 text-left">
                      <tr>
                        <th className="px-3 py-2"> </th>
                        <th className="px-3 py-2">Comercio</th>
                        <th className="px-3 py-2">Teléfono</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Confianza</th>
                        <th className="px-3 py-2">Fuentes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/90">
                      {candidates.map((c) => (
                        <tr key={c.id}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={candidateSelected.has(c.id)}
                              onChange={() => toggleCandidate(c.id)}
                            />
                          </td>
                          <td className="px-3 py-2">{c.comercio}</td>
                          <td className="px-3 py-2 text-white/70">{c.telefono || '—'}</td>
                          <td className="px-3 py-2 text-white/70">{c.email || '—'}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">{c.confianza}</Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-white/50 max-w-[220px] truncate">
                            {c.fuentes || '—'}
                          </td>
                        </tr>
                      ))}
                      {candidates.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-white/40">
                            Sin hallazgos. Vuelve a Investigar o importa JSON.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Card variant="liquid" className="border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">3. Tabla de trabajo + plantillas</CardTitle>
                  <CardDescription className="text-white/60">
                    Selecciona destinatarios. Correo vía Resend o genera wa.me (sin auto-enviar).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs text-white/50">Plantilla correo (usa {'{{ciudad}}'})</p>
                      <input
                        className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                      <textarea
                        className="w-full min-h-[140px] rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono"
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                      />
                      <Button variant="outline" size="sm" className="border-white/20 text-white" onClick={saveTemplate}>
                        Guardar plantilla
                      </Button>
                      <pre className="text-xs text-white/50 whitespace-pre-wrap border border-white/10 rounded-md p-3">
                        {previewBody}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-white/50">Plantilla WhatsApp (corta)</p>
                      <textarea
                        className="w-full min-h-[140px] rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono"
                        value={waTemplate}
                        onChange={(e) => setWaTemplate(e.target.value)}
                      />
                      <p className="text-xs text-white/40">
                        Solo genera enlaces wa.me — no envía mensajes automáticamente.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="border-white/20 text-white" onClick={selectContactsPreferred}>
                      Seleccionar alta/media (máx {MAX_PROSPECTION_SEND_BATCH})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white"
                      disabled={busy || contactSelected.size === 0}
                      onClick={() => sendEmails(true)}
                    >
                      Simular correo
                    </Button>
                    <Button disabled={busy || contactSelected.size === 0} onClick={() => sendEmails(false)}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar correo ({contactSelected.size})
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 text-white"
                      disabled={busy || contactSelected.size === 0}
                      onClick={generateWhatsApp}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Generar WhatsApp
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="min-w-full divide-y divide-white/10 text-sm">
                      <thead className="bg-white/5 text-white/60 text-left">
                        <tr>
                          <th className="px-3 py-2"> </th>
                          <th className="px-3 py-2">Comercio</th>
                          <th className="px-3 py-2">Teléfono</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Confianza</th>
                          <th className="px-3 py-2">WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-white/90">
                        {contacts.map((c) => (
                          <tr key={c.id}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={contactSelected.has(c.id)}
                                onChange={() => toggleContact(c.id)}
                              />
                            </td>
                            <td className="px-3 py-2">{c.comercio}</td>
                            <td className="px-3 py-2 text-white/70">{c.telefono || '—'}</td>
                            <td className="px-3 py-2 text-white/70">{c.email || '—'}</td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary">{c.confianza}</Badge>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {c.whatsapp_link ? (
                                <a
                                  href={c.whatsapp_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-300 hover:underline"
                                >
                                  wa.me
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                        {contacts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-white/40">
                              Carga contactos desde el paso 2.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <Card variant="liquid" className="border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">4. Auditoría</CardTitle>
                  <CardDescription className="text-white/60">
                    Ledger de correos y enlaces WhatsApp generados (persistidos en la corrida).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-white mb-2">Correo (ledger)</p>
                    <ul className="space-y-1 text-xs text-white/60">
                      {ledger.length === 0 && <li>Sin envíos aún.</li>}
                      {ledger.slice(0, 30).map((row) => (
                        <li key={row.id}>
                          {row.sent_at}: {row.to_email || '(sin email)'} — {row.status}
                          {row.error ? ` (${row.error})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm text-white mb-2">WhatsApp</p>
                    <div className="space-y-2">
                      {(waResults || contacts.filter((c) => c.whatsapp_link)).length === 0 && (
                        <p className="text-xs text-white/50">Sin enlaces generados.</p>
                      )}
                      {(waResults ||
                        contacts
                          .filter((c) => c.whatsapp_link)
                          .map((c) => ({
                            contactId: c.id,
                            comercio: c.comercio,
                            status: 'ok',
                            link: c.whatsapp_link || null,
                            message: c.whatsapp_message || null,
                            error: null,
                          }))
                      ).map((r) => (
                        <div
                          key={r.contactId}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex flex-wrap items-center gap-2 justify-between"
                        >
                          <div>
                            <p className="text-sm text-white">{r.comercio}</p>
                            <p className="text-xs text-white/50">
                              {r.status === 'ok' ? 'wa.me listo' : r.error || 'sin WhatsApp'}
                            </p>
                          </div>
                          {r.link && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/20 text-white"
                                onClick={() => navigator.clipboard.writeText(r.link!)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copiar
                              </Button>
                              <Button size="sm" asChild>
                                <a href={r.link} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Abrir
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
