type Props = {
  /** 0 = pantalla inicial; 1–3 = pasos del wizard */
  step: number
  totalSteps?: number
  title: string
  stepLabels: [string, string, string]
  /** Tailwind gradient stops, e.g. from-cyan-500 to-brand-500 */
  gradientClass?: string
  /** Clases para puntos activos/completados */
  dotClass?: string
}

function clampStep(step: number, total: number): number {
  return Math.max(0, Math.min(total, step))
}

export default function WizardStepProgress({
  step,
  totalSteps = 3,
  title,
  stepLabels,
  gradientClass = 'from-cyan-500 to-brand-500',
  dotClass = 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] ring-cyan-400/40',
}: Props) {
  const current = clampStep(step, totalSteps)
  const pct = current === 0 ? 0 : Math.round((current / totalSteps) * 100)

  return (
    <div className="mb-6">
      <div className="glass-modern rounded-xl border border-white/15 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-brand-200/90 tracking-wide">{title}</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {current === 0 ? `0% · ${totalSteps} pasos` : `${pct}% · Paso ${current} de ${totalSteps}`}
          </span>
        </div>

        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-500 ease-out`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title}: ${pct}%`}
          />
        </div>

        <div className="grid grid-cols-3 gap-1">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1
            const done = current > stepNum
            const active = current === stepNum
            return (
              <div key={label} className="text-center min-w-0">
                <div
                  className={`mx-auto mb-1 h-2 w-2 rounded-full transition-colors ${
                    done || active ? dotClass : 'bg-white/20'
                  } ${active ? 'ring-2 ring-offset-1 ring-offset-transparent scale-125' : ''}`}
                />
                <p
                  className={`text-[10px] sm:text-xs truncate px-0.5 ${
                    active ? 'text-white font-medium' : done ? 'text-brand-200/80' : 'text-brand-400/60'
                  }`}
                >
                  {label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
