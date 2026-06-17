import { useCallback, useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card } from '../../../components/ui/card'
import { useNotificationContext } from '../../../components/NotificationProvider'

type DepartmentRow = { id: string; name: string }
type EmployeeRow = {
  id: string
  name: string
  employee_code?: string | null
  department_id?: string | null
  departments?: { id: string; name: string } | { id: string; name: string }[] | null
}
type ScheduleRow = { id: string; name: string }

type AssignmentRow = {
  id: string
  employee_id: string
  work_schedule_id: string
  valid_from: string
  valid_to: string
  repeat_weekly: boolean
  repeat_weekdays: number[] | null
  employees?: {
    id: string
    name: string
    employee_code?: string | null
    departments?: { id: string; name: string } | null
  } | null
  schedules?: { id: string; name: string } | null
}

const WEEKDAY_BUTTONS: [number, string][] = [
  [0, 'Dom'],
  [1, 'Lun'],
  [2, 'Mar'],
  [3, 'Mié'],
  [4, 'Jue'],
  [5, 'Vie'],
  [6, 'Sáb'],
]

function deptName(emp: EmployeeRow): string {
  const d = emp.departments
  if (!d) return '—'
  if (Array.isArray(d)) return d[0]?.name ?? '—'
  return d.name ?? '—'
}

function formatWeekdays(days: number[] | null): string {
  if (!days || days.length === 0) return 'Todos'
  const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return days.map((d) => labels[d] ?? String(d)).join(', ')
}

