import type { BenefitCalculationResult } from '../../lib/payroll/thirteenth-fourteenth/calculate'
import { CalcSpeedComparison } from './CalculatorUiIcons'

function formatHNL(value: number): string {
  return `L. ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type Props = {
  result: BenefitCalculationResult
  labelShort: string
  noDeductionsLine: string
}

export default function BenefitResultHero({ result, labelShort, noDeductionsLine }: Props) {
  return (
    <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-6 sm:p-8 backdrop-blur-sm">
      <p className="text-sm text-green-300/90 font-medium mb-1">Tu {labelShort.toLowerCase()} estimado</p>
      <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-400 mb-4 tracking-tight">
        {formatHNL(result.monto)}
      </p>

      <CalcSpeedComparison manualLabel="~15 min de estrés" sisuLabel="0.2 seg — automático" />

      <dl className="space-y-2 text-sm text-brand-200 border-t border-white/10 pt-4">
        <div className="flex justify-between gap-4">
          <dt>Período</dt>
          <dd className="text-right">
            {result.periodo.inicio} → {result.periodo.fin}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Días (360)</dt>
          <dd>{result.diasEnPeriodo}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Salario usado</dt>
          <dd>{formatHNL(result.salarioUsado)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Modo</dt>
          <dd>{result.modoCalculo === 'anual' ? 'Pago anual' : 'Proporcional'}</dd>
        </div>
      </dl>

      {result.tipo === '14AVO' && result.elegible14voAnual === false && (
        <p className="mt-4 text-amber-300 text-sm">
          Aviso: menos de 200 días en el ciclo jul–jun para el pago anual íntegro del 14vo. El monto mostrado es
          proporcional devengado.
        </p>
      )}
      <p className="mt-3 text-xs text-brand-300/80">{noDeductionsLine}</p>
      <p className="mt-1 text-xs text-brand-300/60">{result.desglose.formula}</p>
    </div>
  )
}
