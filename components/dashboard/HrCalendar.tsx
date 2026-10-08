import type { CalendarEvent } from '../../lib/dashboard/overview'
import { EmptyState, Panel, shortDate } from './shared'

const KIND_LABEL: Record<CalendarEvent['kind'], string> = {
  payment: 'Pago',
  holiday: 'Feriado',
  anniversary: 'Aniversario',
  termination: 'Baja',
}

export default function HrCalendar({ events }: { events: CalendarEvent[] }) {
  return (
    <Panel title="Calendario RRHH" subtitle="Próximos 60 días">
      {events.length === 0 ? (
        <EmptyState>Sin pagos, feriados ni aniversarios en los próximos 60 días.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-1">
          {events.map((ev) => (
            <li key={`${ev.date}-${ev.kind}-${ev.title}`} className="flex items-center gap-3.5 py-1.5">
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-white/10 bg-white/[0.03] py-1.5">
                <span className="text-lg font-bold leading-none text-white tabular-nums">{shortDate(ev.date, { day: 'numeric' })}</span>
                <span className="text-[11px] uppercase text-slate-400">{shortDate(ev.date, { month: 'short' }).replace('.', '')}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{ev.title}</p>
                <p className="truncate text-xs text-slate-400">
                  <span className="sr-only">{KIND_LABEL[ev.kind]}: </span>
                  {ev.subtitle}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
