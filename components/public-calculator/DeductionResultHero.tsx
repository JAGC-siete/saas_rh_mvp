import { CalcSpeedComparison } from './CalculatorUiIcons'

type Props = {
  netSalaryFormatted: string
  grossSalaryFormatted: string
  paymentModality: 'quincenal' | 'mensual'
  year: number
}

export default function DeductionResultHero({
  netSalaryFormatted,
  grossSalaryFormatted,
  paymentModality,
  year,
}: Props) {
  const periodLabel = paymentModality === 'quincenal' ? 'quincenal' : 'mensual'

  return (
    <div className="glass-modern relative overflow-hidden rounded-2xl border border-green-400/35 bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-transparent p-6 sm:p-8 mb-6 shadow-[inset_0_1px_0_rgba(52,211,153,0.22)]">
      <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-green-400/15 blur-2xl" />
      <div className="relative z-10">
        <p className="text-sm text-green-300/90 font-medium mb-1">
          Salario neto {periodLabel} · {year}
        </p>
        <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-400 mb-2 tracking-tight">
          {netSalaryFormatted}
        </p>
        <p className="text-sm text-brand-300/80 mb-4">
          Bruto {periodLabel}: <span className="text-white font-medium">{grossSalaryFormatted}</span>
        </p>

        <CalcSpeedComparison manualLabel="~15 min de estrés" sisuLabel="0.2 seg — automático" className="text-xs sm:text-sm" />
      </div>
    </div>
  )
}
