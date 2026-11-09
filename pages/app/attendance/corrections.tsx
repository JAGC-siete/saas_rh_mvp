import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card } from '../../../components/ui/card'
import { useAuth } from '../../../lib/auth'
import {
  composeCorrectionTimestamps,
  formatCorrectionMarkDisplay,
  getCorrectionDateAnchorError,
} from '../../../lib/attendance/correction-marks'
import { getAttendanceMarksValidationError } from '../../../lib/attendance/validate-marks'
import { getTodayInHonduras } from '../../../lib/timezone'
import { useNotificationContext } from '../../../components/NotificationProvider'
import AttendanceSectionNav from '../../../components/attendance/AttendanceSectionNav'

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

function composeFormMarks(date: string, times: {
  checkIn: string
  checkOut: string
  lunchStart: string
  lunchEnd: string
}) {
  return composeCorrectionTimestamps({
    date,
    checkInTime: times.checkIn,
    checkOutTime: times.checkOut,
    lunchStartTime: times.lunchStart,
    lunchEndTime: times.lunchEnd,
  })
}

export default function AttendanceCorrectionsPage() {
  const tr = useTranslations('attendance.corrections')
  const tc = useTranslations('common')
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
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

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
      addNotification({ type: 'error', title: tr('title'), message: e instanceof Error ? e.message : tr('loadError') })
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

    const marks = composeFormMarks(date, { checkIn, checkOut, lunchStart, lunchEnd })
    const dateErr = getCorrectionDateAnchorError({ date, ...marks })
    if (dateErr) {
      addNotification({ type: 'error', title: tr('title'), message: dateErr })
      return
    }
    const marksErr = getAttendanceMarksValidationError(marks)
    if (marksErr) {
      addNotification({ type: 'error', title: tr('title'), message: marksErr })
      return
    }

    setCreating(true)
    try {
      const payload: any = {
        date,
        reason,
        proposed_check_in: marks.check_in,
        proposed_check_out: marks.check_out,
        proposed_lunch_start: marks.lunch_start,
        proposed_lunch_end: marks.lunch_end,
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

      addNotification({ type: 'success', title: tr('title'), message: tr('sent') })
      setReason('')
      setCheckIn('')
      setCheckOut('')
      setLunchStart('')
      setLunchEnd('')
      setStatus('pending')
      await load()
    } catch (e) {
      addNotification({ type: 'error', title: tr('title'), message: e instanceof Error ? e.message : tr('sendError') })
    } finally {
      setCreating(false)
    }
  }

  const review = async (id: string, action: 'approve' | 'reject', note?: string) => {
    try {
      const reviewer_note = action === 'reject' ? note?.trim() || 'Rechazado' : 'Aprobado'
      const res = await fetch(`/api/attendance/corrections/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewer_note }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`)
      addNotification({ type: 'success', title: tr('title'), message: action === 'approve' ? tr('approved') : tr('rejected') })
      setRejectingId(null)
      setRejectNote('')
      await load()
    } catch (e) {
      addNotification({ type: 'error', title: tr('title'), message: e instanceof Error ? e.message : tr('processError') })
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <AttendanceSectionNav />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-white">{tr('pageTitle')}</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`px-3 py-2 rounded-lg text-sm ${status === 'pending' ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                {tr('pending')}
              </button>
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`px-3 py-2 rounded-lg text-sm ${status === 'approved' ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                {tr('approvedTab')}
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`px-3 py-2 rounded-lg text-sm ${status === 'rejected' ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                {tr('rejectedTab')}
              </button>
            </div>
          </div>

          <Card variant="liquid" className="border border-white/10">
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-white">{tr('newRequest')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-sm text-gray-300">
                  {tr('date')}
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>

                {!isEmployee && (
                  <label className="text-sm text-gray-300">
                    {tr('employee')}
                    <select
                      className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    >
                      <option value="">{tr('select')}</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {(e.employee_code ? `${e.employee_code} — ` : '') + e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="text-sm text-gray-300 md:col-span-2">
                  {tr('reason')}
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={tr('reasonPlaceholder')}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="text-sm text-gray-300">
                  {tr('checkIn')}
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  {tr('checkOut')}
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  {tr('lunchStart')}
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="time"
                    value={lunchStart}
                    onChange={(e) => setLunchStart(e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  {tr('lunchEnd')}
                  <input
                    className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white"
                    type="time"
                    value={lunchEnd}
                    onChange={(e) => setLunchEnd(e.target.value)}
                  />
                </label>
              </div>

              <p className="text-xs text-gray-400">
                {tr('hint')}
              </p>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {!creating && (!canCreate || !reason.trim()) && (
                  <span className="text-xs text-gray-400">
                    {!canCreate ? tr('needEmployee') : tr('needReason')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={submit}
                  disabled={!reason.trim() || creating || !canCreate}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? tr('sending') : tr('send')}
                </button>
              </div>
            </div>
          </Card>

          <Card variant="liquid" className="border border-white/10">
            <div className="p-5">
              <h2 className="text-lg font-semibold text-white mb-3">
                {status === 'pending' ? tr('pending') : status === 'approved' ? tr('approvedTab') : tr('rejectedTab')}
              </h2>

              {loading ? (
                <p className="text-gray-300">{tr('loading')}</p>
              ) : rows.length === 0 ? (
                <p className="text-gray-400">{tr('none')}</p>
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => {
                    const marksWarning = getAttendanceMarksValidationError({
                      check_in: r.proposed_check_in,
                      check_out: r.proposed_check_out,
                      lunch_start: r.proposed_lunch_start,
                      lunch_end: r.proposed_lunch_end,
                    })
                    return (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-white font-medium">
                            {r.employees?.name ?? r.employee_id} · {r.date}
                          </div>
                          <div className="text-sm text-gray-300 mt-1">{r.reason}</div>
                          <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-2">
                            <span>{tr('markCheckIn', { time: formatCorrectionMarkDisplay(r.proposed_check_in, r.date) })}</span>
                            <span>{tr('markCheckOut', { time: formatCorrectionMarkDisplay(r.proposed_check_out, r.date) })}</span>
                            {r.proposed_lunch_start && (
                              <span>{tr('markLunchStart', { time: formatCorrectionMarkDisplay(r.proposed_lunch_start, r.date) })}</span>
                            )}
                            {r.proposed_lunch_end && (
                              <span>{tr('markLunchEnd', { time: formatCorrectionMarkDisplay(r.proposed_lunch_end, r.date) })}</span>
                            )}
                          </div>
                          {marksWarning && status === 'pending' && (
                            <div className="text-xs text-amber-300 mt-2">{marksWarning}</div>
                          )}
                          {r.reviewer_note && <div className="text-xs text-gray-400 mt-2">{tr('note', { note: r.reviewer_note })}</div>}
                        </div>

                        {status === 'pending' && isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(r.id)
                                setRejectNote('')
                              }}
                              className="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-gray-200"
                            >
                              {tr('reject')}
                            </button>
                            <button
                              type="button"
                              onClick={() => review(r.id, 'approve')}
                              title={marksWarning ?? undefined}
                              disabled={!!marksWarning}
                              className="px-3 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {tr('approve')}
                            </button>
                          </div>
                        )}
                      </div>
                      {rejectingId === r.id && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <label className="block text-sm text-gray-300">
                            {tr('rejectReason')}
                            <textarea
                              autoFocus
                              rows={2}
                              className="mt-1 w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              placeholder={tr('rejectPlaceholder')}
                            />
                          </label>
                          <p className="text-xs text-gray-400">{tr('rejectHint')}</p>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRejectingId(null)}
                              className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10"
                            >
                              {tc('cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => review(r.id, 'reject', rejectNote)}
                              disabled={!rejectNote.trim()}
                              className="px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {tr('confirmReject')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

