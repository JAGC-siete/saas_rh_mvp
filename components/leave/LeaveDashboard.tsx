import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { LeaveRequest, LeaveType } from '../../lib/types/leave'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { useNotificationContext } from '../NotificationProvider'
import { cn } from '../../lib/utils'
import { parseISO, isWithinInterval, startOfDay, subDays, getISOWeek, getISOWeekYear } from 'date-fns'

export type LeaveDashboardRange = '30d' | '90d' | 'all'

function requestInRange(
  r: LeaveRequest,
  range: LeaveDashboardRange,
  now: Date
): boolean {
  if (range === 'all') return true
  const days = range === '30d' ? 30 : 90
  const from = startOfDay(subDays(now, days))
  const to = startOfDay(now)
  try {
    const start = parseISO(r.start_date.slice(0, 10))
    const end = parseISO(r.end_date.slice(0, 10))
    return (
      isWithinInterval(start, { start: from, end: to }) ||
      isWithinInterval(end, { start: from, end: to }) ||
      (start <= from && end >= to)
    )
  } catch {
    return true
  }
}

export interface LeaveDashboardProps {
  leaveRequests: LeaveRequest[]
  leaveTypes: LeaveType[]
  className?: string
}

export default function LeaveDashboard({
  leaveRequests,
  leaveTypes,
  className,
}: LeaveDashboardProps) {
  const { addNotification } = useNotificationContext()
  const [range, setRange] = useState<LeaveDashboardRange>('30d')
  const now = useMemo(() => new Date(), [])
  const lastNotifiedPendingRef = useRef<number | null>(null)

  const filtered = useMemo(
    () => leaveRequests.filter((r) => requestInRange(r, range, now)),
    [leaveRequests, range, now]
  )

  const kpis = useMemo(() => {
    let pending = 0
    let approved = 0
    let rejected = 0
    let daysApproved = 0
    for (const r of filtered) {
      if (r.status === 'pending') pending += 1
      else if (r.status === 'approved') {
        approved += 1
        daysApproved += Number(r.days_requested) || 0
      } else if (r.status === 'rejected') rejected += 1
    }
    return { pending, approved, rejected, daysApproved, total: filtered.length }
  }, [filtered])

  useEffect(() => {
    const pending = kpis.pending
    const last = lastNotifiedPendingRef.current
    // Notify once (or when count changes) to avoid spam on re-renders.
    if (pending > 0 && pending !== last) {
      addNotification({
        type: 'warning',
        title: 'Permisos pendientes',
        message: `Hay ${pending} solicitud${pending === 1 ? '' : 'es'} esperando aprobación.`,
        duration: 8000,
      })
      lastNotifiedPendingRef.current = pending
    }
    if (pending === 0) {
      lastNotifiedPendingRef.current = 0
    }
  }, [kpis.pending, addNotification])

  const byType = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>()
    for (const r of filtered) {
      const name =
        r.leave_type?.name ||
        leaveTypes.find((t) => t.id === r.leave_type_id)?.name ||
        'Otro'
      const color =
        r.leave_type?.color ||
        leaveTypes.find((t) => t.id === r.leave_type_id)?.color ||
        '#64748b'
      const prev = map.get(r.leave_type_id) || { name, value: 0, color }
      prev.value += 1
      map.set(r.leave_type_id, prev)
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [filtered, leaveTypes])

  const byWeek = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const r of filtered) {
      const d = r.created_at?.slice(0, 10) || r.start_date.slice(0, 10)
      try {
        const dt = parseISO(d)
        const y = getISOWeekYear(dt)
        const w = getISOWeek(dt)
        const key = `${y}-W${String(w).padStart(2, '0')}`
        buckets.set(key, (buckets.get(key) || 0) + 1)
      } catch {
        const key = '—'
        buckets.set(key, (buckets.get(key) || 0) + 1)
      }
    }
    return Array.from(buckets.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-12)
  }, [filtered])

  const rangeLabel =
    range === '30d' ? 'Últimos 30 días' : range === '90d' ? 'Últimos 90 días' : 'Todo el historial'

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Resumen</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rango de fechas">
          {(
            [
              ['30d', '30 días'],
              ['90d', '90 días'],
              ['all', 'Todo'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={range === key ? 'default' : 'secondary'}
              className={cn(
                'rounded-full text-xs',
                range !== key && 'bg-white/5 border-white/10 text-gray-300'
              )}
              onClick={() => setRange(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Pendientes" value={kpis.pending} accent="amber" badge={kpis.pending > 0 ? kpis.pending : undefined} />
        <KpiCard label="Aprobadas" value={kpis.approved} accent="emerald" />
        <KpiCard label="Rechazadas" value={kpis.rejected} accent="rose" />
        <KpiCard
          label="Días aprobados"
          value={kpis.daysApproved % 1 === 0 ? String(kpis.daysApproved) : kpis.daysApproved.toFixed(1)}
          sub={rangeLabel}
          accent="sky"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="glass" className="border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Por tipo de permiso</CardTitle>
            <p className="text-xs text-gray-400 font-normal">Cantidad de solicitudes · {rangeLabel}</p>
          </CardHeader>
          <CardContent className="h-[260px]">
            {byType.length === 0 ? (
              <EmptyChart message="Sin solicitudes en el rango" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {byType.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.2)" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number | undefined) => [v ?? 0, 'Solicitudes']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f8fafc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card variant="glass" className="border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Solicitudes por semana</CardTitle>
            <p className="text-xs text-gray-400 font-normal">Alta según fecha de creación · últimas barras</p>
          </CardHeader>
          <CardContent className="h-[260px]">
            {byWeek.length === 0 ? (
              <EmptyChart message="Sin datos para graficar" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byWeek} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={32} />
                  <Tooltip
                    formatter={(v: number | undefined) => [v ?? 0, 'Solicitudes']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Solicitudes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string
  value: string | number
  sub?: string
  accent: 'amber' | 'emerald' | 'rose' | 'sky'
  badge?: string | number
}) {
  const ring =
    accent === 'amber'
      ? 'border-amber-400/25 bg-amber-500/10'
      : accent === 'emerald'
        ? 'border-emerald-400/25 bg-emerald-500/10'
        : accent === 'rose'
          ? 'border-rose-400/25 bg-rose-500/10'
          : 'border-sky-400/25 bg-sky-500/10'
  return (
    <div className={cn('relative rounded-xl border p-4', ring)}>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
      {badge != null && (
        <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none shadow">
          {badge}
        </span>
      )}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-gray-400 border border-dashed border-white/15 rounded-lg">
      {message}
    </div>
  )
}
