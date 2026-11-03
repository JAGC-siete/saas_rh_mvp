import type { MissingEmployee, MissingStatus } from '../../lib/dashboard/overview'
import { HONDURAS_TIMEZONE } from '../../lib/timezone'
import { EmptyState, Panel } from './shared'
import { useDashboardText } from './i18n'

const STATUS: Record<MissingStatus, { key: 'absent' | 'late' | 'paidLeave'; chip: string }> = {
  absent: { key: 'absent', chip: 'bg-pink-500/15 text-pink-200 ring-pink-400/30' },
  late: { key: 'late', chip: 'bg-amber-500/15 text-amber-200 ring-amber-400/30' },
  paid_leave: { key: 'paidLeave', chip: 'bg-sky-500/15 text-sky-200 ring-sky-400/30' },
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export default function MissingToday({ items, total }: { items: MissingEmployee[]; total: number }) {
  const { t, locale } = useDashboardText()
  const note = (e: MissingEmployee) => {
    if (e.status === 'late' && e.checkIn) {
      const time = new Date(e.checkIn).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: HONDURAS_TIMEZONE })
      return t('missing.checkedIn', { time })
    }
    if (e.status === 'paid_leave') return t('missing.leaveApproved')
    return t('missing.noPunch')
  }
  return (
    <Panel
      title={t('missing.title')}
      subtitle={total > 0 ? t('missing.subtitle', { count: total }) : undefined}
      action={total > items.length ? { label: t('missing.action'), href: '/app/attendance/dashboard' } : undefined}
    >
      {items.length === 0 ? (
        <EmptyState>{t('missing.empty')}</EmptyState>
      ) : (
        <ul className="flex flex-col">
          {items.map((e) => {
            const s = STATUS[e.status]
            return (
              <li key={e.employeeId} className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white">
                  {initials(e.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{e.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {e.departmentName ?? t('missing.noDepartment')} · {note(e)}
                  </p>
                </div>
                <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.chip}`}>
                  {t(`missing.${s.key}`)}
                  {e.status === 'late' && e.lateMinutes !== null ? ` ${e.lateMinutes} min` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
