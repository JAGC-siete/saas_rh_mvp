import type { DepartmentSummary } from '../../lib/dashboard/overview'
import { EmptyState, Panel, SERIES } from './shared'

/** Debajo de este % la asistencia de hoy se marca para revisar. */
const LOW_ATTENDANCE_PCT = 90

export default function DepartmentBreakdown({ departments }: { departments: DepartmentSummary[] }) {
  const max = Math.max(1, ...departments.map((d) => d.headcount))
  return (
    <Panel
      title="Por departamento"
      subtitle="Personas activas · asistencia de hoy"
      action={{ label: 'Gestionar departamentos', href: '/app/departments' }}
    >
      {departments.length === 0 ? (
        <EmptyState>No hay empleados activos asignados.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {departments.map((d) => {
            const low = d.attendancePct !== null && d.attendancePct < LOW_ATTENDANCE_PCT
            return (
              <li
                key={d.id ?? 'none'}
                className="grid items-center gap-3 grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem_4.5rem] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3rem_5rem]"
              >
                <span className="truncate text-sm font-medium text-white">{d.name}</span>
                <span className="block h-2.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.round((d.headcount / max) * 100)}%`, background: SERIES.onTime }}
                  />
                </span>
                <span className="text-right text-sm font-bold text-white tabular-nums">
                  {d.headcount}
                  <span className="sr-only"> personas</span>
                </span>
                <span className={`text-right text-xs font-semibold tabular-nums ${low ? 'text-orange-300' : 'text-slate-300'}`}>
                  {d.attendancePct === null ? 'sin turno' : `${d.attendancePct} %${low ? ' ▼' : ''}`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
