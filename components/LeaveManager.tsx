import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useLeave } from '../lib/hooks/useLeave'
import type { LeaveAttendanceSummaryPayload } from '../lib/types/leave'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { useToast } from '../lib/toast'
import { useAuth } from '../lib/auth'
import LeaveDashboard from './leave/LeaveDashboard'
import LeaveForm, { type LeaveFormData } from './leave/LeaveForm'
import LeaveRequestsTable from './leave/LeaveRequestsTable'

const LeaveCalendar = dynamic(() => import('./leave/LeaveCalendar'), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm">
      Cargando calendario…
    </div>
  ),
})

type LeaveView = 'dashboard' | 'calendar' | 'list' | 'form'

const VIEW_LABELS: Record<LeaveView, string> = {
  dashboard: 'Resumen',
  calendar: 'Calendario',
  list: 'Listado',
  form: 'Nueva solicitud',
}

export default function LeaveManager() {
  const toast = useToast()
  const router = useRouter()
  const { userProfile } = useAuth()
  const {
    leaveRequests,
    leaveTypes,
    isLoading,
    isSubmitting,
    error,
    fetchLeaveRequests,
    fetchLeaveTypes,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
  } = useLeave()

  const [view, setView] = useState<LeaveView>('dashboard')
  const [calendarFilterText, setCalendarFilterText] = useState('')
  const [summaryExpandedId, setSummaryExpandedId] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<LeaveAttendanceSummaryPayload | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    fetchLeaveRequests()
    fetchLeaveTypes()
  }, [fetchLeaveRequests, fetchLeaveTypes])

  useEffect(() => {
    if (!router.isReady) return
    const q = router.query.view
    if (typeof q === 'string' && ['dashboard', 'calendar', 'list', 'form'].includes(q)) {
      setView(q as LeaveView)
    }
  }, [router.isReady, router.query.view])

  const goView = useCallback(
    (v: LeaveView) => {
      setView(v)
      router.replace({ pathname: router.pathname, query: { ...router.query, view: v } }, undefined, { shallow: true })
    },
    [router]
  )

  const toggleAttendanceSummary = useCallback(
    async (requestId: string) => {
      if (summaryExpandedId === requestId) {
        setSummaryExpandedId(null)
        setSummaryData(null)
        return
      }
      setSummaryExpandedId(requestId)
      setSummaryLoading(true)
      setSummaryData(null)
      try {
        const res = await fetch(`/api/leave/${requestId}?attendance_summary=1`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.message || json.error || 'Error al cargar resumen')
        setSummaryData(json.data as LeaveAttendanceSummaryPayload)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al cargar resumen'
        toast.error('Asistencia', msg)
        setSummaryExpandedId(null)
        setSummaryData(null)
      } finally {
        setSummaryLoading(false)
      }
    },
    [summaryExpandedId, toast]
  )

  const handleFormSubmit = async (data: LeaveFormData, attachment: File | null) => {
    try {
      await createLeaveRequest({
        employee_dni: data.employee_dni,
        leave_type_id: data.leave_type_id,
        start_date: data.start_date,
        end_date: data.end_date,
        duration_type: data.duration_type,
        duration_hours: data.duration_hours,
        is_half_day: data.is_half_day,
        reason: data.reason || undefined,
        attachment: attachment || undefined,
      })
      await fetchLeaveRequests()
      toast.success('Permiso', 'Solicitud registrada correctamente.')
      goView('list')
    } catch (e) {
      toast.error('Permiso', e instanceof Error ? e.message : 'No se pudo registrar la solicitud.')
      throw e
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center gap-3 py-16" role="status" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand-500" aria-hidden />
        <p className="text-sm text-gray-400">Cargando solicitudes…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      <div
        role="tablist"
        aria-label="Vistas del módulo de permisos"
        className="flex flex-wrap gap-2 border-b border-white/10 pb-4"
      >
        {(Object.keys(VIEW_LABELS) as LeaveView[]).map((v) => (
          <Button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            variant={view === v ? 'default' : 'secondary'}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium shadow-none hover:translate-y-0 active:translate-y-0',
              view !== v && 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
            )}
            onClick={() => goView(v)}
          >
            {VIEW_LABELS[v]}
          </Button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 text-sm">{error}</div>
      )}

      {view === 'dashboard' && (
        <LeaveDashboard leaveRequests={leaveRequests} leaveTypes={leaveTypes} className="pb-2" />
      )}

      {view === 'calendar' && (
        <LeaveCalendar
          leaveRequests={leaveRequests}
          leaveTypes={leaveTypes}
          filterText={calendarFilterText}
          onFilterTextChange={setCalendarFilterText}
        />
      )}

      {view === 'list' && (
        <LeaveRequestsTable
          leaveRequests={leaveRequests}
          leaveTypes={leaveTypes}
          userRole={userProfile?.role}
          isSubmitting={isSubmitting}
          updateLeaveRequest={updateLeaveRequest}
          deleteLeaveRequest={deleteLeaveRequest}
          onAttendanceSummary={toggleAttendanceSummary}
          summaryExpandedId={summaryExpandedId}
          summaryData={summaryData}
          summaryLoading={summaryLoading}
        />
      )}

      {view === 'form' && (
        <LeaveForm
          leaveTypes={leaveTypes}
          leaveRequests={leaveRequests}
          isSubmitting={isSubmitting}
          onSubmit={handleFormSubmit}
          onCancel={() => goView('list')}
          toast={{ warning: toast.warning }}
        />
      )}
    </div>
  )
}
