import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAuth } from '../../lib/auth'
import { useCompanyContext } from '../../lib/useCompanyContext'
import { formatDateTimeForHonduras, getTodayInHonduras } from '../../lib/timezone'
import type { BiometricMode } from '../../lib/attendance/attendance-metadata'

export type DailyCloseItem = {
  employee: { id: string; name: string; department_id: string | null }
  bucket: 'normal' | 'anomaly'
  anomaly_types: string[]
  events: { id: string; ts_utc: string; device_id: string | null }[]
  record: Record<string, unknown> | null
}

export type DailyClosePayload = {
  meta: { date: string; biometric_mode: BiometricMode; timezone: string }
  summary: {
    total_employees: number
    total_with_events: number
    total_anomalies: number
    total_finalized: number
  }
  items: DailyCloseItem[]
}

// eslint-disable-next-line no-unused-vars -- callback arity for datetime-local input
type DatetimeFieldOnChange = (nextValue: string) => void

function recordFlags(rec: Record<string, unknown> | null): { close_state?: string } {
  if (!rec?.flags || typeof rec.flags !== 'object') return {}
  return rec.flags as { close_state?: string }
}

function isoForDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(value: string): string | null {
  if (!value.trim()) return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export type DailyClosePanelVariant = 'page' | 'embedded'

export interface DailyClosePanelProps {
  variant: DailyClosePanelVariant
  /** Fecha inicial YYYY-MM-DD (por defecto hoy Honduras) */
  initialDate?: string
  onAfterConsolidate?: () => void
  onAfterFinalize?: () => void
  onAfterRecordPatch?: () => void
}

export default function DailyClosePanel({
  variant,
  initialDate,
  onAfterConsolidate,
  onAfterFinalize,
  onAfterRecordPatch,
}: DailyClosePanelProps) {
  const { userProfile } = useAuth()
  const { companyId: ctxCompanyId, loading: ctxLoading } = useCompanyContext()
  const role = (userProfile?.role || '').toLowerCase()
  const isSuper = role === 'super_admin'

  const [superCompanyId, setSuperCompanyId] = useState('')

  const [date, setDate] = useState(() => initialDate ?? getTodayInHonduras())
  const [data, setData] = useState<DailyClosePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<DailyCloseItem | null>(null)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [editLunchStart, setEditLunchStart] = useState('')
  const [editLunchEnd, setEditLunchEnd] = useState('')

  const queryCompany = useMemo(() => {
    if (isSuper) return superCompanyId.trim() || undefined
    return undefined
  }, [isSuper, superCompanyId])

  const canLoad = !isSuper ? !!ctxCompanyId && !ctxLoading : superCompanyId.trim().length > 0

  const fetchReport = useCallback(async () => {
    if (!canLoad) return
    setLoading(true)
    setMessage(null)
    try {
      const q = new URLSearchParams({ date })
      if (queryCompany) q.set('company_id', queryCompany)
      const res = await fetch(`/api/attendance/daily-close?${q}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      setData(json as DailyClosePayload)
    } catch (e) {
      setData(null)
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Error al cargar' })
    } finally {
      setLoading(false)
    }
  }, [canLoad, date, queryCompany])

  useEffect(() => {
    void fetchReport()
  }, [fetchReport])

  const bodyBase = useMemo(() => {
    const b: Record<string, string> = { date }
    if (queryCompany) b.company_id = queryCompany
    return b
  }, [date, queryCompany])

  const runClose = async () => {
    setActionLoading('run')
    setMessage(null)
    try {
      const res = await fetch('/api/attendance/daily-close/run', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyBase),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      setMessage({
        type: 'ok',
        text: `Consolidación: ${json.result?.processed ?? 0} procesados, ${json.result?.anomalies ?? 0} anomalías, ${json.result?.skipped_locked ?? 0} omitidos (bloqueados).`,
      })
      await fetchReport()
      onAfterConsolidate?.()
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Error al ejecutar' })
    } finally {
      setActionLoading(null)
    }
  }

  const finalizeClose = async () => {
    if (
      !confirm(
        'Finalizar cierre: marcar registros del día como cerrados y recalcular horas (requiere entrada y salida donde aplique). ¿Continuar?'
      )
    ) {
      return
    }
    setActionLoading('finalize')
    setMessage(null)
    try {
      const res = await fetch('/api/attendance/daily-close/finalize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyBase),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      setMessage({
        type: 'ok',
        text: `Finalizado: ${json.finalized ?? 0} registros; horas calculadas en ${json.calculated_hours_rows ?? 0} filas.`,
      })
      await fetchReport()
      onAfterFinalize?.()
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Error al finalizar' })
    } finally {
      setActionLoading(null)
    }
  }

  const openEdit = (item: DailyCloseItem) => {
    const rec = item.record as {
      check_in?: string
      check_out?: string
      lunch_start?: string
      lunch_end?: string
    } | null
    setEditItem(item)
    setEditCheckIn(isoForDatetimeLocal(rec?.check_in ?? null))
    setEditCheckOut(isoForDatetimeLocal(rec?.check_out ?? null))
    setEditLunchStart(isoForDatetimeLocal(rec?.lunch_start ?? null))
    setEditLunchEnd(isoForDatetimeLocal(rec?.lunch_end ?? null))
    setEditOpen(true)
  }

  const submitEdit = async () => {
    if (!editItem?.record) {
      setMessage({ type: 'err', text: 'No hay registro consolidado para este empleado. Ejecute consolidación primero.' })
      return
    }
    const rid = (editItem.record as { id?: string }).id
    if (!rid) {
      setMessage({ type: 'err', text: 'Registro sin id.' })
      return
    }
    setActionLoading('patch')
    setMessage(null)
    try {
      const payload: Record<string, unknown> = {
        ...bodyBase,
        record_id: rid,
        check_in: datetimeLocalToIso(editCheckIn),
        check_out: datetimeLocalToIso(editCheckOut),
        lunch_start: datetimeLocalToIso(editLunchStart),
        lunch_end: datetimeLocalToIso(editLunchEnd),
      }
      const res = await fetch('/api/attendance/daily-close/record', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      setMessage({ type: 'ok', text: 'Registro actualizado.' })
      setEditOpen(false)
      setEditItem(null)
      await fetchReport()
      onAfterRecordPatch?.()
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Error al guardar' })
    } finally {
      setActionLoading(null)
    }
  }

  const headerBlock =
    variant === 'page' ? (
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cierre de día</h1>
          <p className="text-gray-400 text-sm mt-1">
            Consolida marcas biométricas en registros del día, corrige anomalías y finaliza cuando corresponda. La
            finalización calcula horas solo si hay entrada y salida definidas.
          </p>
        </div>
        <Link href="/app/attendance/dashboard" className="text-sm text-brand-400 hover:text-brand-300">
          ← Volver al panel de asistencia
        </Link>
      </div>
    ) : (
      <div>
        <h2 className="text-lg font-semibold text-white">Cierre del día</h2>
        <p className="text-gray-400 text-sm mt-1">
          Consolidación, edición de registros y finalización para la fecha seleccionada.
        </p>
      </div>
    )

  return (
    <>
      <div className="space-y-6">
        {headerBlock}

        {isSuper && (
          <Card variant="glass" className="border border-amber-500/20">
            <CardContent className="pt-4">
              <label className="block text-sm text-gray-300 mb-1">Empresa (super_admin)</label>
              <Input
                value={superCompanyId}
                onChange={(e) => setSuperCompanyId(e.target.value)}
                placeholder="UUID de company_id"
                className="bg-white/5 border-white/20 text-white max-w-xl"
              />
            </CardContent>
          </Card>
        )}

        <Card variant="glass" className="border border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Fecha y acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fecha local (YYYY-MM-DD)</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/5 border-white/20 text-white w-44"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-brand-500/50 text-white"
              disabled={!canLoad || loading || !!actionLoading}
              onClick={() => void fetchReport()}
            >
              Actualizar vista
            </Button>
            <Button
              type="button"
              className="bg-brand-600 hover:bg-brand-700 text-white"
              disabled={!canLoad || loading || !!actionLoading}
              onClick={() => void runClose()}
            >
              {actionLoading === 'run' ? 'Consolidando…' : 'Consolidar marcas (run)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-emerald-500/50 text-emerald-200"
              disabled={!canLoad || loading || !!actionLoading}
              onClick={() => void finalizeClose()}
            >
              {actionLoading === 'finalize' ? 'Finalizando…' : 'Finalizar día'}
            </Button>
          </CardContent>
        </Card>

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === 'ok'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-100'
                : 'bg-red-500/10 border border-red-500/30 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {!canLoad && !ctxLoading && (
          <p className="text-amber-200 text-sm">
            {isSuper ? 'Indique el UUID de la empresa para cargar el cierre.' : 'No hay empresa en contexto.'}
          </p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryTile label="Modalidad" value={data.meta.biometric_mode} sub={data.meta.timezone} />
              <SummaryTile label="Empleados activos" value={String(data.summary.total_employees)} />
              <SummaryTile label="Con marcas hoy" value={String(data.summary.total_with_events)} />
              <SummaryTile
                label="Anomalías / Finalizados"
                value={`${data.summary.total_anomalies} / ${data.summary.total_finalized}`}
              />
            </div>

            <Card variant="glass" className="border border-white/10 overflow-x-auto">
              <CardHeader>
                <CardTitle className="text-base text-white">Detalle por empleado</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm text-left min-w-[720px]">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="p-3">Empleado</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Anomalías</th>
                      <th className="p-3">Marcas</th>
                      <th className="p-3">Registro</th>
                      <th className="p-3 w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => {
                      const rec = row.record as {
                        id?: string
                        check_in?: string
                        check_out?: string
                        status?: string
                      } | null
                      const f = recordFlags(row.record)
                      return (
                        <tr key={row.employee.id} className="border-t border-white/10 hover:bg-white/5">
                          <td className="p-3 text-white font-medium">{row.employee.name}</td>
                          <td className="p-3">
                            <span
                              className={
                                row.bucket === 'anomaly'
                                  ? 'text-amber-300'
                                  : f.close_state === 'finalized'
                                    ? 'text-emerald-300'
                                    : 'text-gray-300'
                              }
                            >
                              {f.close_state === 'finalized'
                                ? 'Finalizado'
                                : row.bucket === 'anomaly'
                                  ? 'Revisar'
                                  : 'OK'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-300 text-xs max-w-[200px]">
                            {row.anomaly_types.length ? row.anomaly_types.join(', ') : '—'}
                          </td>
                          <td className="p-3 text-gray-400 text-xs">
                            {row.events.length === 0 ? (
                              '—'
                            ) : (
                              <ul className="space-y-1">
                                {row.events.map((ev) => (
                                  <li key={ev.id}>
                                    {formatDateTimeForHonduras(ev.ts_utc)}
                                    {ev.device_id ? ` · ${ev.device_id}` : ''}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="p-3 text-xs text-gray-300">
                            {rec ? (
                              <div className="space-y-0.5">
                                <div>In: {rec.check_in ? formatDateTimeForHonduras(rec.check_in) : '—'}</div>
                                <div>Out: {rec.check_out ? formatDateTimeForHonduras(rec.check_out) : '—'}</div>
                                <div className="text-gray-500">{rec.status ?? ''}</div>
                              </div>
                            ) : (
                              'Sin registro'
                            )}
                          </td>
                          <td className="p-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs border-white/20 text-white"
                              disabled={!!actionLoading}
                              onClick={() => openEdit(row)}
                            >
                              Editar
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}

        {loading && <p className="text-gray-400 text-sm">Cargando…</p>}
      </div>

      {editOpen && editItem && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          onClick={() => !actionLoading && setEditOpen(false)}
        >
          <div
            className="bg-gray-900 border border-white/20 rounded-xl max-w-lg w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Ajustar registro — {editItem.employee.name}</h3>
            <p className="text-xs text-amber-200/90 mb-4">
              Corrige horarios antes de finalizar si necesitas horas calculadas. Se marca como override de administrador.
            </p>
            <div className="space-y-3">
              <Field label="Entrada" value={editCheckIn} onChange={setEditCheckIn} />
              <Field label="Salida" value={editCheckOut} onChange={setEditCheckOut} />
              <Field label="Inicio almuerzo" value={editLunchStart} onChange={setEditLunchStart} />
              <Field label="Fin almuerzo" value={editLunchEnd} onChange={setEditLunchEnd} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="ghost" className="text-gray-300" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-brand-600 text-white"
                disabled={actionLoading === 'patch'}
                onClick={() => void submitEdit()}
              >
                {actionLoading === 'patch' ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SummaryTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card variant="glass" className="border border-white/10">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: DatetimeFieldOnChange
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border-white/20 text-white w-full"
      />
    </div>
  )
}
