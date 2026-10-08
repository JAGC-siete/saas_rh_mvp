import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayAttendance } from '../../lib/dashboard/overview'
import { AXIS_TEXT, ChartTooltipBox, EmptyState, GRID_LINE, LegendItem, Panel, SERIES, shortDate } from './shared'

const STACK = [
  { key: 'onTime', label: 'A tiempo', color: SERIES.onTime },
  { key: 'late', label: 'Tarde', color: SERIES.late },
  { key: 'absent', label: 'Ausente', color: SERIES.absent },
] as const

function AttendanceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DayAttendance }> }) {
  const d = active ? payload?.[0]?.payload : undefined
  if (!d) return null
  return (
    <ChartTooltipBox
      title={`${shortDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.scheduled} programados`}
      rows={[
        ...STACK.map((s) => ({ color: s.color, label: s.label, value: String(d[s.key]) })),
        ...(d.paidLeave > 0 ? [{ color: 'transparent', label: 'Permiso pagado', value: String(d.paidLeave) }] : []),
      ]}
    />
  )
}

export default function AttendanceChart({ series, scopeLabel }: { series: DayAttendance[]; scopeLabel: string }) {
  return (
    <Panel
      title="Asistencia diaria"
      subtitle={`Últimos ${series.length} días hábiles · ${scopeLabel}`}
      action={{ label: 'Ver asistencia', href: '/app/attendance/dashboard' }}
    >
      {series.length === 0 ? (
        <EmptyState>Todavía no hay días con turnos programados en este periodo.</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {STACK.map((s) => (
              <LegendItem key={s.key} color={s.color} label={s.label} />
            ))}
          </div>
          <div className="h-[220px]" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid vertical={false} stroke={GRID_LINE} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => shortDate(d)}
                  tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis tick={{ fill: AXIS_TEXT, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                <Tooltip content={<AttendanceTooltip />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
                {STACK.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    stackId="day"
                    fill={s.color}
                    stroke="#0f172a"
                    strokeWidth={1}
                    radius={i === STACK.length - 1 ? [4, 4, 0, 0] : 0}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Asistencia diaria</caption>
            <thead>
              <tr>
                <th>Fecha</th>
                {STACK.map((s) => (
                  <th key={s.key}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{d.onTime}</td>
                  <td>{d.late}</td>
                  <td>{d.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  )
}
