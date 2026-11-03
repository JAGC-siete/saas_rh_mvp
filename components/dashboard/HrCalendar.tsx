import type { CalendarEvent } from '../../lib/dashboard/overview'
import { EmptyState, Panel } from './shared'
import { useDashboardText } from './i18n'

export default function HrCalendar({ events }: { events: CalendarEvent[] }) {
  const { t, date: shortDate, calendar } = useDashboardText()
  return (
    <Panel title={t('calendar.title')} subtitle={t('calendar.subtitle')}>
      {events.length === 0 ? (
        <EmptyState>{t('calendar.empty')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-1">
          {events.map((ev) => {
            const text = calendar(ev)
            return (
            <li key={`${ev.date}-${ev.kind}-${ev.title}`} className="flex items-center gap-3.5 py-1.5">
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-white/10 bg-white/[0.03] py-1.5">
                <span className="text-lg font-bold leading-none text-white tabular-nums">{shortDate(ev.date, { day: 'numeric' })}</span>
                <span className="text-[11px] uppercase text-slate-400">{shortDate(ev.date, { month: 'short' }).replace('.', '')}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{text.title}</p>
                <p className="truncate text-xs text-slate-400">
                  <span className="sr-only">{t(`calendar.kinds.${ev.kind}`)}: </span>
                  {text.subtitle}
                </p>
              </div>
            </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