export default function AttendanceSchedulingPage() {
  const { addNotification } = useNotificationContext()

  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Record<string, boolean>>({})
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [workScheduleId, setWorkScheduleId] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [repeatWeekdays, setRepeatWeekdays] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  })
  const [saving, setSaving] = useState(false)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerFilterFrom, setLedgerFilterFrom] = useState('')
  const [ledgerFilterTo, setLedgerFilterTo] = useState('')
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRow | null>(null)

  const filteredEmployees = useMemo(() => {
    if (!departmentFilter) return employees
    return employees.filter((e) => e.department_id === departmentFilter)
  }, [employees, departmentFilter])

  const selectedIds = useMemo(
    () => Object.keys(selectedEmployeeIds).filter((id) => selectedEmployeeIds[id]),
    [selectedEmployeeIds]
  )

  const loadEmployees = useCallback(async () => {
    const res = await fetch('/api/attendance/employees', { credentials: 'include' })
    const json = await res.json().catch(() => [])
    if (res.ok && Array.isArray(json)) setEmployees(json)
  }, [])

  const loadDepartments = useCallback(async () => {
    const res = await fetch('/api/departments', { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    const rows = Array.isArray(json?.departments) ? json.departments : Array.isArray(json) ? json : []
    if (res.ok) setDepartments(rows.map((d: any) => ({ id: d.id, name: d.name })))
  }, [])

  const loadSchedules = useCallback(async () => {
    const res = await fetch('/api/work-schedules', { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(json?.schedules)) setSchedules(json.schedules)
  }, [])

  const loadAssignments = useCallback(async () => {
    setLedgerLoading(true)
    try {
      const params = new URLSearchParams()
      if (ledgerFilterFrom) params.set('from', ledgerFilterFrom)
      if (ledgerFilterTo) params.set('to', ledgerFilterTo)
      const qs = params.toString()
      const res = await fetch(`/api/attendance/schedule-assignments${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(json?.data)) setAssignments(json.data)
    } finally {
      setLedgerLoading(false)
    }
  }, [ledgerFilterFrom, ledgerFilterTo])

  useEffect(() => {
    void loadEmployees()
    void loadDepartments()
    void loadSchedules()
    void loadAssignments()
  }, [loadEmployees, loadDepartments, loadSchedules, loadAssignments])

  const toggleEmployee = (id: string, checked: boolean) => {
    setSelectedEmployeeIds((p) => ({ ...p, [id]: checked }))
  }

  const selectAllVisible = () => {
    setSelectedEmployeeIds((p) => {
      const next = { ...p }
      for (const e of filteredEmployees) next[e.id] = true
      return next
    })
  }

  const clearAllSelection = () => setSelectedEmployeeIds({})

  const selectAllInDepartment = () => {
    if (!departmentFilter) return
    selectAllVisible()
  }

  const submit = async () => {
    if (!workScheduleId || !validFrom || !validTo || selectedIds.length === 0) {
      addNotification({
        type: 'error',
        title: 'Scheduling',
        message: 'Complete empleado(s), horario y rango de fechas.',
      })
      return
    }
    setSaving(true)
    try {
      const weekdays = Object.keys(repeatWeekdays)
        .map((k) => Number(k))
        .filter((k) => repeatWeekdays[k])

      const payload = {
        employee_ids: selectedIds,
        work_schedule_id: workScheduleId,
        valid_from: validFrom,
        valid_to: validTo,
        repeat_weekly: repeatWeekly,
        repeat_weekdays: repeatWeekly ? weekdays : null,
        conflict_mode: 'auto_trim',
      }

      const res = await fetch('/api/attendance/schedule-assignments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)

      const trimmed = json.trimmed ?? 0
      addNotification({
        type: 'success',
        title: 'Scheduling',
        message: `Asignaciones creadas: ${json.inserted ?? 0}${trimmed ? ` · ${trimmed} conflicto(s) recortados` : ''}`,
      })
      void loadAssignments()
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Scheduling',
        message: e instanceof Error ? e.message : 'Error al guardar',
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteAssignment = async (id: string) => {
    if (!confirm('¿Eliminar esta asignación por rango de fechas?')) return
    const res = await fetch(`/api/attendance/schedule-assignments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      addNotification({ type: 'error', title: 'Scheduling', message: json.error || 'No se pudo eliminar' })
      return
    }
    addNotification({ type: 'success', title: 'Scheduling', message: 'Asignación eliminada' })
    void loadAssignments()
  }

  const saveEdit = async () => {
    if (!editingAssignment) return
    setSaving(true)
    try {
      const weekdays = editingAssignment.repeat_weekly
        ? editingAssignment.repeat_weekdays ?? [1, 2, 3, 4, 5]
        : null
      const res = await fetch(`/api/attendance/schedule-assignments/${editingAssignment.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valid_from: editingAssignment.valid_from,
          valid_to: editingAssignment.valid_to,
          work_schedule_id: editingAssignment.work_schedule_id,
          repeat_weekly: editingAssignment.repeat_weekly,
          repeat_weekdays: weekdays,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Error al actualizar')
      addNotification({ type: 'success', title: 'Scheduling', message: 'Asignación actualizada' })
      setEditingAssignment(null)
      void loadAssignments()
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Scheduling',
        message: e instanceof Error ? e.message : 'Error al actualizar',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Asignación de turnos</h1>
            <p className="text-sm text-gray-400 mt-1">
              Asigne plantillas de horario por rango de fechas. Los conflictos se recortan automáticamente.
            </p>
          </div>

          <Card variant="liquid" className="border border-white/10">
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-white">Nueva asignación</h2>

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
                <label className="text-sm text-gray-300 flex items-end gap-2 pb-2">
                  <input type="checkbox" checked={repeatWeekly} onChange={(e) => setRepeatWeekly(e.target.checked)} />
                  <span>Repetir semanal</span>
                </label>
              </div>

              {repeatWeekly && (
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_BUTTONS.map(([k, label]) => (
                    <button
                      key={String(k)}
                      type="button"
                      className={`px-3 py-2 rounded-lg text-sm ${
                        repeatWeekdays[k] ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                      onClick={() => setRepeatWeekdays((prev) => ({ ...prev, [k]: !prev[k] }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-gray-200 font-medium">
                    Empleados ({selectedIds.length} seleccionados · {filteredEmployees.length} visibles)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllVisible}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/10 text-white hover:bg-white/15"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={clearAllSelection}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-300 hover:bg-white/10"
                    >
                      Limpiar
                    </button>
                    {departmentFilter && (
                      <button
                        type="button"
                        onClick={selectAllInDepartment}
                        className="px-3 py-1.5 rounded-lg text-xs bg-brand-600/80 text-white hover:bg-brand-600"
                      >
                        Todo el departamento
                      </button>
                    )}
                  </div>
                </div>

                <label className="text-sm text-gray-300 block max-w-xs">
                  Filtrar por departamento
                  <select
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="">Todos los departamentos</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="max-h-72 overflow-auto space-y-2 pr-1">
                  {filteredEmployees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-white"
                        checked={!!selectedEmployeeIds[e.id]}
                        onChange={(ev) => toggleEmployee(e.id, ev.target.checked)}
                      />
                      <span className="flex-1">
                        {(e.employee_code ? `${e.employee_code} — ` : '') + e.name}
                      </span>
                      <span className="text-xs text-gray-500">{deptName(e)}</span>
                    </label>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No hay empleados en este filtro.</p>
                  )}
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

          <Card variant="liquid" className="border border-white/10">
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Libro de asignaciones</h2>
                <div className="flex flex-wrap gap-2 items-end">
                  <label className="text-xs text-gray-400">
                    Desde
                    <input
                      type="date"
                      value={ledgerFilterFrom}
                      onChange={(e) => setLedgerFilterFrom(e.target.value)}
                      className="mt-1 block bg-gray-900/60 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-400">
                    Hasta
                    <input
                      type="date"
                      value={ledgerFilterTo}
                      onChange={(e) => setLedgerFilterTo(e.target.value)}
                      className="mt-1 block bg-gray-900/60 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void loadAssignments()}
                    className="px-3 py-2 rounded-lg text-sm bg-white/10 text-white hover:bg-white/15"
                  >
                    {ledgerLoading ? 'Cargando…' : 'Filtrar'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-gray-300">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Empleado</th>
                      <th className="text-left px-3 py-2 font-medium">Horario</th>
                      <th className="text-left px-3 py-2 font-medium">Desde</th>
                      <th className="text-left px-3 py-2 font-medium">Hasta</th>
                      <th className="text-left px-3 py-2 font-medium">Repetición</th>
                      <th className="text-right px-3 py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const emp = a.employees
                      const sched = a.schedules
                      return (
                        <tr key={a.id} className="border-t border-white/5 text-gray-200">
                          <td className="px-3 py-2">
                            {emp?.employee_code ? `${emp.employee_code} — ` : ''}
                            {emp?.name ?? a.employee_id.slice(0, 8)}
                          </td>
                          <td className="px-3 py-2">{sched?.name ?? '—'}</td>
                          <td className="px-3 py-2">{a.valid_from}</td>
                          <td className="px-3 py-2">{a.valid_to}</td>
                          <td className="px-3 py-2">
                            {a.repeat_weekly ? formatWeekdays(a.repeat_weekdays) : 'Todos los días'}
                          </td>
                          <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setEditingAssignment({ ...a })}
                              className="text-brand-300 hover:text-brand-200"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteAssignment(a.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {!ledgerLoading && assignments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-500 italic">
                          Sin asignaciones en este rango.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {editingAssignment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <Card variant="liquid" className="w-full max-w-md border border-white/15 p-5 space-y-4">
                <h3 className="text-lg font-semibold text-white">Editar asignación</h3>
                <label className="text-sm text-gray-300 block">
                  Horario
                  <select
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    value={editingAssignment.work_schedule_id}
                    onChange={(e) =>
                      setEditingAssignment({ ...editingAssignment, work_schedule_id: e.target.value })
                    }
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-gray-300">
                    Desde
                    <input
                      type="date"
                      className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={editingAssignment.valid_from}
                      onChange={(e) =>
                        setEditingAssignment({ ...editingAssignment, valid_from: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm text-gray-300">
                    Hasta
                    <input
                      type="date"
                      className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={editingAssignment.valid_to}
                      onChange={(e) =>
                        setEditingAssignment({ ...editingAssignment, valid_to: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={editingAssignment.repeat_weekly}
                    onChange={(e) =>
                      setEditingAssignment({ ...editingAssignment, repeat_weekly: e.target.checked })
                    }
                  />
                  Repetir semanal
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(null)}
                    className="px-3 py-2 rounded-lg text-sm bg-white/10 text-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={saving}
                    className="px-3 py-2 rounded-lg text-sm bg-brand-600 text-white disabled:opacity-50"
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
