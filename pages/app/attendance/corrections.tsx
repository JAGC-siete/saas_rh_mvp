import { useCallback, useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card } from '../../../components/ui/card'
import { useAuth } from '../../../lib/auth'
import { getTodayInHonduras } from '../../../lib/timezone'
import { useNotificationContext } from '../../../components/NotificationProvider'

type Status = 'pending' | 'approved' | 'rejected'

type CorrectionRow = {
  id: string
  date: string
  employee_id: string
  reason: string
  status: Status
  proposed_check_in: string | null
  proposed_check_out: string | null
  proposed_lunch_start: string | null
  proposed_lunch_end: string | null
  reviewed_at: string | null
  reviewer_note: string | null
  employees?: { id: string; name: string; employee_code?: string | null }
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

export default function AttendanceCorrectionsPage() {
  const { userProfile } = useAuth()
  const { addNotification } = useNotificationContext()

  const role = (userProfile?.role || '').toLowerCase()
  const isEmployee = role === 'employee'
  const isAdmin = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'admin'].includes(role)

  const [status, setStatus] = useState<Status>('pending')
  const [rows, setRows] = useState<CorrectionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; name: string; employee_code?: string }[]>([])

  // Create form
  const [date, setDate] = useState(getTodayInHonduras())
  const [employeeId, setEmployeeId] = useState('')
  const [reason, setReason] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [lunchStart, setLunchStart] = useState('')
  const [lunchEnd, setLunchEnd] = useState('')
  const [creating, setCreating] = useState(false)

  const canCreate = useMemo(() => {
    if (isEmployee) return true
    return isAdmin && !!employeeId
  }, [isEmployee, isAdmin, employeeId])

  const loadEmployees = useCallback(async () => {
    if (!isAdmin || isEmployee) return
    const res = await fetch('/api/attendance/employees', { credentials: 'include' })
    const json = await res.json().catch(() => [])
    if (res.ok && Array.isArray(json)) {
      setEmployees(json.map((e: any) => ({ id: e.id, name: e.name, employee_code: e.employee_code })))
    }
  }, [isAdmin, isEmployee])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      q.set('status', status)
      const res = await fetch(`/api/attendance/corrections?${q.toString()}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      setRows(Array.isArray(json.data) ? json.data : [])
    } catch (e) {
      addNotification({ type: 'error', title: 'Correcciones', message: e instanceof Error ? e.message : 'Error al cargar' })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [status, addNotification])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!canCreate) return
    setCreating(true)
    try {
      const payload: any = {
        date,
        reason,
        proposed_check_in: datetimeLocalToIso(checkIn),
        proposed_check_out: datetimeLocalToIso(checkOut),
        proposed_lunch_start: datetimeLocalToIso(lunchStart),
        proposed_lunch_end: datetimeLocalToIso(lunchEnd),
      }
      if (!isEmployee) payload.employee_id = employeeId

      const res = await fetch('/api/attendance/corrections', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)

      addNotification({ type: 'success', title: 'Correcciones', message: 'Solicitud enviada.' })
      setReason('')
      setCheckIn('')
      setCheckOut('')
      setLunchStart('')
      setLunchEnd('')
      setStatus('pending')
      await load()
    } catch (e) {
      addNotification({ type: 'error', title: 'Correcciones', message: e instanceof Error ? e.message : 'Error al enviar' })
    } finally {
      setCreating(false)
    }
  }

  const review = async (id: string, action: 'approve' | 'reject') => {
    try {
      const reviewer_note = action === 'reject' ? 'Rechazado' : 'Aprobado'
      const res = await fetch(`/api/attendance/corrections/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewer_note }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      addNotification({ type: 'success', title: 'Correcciones', message: action === 'approve' ? 'Aprobada.' : 'Rechazada.' })
      await load()
    } catch (e) {
      addNotification({ type: 'error', title: 'Correcciones', message: e instanceof Error ? e.message : 'Error al procesar' })
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-white">Correcciones de asistencia</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`px-3 py-2 rounded-lg text-sm ${status === 'pending' ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`px-3 py-2 rounded-lg text-sm ${status === 'approved' ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                Aprobadas
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`px-3 py-2 rounded-lg text-sm ${status === 'rejected' ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                Rechazadas
              </button>
            </div>
          </div>

          <Card variant="liquid" className="border border-white/10">
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-white">Nueva solicitud</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-sm text-gray-300">
                  Fecha
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>

                {!isEmployee && (
                  <label className="text-sm text-gray-300">
                    Empleado
                    <select
                      className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    >
                      <option value="">Seleccione…</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {(e.employee_code ? `${e.employee_code} — ` : '') + e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="text-sm text-gray-300 md:col-span-2">
                  Motivo
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej. Olvidé marcar salida, el reloj falló, etc."
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="text-sm text-gray-300">
                  Entrada (propuesta)
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="datetime-local"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  Salida (propuesta)
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="datetime-local"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  Inicio almuerzo (opcional)
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="datetime-local"
                    value={lunchStart}
                    onChange={(e) => setLunchStart(e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  Fin almuerzo (opcional)
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="datetime-local"
                    value={lunchEnd}
                    onChange={(e) => setLunchEnd(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={submit}
                  disabled={!reason.trim() || creating || !canCreate}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Enviando…' : 'Enviar solicitud'}
                </button>
              </div>
            </div>
          </Card>

          <Card variant="liquid" className="border border-white/10">
            <div className="p-5">
              <h2 className="text-lg font-semibold text-white mb-3">
                {status === 'pending' ? 'Pendientes' : status === 'approved' ? 'Aprobadas' : 'Rechazadas'}
              </h2>

              {loading ? (
                <p className="text-gray-300">Cargando…</p>
              ) : rows.length === 0 ? (
                <p className="text-gray-400">Sin solicitudes.</p>
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-white font-medium">
                            {r.employees?.name ?? r.employee_id} · {r.date}
                          </div>
                          <div className="text-sm text-gray-300 mt-1">{r.reason}</div>
                          <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-2">
                            <span>Entrada: {isoForDatetimeLocal(r.proposed_check_in)}</span>
                            <span>Salida: {isoForDatetimeLocal(r.proposed_check_out)}</span>
                            {r.proposed_lunch_start && <span>Almuerzo ini: {isoForDatetimeLocal(r.proposed_lunch_start)}</span>}
                            {r.proposed_lunch_end && <span>Almuerzo fin: {isoForDatetimeLocal(r.proposed_lunch_end)}</span>}
                          </div>
                          {r.reviewer_note && <div className="text-xs text-gray-400 mt-2">Nota: {r.reviewer_note}</div>}
                        </div>

                        {status === 'pending' && isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => review(r.id, 'reject')}
                              className="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-gray-200"
                            >
                              Rechazar
                            </button>
                            <button
                              type="button"
                              onClick={() => review(r.id, 'approve')}
                              className="px-3 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Aprobar y aplicar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

