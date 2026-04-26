import { useCallback, useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card } from '../../../components/ui/card'
import { useNotificationContext } from '../../../components/NotificationProvider'

type EmployeeRow = { id: string; name: string; employee_code?: string | null }
type ScheduleRow = { id: string; name: string }

export default function AttendanceSchedulingPage() {
  const { addNotification } = useNotificationContext()

  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Record<string, boolean>>({})
  const [workScheduleId, setWorkScheduleId] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [repeatWeekdays, setRepeatWeekdays] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true
  })
  const [saving, setSaving] = useState(false)

  const selectedIds = useMemo(
    () => Object.keys(selectedEmployeeIds).filter((id) => selectedEmployeeIds[id]),
    [selectedEmployeeIds]
  )

  const loadEmployees = useCallback(async () => {
    const res = await fetch('/api/attendance/employees', { credentials: 'include' })
    const json = await res.json().catch(() => [])
    if (res.ok && Array.isArray(json)) {
      setEmployees(json)
    }
  }, [])

  const loadSchedules = useCallback(async () => {
    // This endpoint is legacy; only returns id+name. Good enough for v1.
    const res = await fetch('/api/work-schedules', { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(json?.schedules)) {
      setSchedules(json.schedules)
    } else if (res.ok && Array.isArray(json)) {
      setSchedules(json)
    }
  }, [])

  useEffect(() => {
    void loadEmployees()
    void loadSchedules()
  }, [loadEmployees, loadSchedules])

  const submit = async () => {
    if (!workScheduleId || !validFrom || !validTo || selectedIds.length === 0) {
      addNotification({ type: 'error', title: 'Scheduling', message: 'Complete empleado(s), horario y rango de fechas.' })
      return
    }
    setSaving(true)
    try {
      const weekdays = Object.keys(repeatWeekdays)
        .map((k) => Number(k))
        .filter((k) => repeatWeekdays[k])

      const payload: any = {
        employee_ids: selectedIds,
        work_schedule_id: workScheduleId,
        valid_from: validFrom,
        valid_to: validTo,
        repeat_weekly: repeatWeekly,
        repeat_weekdays: repeatWeekly ? weekdays : null
      }

      const res = await fetch('/api/attendance/schedule-assignments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      addNotification({ type: 'success', title: 'Scheduling', message: `Asignaciones creadas: ${json.inserted ?? 0}` })
    } catch (e) {
      addNotification({ type: 'error', title: 'Scheduling', message: e instanceof Error ? e.message : 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <h1 className="text-2xl font-bold text-white">Scheduling de turnos (v1)</h1>

          <Card variant="glass" className="border border-white/10">
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-white">Asignar horario por fecha</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="text-sm text-gray-300">
                  Horario
                  <select
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    value={workScheduleId}
                    onChange={(e) => setWorkScheduleId(e.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-300">
                  Desde
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  Hasta
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-300 flex items-end gap-2">
                  <input type="checkbox" checked={repeatWeekly} onChange={(e) => setRepeatWeekly(e.target.checked)} />
                  <span>Repetir semanal</span>
                </label>
              </div>

              {repeatWeekly && (
                <div className="flex flex-wrap gap-2">
                  {[
                    [0, 'Dom'],
                    [1, 'Lun'],
                    [2, 'Mar'],
                    [3, 'Mié'],
                    [4, 'Jue'],
                    [5, 'Vie'],
                    [6, 'Sáb']
                  ].map(([k, label]) => (
                    <button
                      key={String(k)}
                      type="button"
                      className={`px-3 py-2 rounded-lg text-sm ${
                        repeatWeekdays[k as number] ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                      onClick={() => setRepeatWeekdays((prev) => ({ ...prev, [k as number]: !prev[k as number] }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-gray-200 font-medium mb-2">Empleados ({selectedIds.length} seleccionados)</div>
                <div className="max-h-72 overflow-auto space-y-2 pr-1">
                  {employees.map((e) => {
                    const checked = !!selectedEmployeeIds[e.id]
                    return (
                      <label key={e.id} className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-white"
                          checked={checked}
                          onChange={(ev) => setSelectedEmployeeIds((p) => ({ ...p, [e.id]: ev.target.checked }))}
                        />
                        <span>{(e.employee_code ? `${e.employee_code} — ` : '') + e.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Crear asignación'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

