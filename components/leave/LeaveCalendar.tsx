import React, { useCallback, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar'
import { format, getDay, startOfWeek as dfStartOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import type { LeaveRequest, LeaveType } from '../../lib/types/leave'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import {
  displayEmployeeName,
  getLeaveTypeName,
  parseLocalDateYmd,
  statusLabelEs,
} from './leaveUtils'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = dateFnsLocalizer({
  format,
  startOfWeek: (d: Date, options?: { locale?: typeof es }) =>
    dfStartOfWeek(d, { weekStartsOn: 1, locale: options?.locale ?? es }),
  getDay,
  locales: { es },
})

export type CalendarLeaveEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: LeaveRequest
}

function requestsToEvents(requests: LeaveRequest[], leaveTypes: LeaveType[]): CalendarLeaveEvent[] {
  return requests.map((r) => {
    const start = parseLocalDateYmd(r.start_date)
    const last = parseLocalDateYmd(r.end_date)
    const endExclusive = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
    const name = displayEmployeeName(r)
    const typeName = getLeaveTypeName(r, leaveTypes)
    const st = r.status === 'pending' ? 'P' : r.status === 'approved' ? 'A' : 'R'
    return {
      id: r.id,
      title: `[${st}] ${name} · ${typeName}`,
      start,
      end: endExclusive,
      allDay: true,
      resource: r,
    }
  })
}

export interface LeaveCalendarProps {
  leaveRequests: LeaveRequest[]
  leaveTypes: LeaveType[]
  filterText: string
  onFilterTextChange: (v: string) => void
  className?: string
}

export default function LeaveCalendar({
  leaveRequests,
  leaveTypes,
  filterText,
  onFilterTextChange,
  className,
}: LeaveCalendarProps) {
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(new Date())

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return leaveRequests
    return leaveRequests.filter((r) => {
      const name = displayEmployeeName(r).toLowerCase()
      const dni = (r.employee?.dni || r.employee_dni || '').toLowerCase()
      const typeName = getLeaveTypeName(r, leaveTypes).toLowerCase()
      return name.includes(q) || dni.includes(q) || typeName.includes(q)
    })
  }, [leaveRequests, leaveTypes, filterText])

  const events = useMemo(() => requestsToEvents(filtered, leaveTypes), [filtered, leaveTypes])

  const eventPropGetter = useCallback((event: CalendarLeaveEvent) => {
    const r = event.resource
    const color = r.leave_type?.color || leaveTypes.find((t) => t.id === r.leave_type_id)?.color || '#64748b'
    const opacity = r.status === 'pending' ? 0.85 : r.status === 'approved' ? 1 : 0.65
    return {
      style: {
        backgroundColor: color,
        borderColor: 'rgba(0,0,0,0.25)',
        color: '#0f172a',
        opacity,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
      },
    }
  }, [leaveTypes])

  const components = useMemo(
    () => ({
      event: ({ event }: { event: CalendarLeaveEvent }) => {
        const r = event.resource
        return (
          <span title={`${displayEmployeeName(r)} · ${getLeaveTypeName(r, leaveTypes)} · ${statusLabelEs(r.status)}`}>
            {event.title}
          </span>
        )
      },
    }),
    [leaveTypes]
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={view === Views.MONTH ? 'default' : 'secondary'}
            className={view !== Views.MONTH ? 'bg-white/5 border-white/10 text-gray-300' : ''}
            onClick={() => setView(Views.MONTH)}
          >
            Mes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === Views.WEEK ? 'default' : 'secondary'}
            className={view !== Views.WEEK ? 'bg-white/5 border-white/10 text-gray-300' : ''}
            onClick={() => setView(Views.WEEK)}
          >
            Semana
          </Button>
        </div>
        <div className="flex flex-col gap-1 min-w-[12rem] flex-1 max-w-md">
          <label htmlFor="leave-cal-filter" className="text-xs text-gray-400">
            Filtrar por empleado o tipo
          </label>
          <input
            id="leave-cal-filter"
            type="search"
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            placeholder="Nombre, DNI o tipo…"
            className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white text-sm placeholder:text-gray-500"
          />
        </div>
      </div>

      <Card variant="glass" className="border-white/10 overflow-hidden">
        <CardHeader className="pb-2 border-b border-white/10">
          <CardTitle className="text-white text-base">Quién está fuera</CardTitle>
          <p className="text-xs text-gray-400 font-normal">
            Leyenda: P pendiente · A aprobado · R rechazado. Color según tipo de permiso.
          </p>
        </CardHeader>
        <CardContent className="p-2 md:p-4 leave-rbc-wrap">
          <div className="h-[560px] text-gray-900 dark:text-gray-100 leave-rbc-inner">
            <Calendar
              culture="es"
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={view}
              views={[Views.MONTH, Views.WEEK]}
              onView={(v) => setView(v)}
              date={date}
              onNavigate={setDate}
              eventPropGetter={eventPropGetter}
              components={components as any}
            />
          </div>
        </CardContent>
      </Card>
      <style jsx global>{`
        .leave-rbc-wrap .rbc-calendar {
          font-family: inherit;
        }
        .leave-rbc-wrap .rbc-header,
        .leave-rbc-wrap .rbc-today {
          color: #e2e8f0;
        }
        .leave-rbc-wrap .rbc-off-range-bg {
          background: rgba(0, 0, 0, 0.15);
        }
        .leave-rbc-wrap .rbc-day-bg + .rbc-day-bg {
          border-left-color: rgba(255, 255, 255, 0.08);
        }
        .leave-rbc-wrap .rbc-month-view,
        .leave-rbc-wrap .rbc-time-view {
          border-color: rgba(255, 255, 255, 0.12);
        }
        .leave-rbc-wrap .rbc-toolbar button {
          color: #e2e8f0;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 0.5rem;
          padding: 0.25rem 0.6rem;
          background: rgba(255, 255, 255, 0.06);
        }
        .leave-rbc-wrap .rbc-toolbar button.rbc-active {
          background: rgba(56, 189, 248, 0.25);
          border-color: rgba(56, 189, 248, 0.5);
        }
        .leave-rbc-wrap .rbc-toolbar-label {
          color: #f8fafc;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
