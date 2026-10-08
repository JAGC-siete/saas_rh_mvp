import type { MissingEmployee, MissingStatus } from '../../lib/dashboard/overview'
import { HONDURAS_TIMEZONE } from '../../lib/timezone'
import { EmptyState, Panel } from './shared'

const STATUS: Record<MissingStatus, { label: string; chip: string }> = {
  absent: { label: 'Ausente', chip: 'bg-pink-500/15 text-pink-200 ring-pink-400/30' },
  late: { label: 'Tarde', chip: 'bg-amber-500/15 text-amber-200 ring-amber-400/30' },
  paid_leave: { label: 'Permiso', chip: 'bg-sky-500/15 text-sky-200 ring-sky-400/30' },
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

function note(e: MissingEmployee) {
  if (e.status === 'late' && e.checkIn) {
    const t = new Date(e.checkIn).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: HONDURAS_TIMEZONE })
    return `entró ${t}`
  }
  if (e.status === 'paid_leave') return 'permiso aprobado'
  return 'sin marcaje'
}

export default function MissingToday({ items, total }: { items: MissingEmployee[]; total: number }) {
  return (
    <Panel
      title="Quién falta hoy"
      subtitle={total > 0 ? `${total} ${total === 1 ? 'persona' : 'personas'} ausentes, tarde o con permiso` : undefined}
      action={total > items.length ? { label: 'Ver lista completa', href: '/app/attendance/dashboard' } : undefined}
    >
      {items.length === 0 ? (
        <EmptyState>Todo el personal programado marcó a tiempo hoy.</EmptyState>
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
                    {e.departmentName ?? 'Sin departamento'} · {note(e)}
                  </p>
                </div>
                <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.chip}`}>
                  {s.label}
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
