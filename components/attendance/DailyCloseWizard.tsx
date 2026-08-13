import { motion } from 'framer-motion'
import type { DailyCloseItem } from './DailyClosePanel'

export type DailyCloseWizardStep = 1 | 2 | 3

const STEPS: { step: DailyCloseWizardStep; label: string; description: string }[] = [
  { step: 1, label: 'Anomalías', description: 'Revisar casos críticos' },
  { step: 2, label: 'Ajustes', description: 'Corregir horarios' },
  { step: 3, label: 'Finalización', description: 'Cerrar el día' },
]

interface DailyCloseWizardProps {
  step: DailyCloseWizardStep
  onStepChange: (step: DailyCloseWizardStep) => void
  totalAnomalies: number
  resolvedAnomalies: number
  focusItems: DailyCloseItem[]
  onFocusEdit: (item: DailyCloseItem) => void
}

function RadialProgress({ pct }: { pct: number }) {
  const r = 20
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="url(#wizardGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="wizardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tabular-nums">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

export default function DailyCloseWizard({
  step,
  onStepChange,
  totalAnomalies,
  resolvedAnomalies,
  focusItems,
  onFocusEdit,
}: DailyCloseWizardProps) {
  const progressPct =
    totalAnomalies > 0 ? Math.min(100, (resolvedAnomalies / totalAnomalies) * 100) : 100

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <RadialProgress pct={progressPct} />
          <div>
            <p className="text-sm font-semibold text-white">Modo enfoque</p>
            <p className="text-xs text-gray-400">
              {resolvedAnomalies} de {totalAnomalies} anomalías resueltas
            </p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-black/20">
          {STEPS.map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => onStepChange(s.step)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                step === s.step
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s.step}. {s.label}
            </button>
          ))}
        </div>
      </div>

      {step === 1 && focusItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          {focusItems.map((item) => (
            <div
              key={item.employee.id}
              className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex flex-col gap-3"
            >
              <div>
                <p className="text-white font-medium text-sm">{item.employee.name}</p>
                <p className="text-xs text-amber-200/80 mt-1 line-clamp-2">
                  {item.anomaly_types.join(' · ') || 'Anomalía detectada'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFocusEdit(item)}
                className="text-xs font-semibold text-amber-200 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 rounded-lg py-2 transition-colors"
              >
                Quick Fix →
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {step === 3 && (
        <div className="px-4 py-3 text-xs text-emerald-200/90 bg-emerald-500/5 border-t border-emerald-500/15">
          Paso final: verifique los registros y use «Finalizar día» cuando todo esté listo.
        </div>
      )}
    </div>
  )
}
