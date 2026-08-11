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
  type B2bProspectConfidence,
  type B2bProspectContact,
  type B2bProspectRun,
} from '../../../lib/admin/prospection'
import { MapPin, Plus, Send, Trash2, Upload, RefreshCw, Mail } from 'lucide-react'

type LedgerRow = {
  id: string
  contact_id: string
  to_email: string
  status: string
  resend_id: string | null
  error: string | null
  sent_at: string
}

type SendResultRow = {
  contactId: string
  comercio: string
  to: string
  status: string
  resendId: string | null
  error: string | null
}

async function readJson(res: Response) {
  return res.json().catch(() => ({ success: false, error: 'Respuesta inválida' }))
}

export default function ProspectionPage() {
  const { addNotification } = useNotificationContext()

  const [runs, setRuns] = useState<B2bProspectRun[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [run, setRun] = useState<B2bProspectRun | null>(null)
  const [contacts, setContacts] = useState<B2bProspectContact[]>([])
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New run form
  const [ciudad, setCiudad] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [rubros, setRubros] = useState('ferreterías, agroferreterías, comercial ferretero')

  // Editable template (synced from selected run)
  const [emailSubject, setEmailSubject] = useState(DEFAULT_OUTREACH_SUBJECT)
  const [emailBody, setEmailBody] = useState(DEFAULT_OUTREACH_BODY)

  // Manual contact
  const [comercio, setComercio] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRubro, setContactRubro] = useState('')
  const [confianza, setConfianza] = useState<B2bProspectConfidence>('media')

  // Import JSON
  const [importJson, setImportJson] = useState('')

  // Selection + send
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSendResults, setLastSendResults] = useState<SendResultRow[] | null>(null)

  const previewBody = useMemo(
    () => renderOutreachBody(emailBody, run?.ciudad || ciudad || 'Siguatepeque'),
    [emailBody, run?.ciudad, ciudad]
  )

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/admin/prospection/runs', { credentials: 'include' })
    const data = await readJson(res)
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudieron cargar las corridas')
    }
    setRuns(data.data.runs || [])
  }, [])

  const loadRun = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/prospection/runs/${id}`, { credentials: 'include' })
    const data = await readJson(res)
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudo cargar la corrida')
    }
    const nextRun = data.data.run as B2bProspectRun
    setRun(nextRun)
    setContacts(data.data.contacts || [])
    setLedger(data.data.ledger || [])
    setEmailSubject(nextRun.email_subject)
    setEmailBody(nextRun.email_body)
    setSelectedIds(new Set())
    setLastSendResults(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
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

  useEffect(() => {
    if (!selectedRunId) {
      setRun(null)
      setContacts([])
      setLedger([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setBusy(true)
        setError(null)
        await loadRun(selectedRunId)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          addNotification({
            type: 'error',
            title: 'Error',
            message: e instanceof Error ? e.message : String(e),
          })
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedRunId, loadRun, addNotification])

  const createRun = async () => {
    if (!ciudad.trim()) {
      addNotification({ type: 'error', title: 'Ciudad requerida', message: 'Indica la ciudad de la corrida.' })
      return
    }
    try {
      setBusy(true)
      const res = await fetch('/api/admin/prospection/runs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciudad: ciudad.trim(),
          departamento: departamento.trim() || null,
          rubros,
          email_subject: emailSubject,
          email_body: emailBody,
        }),
      })
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo crear')
      await fetchRuns()
      setSelectedRunId(data.data.run.id)
      addNotification({ type: 'success', title: 'Corrida creada', message: data.data.run.ciudad })
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

  const saveTemplate = async () => {
    if (!selectedRunId) return
    try {
      setBusy(true)
      const res = await fetch(`/api/admin/prospection/runs/${selectedRunId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_subject: emailSubject, email_body: emailBody }),
      })
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar')
      setRun(data.data.run)
      addNotification({ type: 'success', title: 'Plantilla guardada', message: 'Asunto y cuerpo actualizados.' })
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

  const addContact = async () => {
    if (!selectedRunId || !comercio.trim()) return
    try {
      setBusy(true)
      const res = await fetch(`/api/admin/prospection/runs/${selectedRunId}/contacts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comercio: comercio.trim(),
          email: contactEmail.trim() || null,
          telefono: contactPhone.trim() || null,
          rubro: contactRubro.trim() || null,
          confianza,
        }),
      })
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo agregar')
      setComercio('')
      setContactEmail('')
      setContactPhone('')
      setContactRubro('')
      await loadRun(selectedRunId)
      addNotification({ type: 'success', title: 'Contacto agregado', message: 'OK' })
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

  const importContacts = async () => {
    if (!selectedRunId) return
    try {
      const parsed = JSON.parse(importJson)
      const contactsPayload = Array.isArray(parsed) ? parsed : parsed.contacts
      if (!Array.isArray(contactsPayload)) throw new Error('JSON debe ser un array de contactos')
      setBusy(true)
      const res = await fetch(`/api/admin/prospection/runs/${selectedRunId}/contacts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: contactsPayload }),
      })
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'Import falló')
      setImportJson('')
      await loadRun(selectedRunId)
      addNotification({
        type: 'success',
        title: 'Importación',
        message: `${data.data.imported || 0} contactos`,
      })
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error import',
        message: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const deleteContact = async (contactId: string) => {
    if (!selectedRunId) return
    if (!confirm('¿Eliminar este contacto?')) return
    try {
      setBusy(true)
      const res = await fetch(
        `/api/admin/prospection/runs/${selectedRunId}/contacts/${contactId}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo eliminar')
      await loadRun(selectedRunId)
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectWithEmail = () => {
    setSelectedIds(
      new Set(
        contacts
          .filter((c) => {
            const hasEmail = Boolean(c.email_normalized || c.email)
            if (!hasEmail) return false
            if (c.confianza === 'descartado') return false
            return (PREFERRED_SEND_CONFIDENCES as readonly string[]).includes(c.confianza)
          })
          .map((c) => c.id)
          .slice(0, MAX_PROSPECTION_SEND_BATCH)
      )
    )
  }

  const sendEmails = async (dryRun: boolean) => {
    if (!selectedRunId || selectedIds.size === 0) return
    if (selectedIds.size > MAX_PROSPECTION_SEND_BATCH) {
      addNotification({
        type: 'error',
        title: 'Batch grande',
        message: `Máximo ${MAX_PROSPECTION_SEND_BATCH} por envío. Reduce la selección.`,
      })
      return
    }
    if (!dryRun) {
      const ok = confirm(
        `Enviar correo REAL a ${selectedIds.size} contacto(s) vía Resend?\n` +
          `Re-envíos a contactos ya enviados se omiten (idempotente).\n` +
          `No se enrollarán en marketing_leads.`
      )
      if (!ok) return
    }
    try {
      setBusy(true)
      const res = await fetch(`/api/admin/prospection/runs/${selectedRunId}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          dryRun,
          email_subject: emailSubject,
          email_body: emailBody,
          persistTemplate: true,
        }),
      })
      const data = await readJson(res)
      if (!res.ok || !data.success) throw new Error(data.error || 'Envío falló')
      setLastSendResults(data.data.results || [])
      await loadRun(selectedRunId)
      const s = data.data.summary
      addNotification({
        type: dryRun ? 'info' : 'success',
        title: dryRun ? 'Dry-run OK' : 'Envío completado',
        message: `sent=${s.sent} dry=${s.dryRun} err=${s.errors} skip=${s.skipped}`,
      })
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error envío',
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
                Corridas por ciudad/rubro, import de contactos y outreach Resend (sin enroll marketing).
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await fetchRuns()
                if (selectedRunId) await loadRun(selectedRunId)
              }}
              disabled={busy || loading}
              className="border-white/20 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Runs list + create */}
            <Card variant="liquid" className="border-white/10 xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-white">Corridas</CardTitle>
                <CardDescription className="text-white/60">
                  Nueva búsqueda (import/manual en MVP)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <input
                    className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                    placeholder="Ciudad *"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                  />
                  <input
                    className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                    placeholder="Departamento"
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                  />
                  <input
                    className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                    placeholder="Rubros (coma)"
                    value={rubros}
                    onChange={(e) => setRubros(e.target.value)}
                  />
                  <Button onClick={createRun} disabled={busy} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear corrida
                  </Button>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {loading && <p className="text-sm text-white/50">Cargando…</p>}
                  {!loading && runs.length === 0 && (
                    <p className="text-sm text-white/50">Sin corridas aún.</p>
                  )}
                  {runs.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRunId(r.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                        selectedRunId === r.id
                          ? 'border-brand-400/40 bg-brand-600/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white">{r.ciudad}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/50 truncate mt-1">
                        {(r.rubros || []).join(', ') || 'sin rubros'}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contacts + template */}
            <div className="xl:col-span-2 space-y-6">
              {!run ? (
                <Card variant="liquid" className="border-white/10">
                  <CardContent className="py-12 text-center text-white/50 text-sm">
                    Selecciona o crea una corrida para gestionar contactos y envío.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card variant="liquid" className="border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Mail className="h-5 w-5 text-brand-400" />
                        Plantilla editable
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        Usa {'{{ciudad}}'} — se sustituye al enviar. Ciudad actual:{' '}
                        <strong className="text-white">{run.ciudad}</strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <input
                        className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Asunto"
                      />
                      <textarea
                        className="w-full min-h-[180px] rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono"
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                      />
                      <div className="rounded-md border border-white/10 bg-black/20 p-3">
                        <p className="text-xs text-white/40 mb-2">Preview</p>
                        <p className="text-sm text-white font-medium mb-2">{emailSubject}</p>
                        <pre className="text-xs text-white/70 whitespace-pre-wrap font-sans">
                          {previewBody}
                        </pre>
                      </div>
                      <Button variant="outline" onClick={saveTemplate} disabled={busy} className="border-white/20 text-white">
                        Guardar plantilla
                      </Button>
                    </CardContent>
                  </Card>

                  <Card variant="liquid" className="border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Contactos</CardTitle>
                      <CardDescription className="text-white/60">
                        Alta manual o import JSON (array con comercio, email, …)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                          placeholder="Comercio *"
                          value={comercio}
                          onChange={(e) => setComercio(e.target.value)}
                        />
                        <input
                          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                          placeholder="Email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                        />
                        <input
                          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                          placeholder="Teléfono"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                        />
                        <input
                          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                          placeholder="Rubro"
                          value={contactRubro}
                          onChange={(e) => setContactRubro(e.target.value)}
                        />
                        <select
                          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                          value={confianza}
                          onChange={(e) => setConfianza(e.target.value as B2bProspectConfidence)}
                        >
                          <option value="alta">alta</option>
                          <option value="media">media</option>
                          <option value="baja">baja</option>
                          <option value="descartado">descartado</option>
                        </select>
                        <Button onClick={addContact} disabled={busy || !comercio.trim()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <textarea
                          className="w-full min-h-[90px] rounded-md bg-white/5 border border-white/10 px-3 py-2 text-xs text-white font-mono"
                          placeholder='[{"comercio":"…","email":"…","telefono":"…","confianza":"alta"}]'
                          value={importJson}
                          onChange={(e) => setImportJson(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          onClick={importContacts}
                          disabled={busy || !importJson.trim()}
                          className="border-white/20 text-white"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Importar JSON
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={selectWithEmail} className="border-white/20 text-white">
                          Seleccionar alta/media c/ email (máx {MAX_PROSPECTION_SEND_BATCH})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedIds(new Set())}
                          className="border-white/20 text-white"
                        >
                          Limpiar selección
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || selectedIds.size === 0}
                          onClick={() => sendEmails(true)}
                          className="border-white/20 text-white"
                        >
                          Simular envío
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy || selectedIds.size === 0}
                          onClick={() => sendEmails(false)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Enviar ({selectedIds.size})
                        </Button>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-white/10">
                        <table className="min-w-full divide-y divide-white/10 text-sm">
                          <thead className="bg-white/5">
                            <tr className="text-left text-white/60">
                              <th className="px-3 py-2"> </th>
                              <th className="px-3 py-2">Comercio</th>
                              <th className="px-3 py-2">Email</th>
                              <th className="px-3 py-2">Tel</th>
                              <th className="px-3 py-2">Confianza</th>
                              <th className="px-3 py-2"> </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {contacts.map((c) => (
                              <tr key={c.id} className="text-white/90">
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(c.id)}
                                    onChange={() => toggleSelect(c.id)}
                                    disabled={!c.email && !c.email_normalized}
                                  />
                                </td>
                                <td className="px-3 py-2">{c.comercio}</td>
                                <td className="px-3 py-2 text-white/70">{c.email || '—'}</td>
                                <td className="px-3 py-2 text-white/70">{c.telefono || '—'}</td>
                                <td className="px-3 py-2">
                                  <Badge variant="secondary">{c.confianza}</Badge>
                                </td>
                                <td className="px-3 py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteContact(c.id)}
                                    className="text-red-300 hover:text-red-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            {contacts.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                                  Sin contactos. Agrega o importa JSON.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {(lastSendResults || ledger.length > 0) && (
                    <Card variant="liquid" className="border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Ledger de envíos</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {lastSendResults && (
                          <div className="overflow-x-auto rounded-lg border border-white/10">
                            <table className="min-w-full divide-y divide-white/10 text-sm">
                              <thead className="bg-white/5">
                                <tr className="text-left text-white/60">
                                  <th className="px-3 py-2">Comercio</th>
                                  <th className="px-3 py-2">To</th>
                                  <th className="px-3 py-2">Status</th>
                                  <th className="px-3 py-2">Resend / error</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/10">
                                {lastSendResults.map((r) => (
                                  <tr key={r.contactId} className="text-white/80">
                                    <td className="px-3 py-2">{r.comercio}</td>
                                    <td className="px-3 py-2">{r.to || '—'}</td>
                                    <td className="px-3 py-2">{r.status}</td>
                                    <td className="px-3 py-2 text-xs">{r.error || r.resendId || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {!lastSendResults && ledger.length > 0 && (
                          <ul className="space-y-1 text-xs text-white/60">
                            {ledger.slice(0, 20).map((row) => (
                              <li key={row.id}>
                                {row.sent_at}: {row.to_email || '(sin email)'} — {row.status}
                                {row.error ? ` (${row.error})` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
