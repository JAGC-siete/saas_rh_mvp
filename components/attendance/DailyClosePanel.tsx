import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAuth } from '../../lib/auth'
import { useCompanyContext } from '../../lib/useCompanyContext'
import { formatDateTimeForHonduras, getTodayInHonduras } from '../../lib/timezone'
import type { BiometricMode } from '../../lib/attendance/attendance-metadata'
import DailyCloseWizard, { type DailyCloseWizardStep } from './DailyCloseWizard'

export type DailyCloseItem = {
  employee: {
    id: string
    name: string
    department_id: string | null
    employee_code?: string | null
    role?: string | null
    team?: string | null
  }
  bucket: 'normal' | 'anomaly'
  anomaly_types: string[]
  in_progress?: boolean
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
  const router = useRouter()
  const { userProfile } = useAuth()
  const { companyId: ctxCompanyId, loading: ctxLoading } = useCompanyContext()
  const role = (userProfile?.role || '').toLowerCase()
  const isSuper = role === 'super_admin'

  const [superCompanyId, setSuperCompanyId] = useState('')

  const [date, setDate] = useState(() => initialDate ?? getTodayInHonduras())
  const [onlyWithEvents, setOnlyWithEvents] = useState(true)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [team, setTeam] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sort, setSort] = useState<'name_asc' | 'name_desc'>('name_asc')
  const [urlSynced, setUrlSynced] = useState(false)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams] = useState<string[]>([])
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

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [bulkCheckOut, setBulkCheckOut] = useState('')
  const [bulkLunchStart, setBulkLunchStart] = useState('')
  const [bulkLunchEnd, setBulkLunchEnd] = useState('')

  const [wizardStep, setWizardStep] = useState<DailyCloseWizardStep>(1)

  const queryCompany = useMemo(() => {
    if (isSuper) return superCompanyId.trim() || undefined
    return undefined
  }, [isSuper, superCompanyId])

  const canLoad = !isSuper ? !!ctxCompanyId && !ctxLoading : superCompanyId.trim().length > 0

  useEffect(() => {
    if (!router.isReady || urlSynced) return
    const q = router.query as Record<string, string | string[] | undefined>
    const get = (k: string) => {
      const v = q[k]
      return Array.isArray(v) ? v[0] : v
    }
    const qDate = get('date')
    if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) setDate(qDate)
    const qOnly = get('only_with_events')
    if (qOnly) setOnlyWithEvents(qOnly === 'true' || qOnly === '1')
    const qSearch = get('search')
    if (qSearch) setSearch(qSearch)
    const qDept = get('department_id')
    if (qDept) setDepartmentId(qDept)
    const qTeam = get('team')
    if (qTeam) setTeam(qTeam)
    const qRole = get('role')
    if (qRole) setRoleFilter(qRole)
    const qSort = get('sort')
    if (qSort === 'name_desc') setSort('name_desc')
    setUrlSynced(true)
  }, [router.isReady, router.query, urlSynced])

  useEffect(() => {
    if (!router.isReady || !urlSynced) return
    const next: Record<string, string> = { date }
    if (!onlyWithEvents) next.only_with_events = 'false'
    if (search.trim()) next.search = search.trim()
    if (departmentId) next.department_id = departmentId
    if (team.trim()) next.team = team.trim()
    if (roleFilter.trim()) next.role = roleFilter.trim()
    if (sort !== 'name_asc') next.sort = sort
    router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true })
  }, [date, onlyWithEvents, search, departmentId, team, roleFilter, sort, router, urlSynced])

  useEffect(() => {
    fetch('/api/departments', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.departments && Array.isArray(j.departments)) {
          setDepartments(j.departments.map((d: any) => ({ id: d.id, name: d.name })))
        }
      })
      .catch(() => {})
    fetch('/api/teams', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.success && Array.isArray(j.roles)) setTeams(j.roles)
      })
      .catch(() => {})
  }, [])

  const fetchReport = useCallback(async () => {
    if (!canLoad) return
    setLoading(true)
    setMessage(null)
    try {
      const q = new URLSearchParams({ date })
      if (queryCompany) q.set('company_id', queryCompany)
      q.set('only_with_events', String(onlyWithEvents))
      if (search.trim()) q.set('search', search.trim())
      if (departmentId) q.set('department_id', departmentId)
      if (team.trim()) q.set('team', team.trim())
      if (roleFilter.trim()) q.set('role', roleFilter.trim())
      if (sort) q.set('sort', sort)
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
  }, [canLoad, date, queryCompany, onlyWithEvents, search, departmentId, team, roleFilter, sort])

  useEffect(() => {
    void fetchReport()
  }, [fetchReport])

  const bodyBase = useMemo(() => {
    const b: Record<string, string> = { date }
    if (queryCompany) b.company_id = queryCompany
    return b
  }, [date, queryCompany])

  const selectedRecordIds = useMemo(() => Object.keys(selectedIds).filter((id) => selectedIds[id]), [selectedIds])

  const anomalyItems = useMemo(
    () => data?.items.filter((i) => i.bucket === 'anomaly') ?? [],
    [data]
  )

  const resolvedAnomalies = useMemo(
    () =>
      anomalyItems.filter((i) => {
        const f = recordFlags(i.record)
        return f.close_state === 'finalized'
      }).length,
    [anomalyItems]
  )

  const focusAnomalies = useMemo(() => anomalyItems.slice(0, 3), [anomalyItems])

  const wizardVisibleItems = useMemo(() => {
    if (!data?.items) return []
    if (wizardStep === 1) return anomalyItems
    if (wizardStep === 2) return data.items.filter((i) => i.bucket === 'anomaly' || i.record)
    return data.items
  }, [data, wizardStep, anomalyItems])

  const toggleAllVisible = (checked: boolean) => {
    if (!data?.items) return
    const next = { ...selectedIds }
    for (const it of data.items) {
      const rid = (it.record as any)?.id as string | undefined
      if (!rid) continue
      next[rid] = checked
    }
    setSelectedIds(next)
  }

  const toggleOne = (rid: string, checked: boolean) => {
    setSelectedIds((prev) => ({ ...prev, [rid]: checked }))
  }

  const applyBulk = async () => {
    if (selectedRecordIds.length === 0) {
      setMessage({ type: 'err', text: 'Seleccione al menos un registro.' })
      return
    }
    setActionLoading('bulk')
    setMessage(null)
    try {
      const payload: Record<string, unknown> = {
        ...bodyBase,
        record_ids: selectedRecordIds,
      }
      if (bulkCheckOut.trim() || bulkCheckOut === '') payload.check_out = datetimeLocalToIso(bulkCheckOut)
      if (bulkLunchStart.trim() || bulkLunchStart === '') payload.lunch_start = datetimeLocalToIso(bulkLunchStart)
      if (bulkLunchEnd.trim() || bulkLunchEnd === '') payload.lunch_end = datetimeLocalToIso(bulkLunchEnd)

      const res = await fetch('/api/attendance/daily-close/bulk', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      setMessage({ type: 'ok', text: `Cambios aplicados: ${json.updated ?? 0}` })
      await fetchReport()
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Error al aplicar cambios' })
    } finally {
      setActionLoading(null)
    }
  }

  const recalcSelected = async () => {
    if (selectedRecordIds.length === 0) {
      setMessage({ type: 'err', text: 'Seleccione al menos un registro.' })
      return
    }
    setActionLoading('recalc')
    setMessage(null)
    try {
      const res = await fetch('/api/attendance/daily-close/recalculate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bodyBase, record_ids: selectedRecordIds }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      setMessage({ type: 'ok', text: `Horas recalculadas en ${json.calculated ?? 0} registros.` })
      await fetchReport()
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Error al recalcular' })
    } finally {
      setActionLoading(null)
    }
  }

  const finalizeSelected = async () => {
    if (selectedRecordIds.length === 0) {
      setMessage({ type: 'err', text: 'Seleccione al menos un registro.' })
      return
    }
    if (
      !confirm(
        `Finalizar ${selectedRecordIds.length} registros: marcar como cerrados y recalcular horas. ¿Continuar?`
      )
    ) {
      return
    }
    setActionLoading('finalize_selected')
    setMessage(null)
    try {
      const res = await fetch('/api/attendance/daily-close/finalize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bodyBase, record_ids: selectedRecordIds }),
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
          <h1 className="text-2xl font-bold text-white">Control de horas extras</h1>
          <p className="text-gray-400 text-sm mt-1">
            Revisión del día: consolida marcas biométricas, valida horas normales y extras (AHC), corrige anomalías
            y finaliza cuando corresponda. La finalización calcula horas solo si hay entrada y salida definidas.
          </p>
        </div>
        <Link href="/app/attendance/dashboard" className="text-sm text-brand-400 hover:text-brand-300">
          ← Volver al panel de asistencia
        </Link>
      </div>
    ) : (
      <div>
        <h2 className="text-lg font-semibold text-white">Control de horas extras</h2>
        <p className="text-gray-400 text-sm mt-1">
          Consolidación, edición de registros y finalización para la fecha seleccionada (horas incluidas).
        </p>
      </div>
    )

  return (
    <>
      <div className="space-y-6">
        {headerBlock}

        {data && (
          <DailyCloseWizard
            step={wizardStep}
            onStepChange={setWizardStep}
            totalAnomalies={data.summary.total_anomalies}
            resolvedAnomalies={resolvedAnomalies}
            focusItems={focusAnomalies}
            onFocusEdit={(item) => {
              setWizardStep(2)
              openEdit(item)
            }}
          />
        )}

        {isSuper && (
          <Card variant="liquid" className="border border-amber-500/20">
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

        <Card variant="liquid" className="border border-white/10">
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
            <div className="min-w-[220px]">
              <label className="block text-xs text-gray-400 mb-1">Buscar (nombre / código)</label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej. Juan / EMP-01"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Departamento</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="h-10 px-3 bg-white/5 border border-white/20 rounded-md text-white text-sm"
              >
                <option value="" className="bg-gray-900">
                  Todos
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-gray-900">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Equipo</label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="h-10 px-3 bg-white/5 border border-white/20 rounded-md text-white text-sm"
              >
                <option value="" className="bg-gray-900">
                  Todos
                </option>
                {teams.map((t) => (
                  <option key={t} value={t} className="bg-gray-900">
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rol</label>
              <Input
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                placeholder="Ej. Supervisor"
                className="bg-white/5 border-white/20 text-white w-40"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Orden</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="h-10 px-3 bg-white/5 border border-white/20 rounded-md text-white text-sm"
              >
                <option value="name_asc" className="bg-gray-900">
                  A–Z
                </option>
                <option value="name_desc" className="bg-gray-900">
                  Z–A
                </option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={onlyWithEvents}
                onChange={(e) => setOnlyWithEvents(e.target.checked)}
              />
              Solo con marcas
            </label>
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
            {selectedRecordIds.length > 0 && (
              <Card variant="liquid" className="border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">Acciones múltiples</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-3">
                  <div className="text-sm text-gray-300">
                    Seleccionados: <span className="font-semibold text-white">{selectedRecordIds.length}</span>
                  </div>
                  <div className="min-w-[220px]">
                    <label className="block text-xs text-gray-400 mb-1">Salida (aplicar)</label>
                    <Input
                      type="datetime-local"
                      value={bulkCheckOut}
                      onChange={(e) => setBulkCheckOut(e.target.value)}
                      className="bg-white/5 border-white/20 text-white w-full"
                    />
                  </div>
                  <div className="min-w-[220px]">
                    <label className="block text-xs text-gray-400 mb-1">Inicio almuerzo</label>
                    <Input
                      type="datetime-local"
                      value={bulkLunchStart}
                      onChange={(e) => setBulkLunchStart(e.target.value)}
                      className="bg-white/5 border-white/20 text-white w-full"
                    />
                  </div>
                  <div className="min-w-[220px]">
                    <label className="block text-xs text-gray-400 mb-1">Fin almuerzo</label>
                    <Input
                      type="datetime-local"
                      value={bulkLunchEnd}
                      onChange={(e) => setBulkLunchEnd(e.target.value)}
                      className="bg-white/5 border-white/20 text-white w-full"
                    />
                  </div>
                  <Button
                    type="button"
                    className="bg-brand-600 hover:bg-brand-700 text-white"
                    disabled={!!actionLoading}
                    onClick={() => void applyBulk()}
                  >
                    {actionLoading === 'bulk' ? 'Aplicando…' : 'Aplicar cambios'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 text-white"
                    disabled={!!actionLoading}
                    onClick={() => void recalcSelected()}
                  >
                    {actionLoading === 'recalc' ? 'Recalculando…' : 'Recalcular horas'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-500/50 text-emerald-200"
                    disabled={!!actionLoading}
                    onClick={() => void finalizeSelected()}
                  >
                    {actionLoading === 'finalize_selected' ? 'Finalizando…' : 'Finalizar seleccionados'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-gray-300"
                    disabled={!!actionLoading}
                    onClick={() => setSelectedIds({})}
                  >
                    Limpiar selección
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryTile label="Modalidad" value={data.meta.biometric_mode} sub={data.meta.timezone} />
              <SummaryTile label="Empleados activos" value={String(data.summary.total_employees)} />
              <SummaryTile label="Con marcas hoy" value={String(data.summary.total_with_events)} />
              <SummaryTile
                label="Anomalías / Finalizados"
                value={`${data.summary.total_anomalies} / ${data.summary.total_finalized}`}
              />
            </div>

            <Card variant="liquid" className="border border-white/10 overflow-x-auto">
              <CardHeader>
                <CardTitle className="text-base text-white">Detalle por empleado</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm text-left min-w-[720px]">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="p-3">
                        <input
                          type="checkbox"
                          aria-label="Seleccionar todos"
                          onChange={(e) => toggleAllVisible(e.target.checked)}
                        />
                      </th>
                      <th className="p-3">Empleado</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Horas</th>
                      <th className="p-3">Extra</th>
                      <th className="p-3">Anomalías</th>
                      <th className="p-3">Marcas</th>
                      <th className="p-3">Registro</th>
                      <th className="p-3 w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wizardVisibleItems.map((row) => {
                      const rec = row.record as {
                        id?: string
                        check_in?: string
                        check_out?: string
                        status?: string
                      } | null
                      const f = recordFlags(row.record)
                      return (
                        <tr key={row.employee.id} className="border-t border-white/10 hover:bg-white/5">
                          <td className="p-3">
                            {rec?.id ? (
                              <input
                                type="checkbox"
                                checked={!!selectedIds[rec.id]}
                                onChange={(e) => toggleOne(rec.id!, e.target.checked)}
                                aria-label="Seleccionar"
                              />
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="p-3 text-white font-medium">
                            {row.employee.name}
                            {row.employee.employee_code ? (
                              <span className="text-xs text-gray-400 ml-2">({row.employee.employee_code})</span>
                            ) : null}
                          </td>
                          <td className="p-3">
                            <span
                              className={
                                row.in_progress
                                  ? 'text-sky-300'
                                  : row.bucket === 'anomaly'
                                  ? 'text-amber-300'
                                  : f.close_state === 'finalized'
                                    ? 'text-emerald-300'
                                    : 'text-gray-300'
                              }
                            >
                              {f.close_state === 'finalized'
                                ? 'Finalizado'
                                : row.in_progress
                                  ? 'En curso'
                                  : row.bucket === 'anomaly'
                                  ? 'Revisar'
                                  : 'OK'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-200 tabular-nums">
                            {typeof (row as any).hours?.total_hours === 'number'
                              ? (row as any).hours.total_hours.toFixed(2)
                              : '—'}
                          </td>
                          <td className="p-3 text-amber-200 tabular-nums">
                            {typeof (row as any).hours?.overtime_hours === 'number'
                              ? (row as any).hours.overtime_hours.toFixed(2)
                              : '—'}
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
    <Card variant="liquid" className="border border-white/10">
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
