import type { PublicCalculatorConfig } from '../../lib/public-calculator/config'
import { trackGA4Event } from '../../lib/analytics/ga4'

export type CalculatorAudience = 'empleado' | 'jefe'

type Props = {
  config: NonNullable<PublicCalculatorConfig['b2bFunnel']>
  audience: CalculatorAudience | null
  onSelect: (audience: CalculatorAudience) => void
}

export default function AudienceSelector({ config, audience, onSelect }: Props) {
  const options: Array<{ id: CalculatorAudience; title: string; body: string }> = [
    { id: 'empleado', title: config.audience.employeeTitle, body: config.audience.employeeBody },
    { id: 'jefe', title: config.audience.bossTitle, body: config.audience.bossBody },
  ]

  return (
    <div className="glass-modern rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/10">
      <h3 className="text-lg font-bold text-white text-center mb-4">¿Cómo llegaste aquí?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => {
          const active = audience === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onSelect(opt.id)
                trackGA4Event('calc_audience_select', {
                  event_category: 'Calculator',
                  event_label: opt.id,
                })
              }}
              className={`text-left rounded-xl border-2 px-5 py-4 transition-all ${
                active
                  ? 'border-brand-500/70 bg-brand-600/80 text-white'
                  : 'border-white/20 bg-white/5 text-brand-200 hover:border-cyan-400/50 hover:bg-white/10'
              }`}
              aria-pressed={active}
            >
              <div className="font-semibold text-lg">{opt.title}</div>
              {opt.body ? <p className="text-sm mt-2 opacity-90">{opt.body}</p> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
