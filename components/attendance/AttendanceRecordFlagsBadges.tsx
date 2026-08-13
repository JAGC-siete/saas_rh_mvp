import { formatPunchAnomalyLabel } from '../../lib/attendance/punch-mapping'

export type AttendanceListFlags = {
  horario_no_detectado?: boolean
  razon?: string
  gap_minutos?: number
  has_anomaly?: boolean
  anomaly_types?: string[]
  close_state?: 'draft' | 'finalized' | string
  punch_count?: number
  biometric_mode?: string
}

export function AttendanceRecordFlagsBadges({ flags }: { flags?: AttendanceListFlags | null }) {
  if (!flags) return null

  const chips: { key: string; label: string; className: string }[] = []

  if (flags.close_state === 'finalized') {
    chips.push({ key: 'closed', label: 'Cerrado', className: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' })
  } else if (flags.close_state === 'draft') {
    chips.push({ key: 'draft', label: 'Borrador cierre', className: 'bg-slate-500/20 text-slate-200 border-slate-500/30' })
  }

  if (flags.has_anomaly || (flags.anomaly_types && flags.anomaly_types.length > 0)) {
    const t = flags.anomaly_types?.length
      ? flags.anomaly_types.slice(0, 2).map(formatPunchAnomalyLabel).join(', ')
      : 'Anomalía'
    chips.push({ key: 'anom', label: t, className: 'bg-amber-500/20 text-amber-200 border-amber-500/30' })
  }

  if (typeof flags.punch_count === 'number' && flags.punch_count > 0) {
    chips.push({
      key: 'punches',
      label: `${flags.punch_count} marca${flags.punch_count === 1 ? '' : 's'}`,
      className: 'bg-blue-500/15 text-blue-200 border-blue-500/25',
    })
  }

  if (flags.biometric_mode && ['STRICT_2', 'STRICT_4', 'FLEXIBLE'].includes(flags.biometric_mode)) {
    chips.push({
      key: 'mode',
      label: flags.biometric_mode.replace('_', '·'),
      className: 'bg-white/10 text-gray-300 border-white/15',
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map((c) => (
        <span
          key={c.key}
          className={`inline-block px-1.5 py-0.5 text-[10px] rounded border ${c.className} max-w-[200px] truncate`}
          title={c.label}
        >
          {c.label}
        </span>
      ))}
    </div>
  )
}
