type Props = {
  points: number
  maxPoints: number
  label?: string
  /** Hide score suffix (e.g. /info unlock bar). */
  compact?: boolean
}

export default function InfoProgressRail({ points, maxPoints, label = 'Progreso', compact = false }: Props) {
  const pct = Math.min(100, Math.round((points / maxPoints) * 100))

  return (
    <div className="sticky top-16 sm:top-20 z-30 mb-6">
      <div className="glass-modern rounded-xl border border-white/15 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-brand-200/90 tracking-wide">{label}</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {compact ? `${pct}%` : `${points}/${maxPoints} pts`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={points}
            aria-valuemin={0}
            aria-valuemax={maxPoints}
          />
        </div>
      </div>
    </div>
  )
}
