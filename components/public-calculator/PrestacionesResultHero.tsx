import type { LiquidacionResult } from '../../lib/payroll/cesantias'
import { CalcSpeedComparison } from './CalculatorUiIcons'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

const BREAKDOWN_ROWS: Array<{
  key: keyof LiquidacionResult['rubros']
  label: string
  help: string
}> = [
  {
    key: 'preaviso',
    label: 'Preaviso',
    help: 'Pago por falta de preaviso cuando aplica y no se trabajó.',
  },
  {
    key: 'cesantiaBruta',
    label: 'Cesantía (bruta)',
    help: 'Auxilio de cesantía antes de descuentos/compensaciones.',
  },
  {
    key: 'rapAplicado',
    label: 'RAP aplicado',
    help: 'Monto de RAP usado para compensar la cesantía.',
  },
  {
    key: 'cesantiaNeta',
    label: 'Cesantía (neta)',
    help: 'Cesantía bruta menos RAP aplicado.',
  },
  {
    key: 'vacaciones',
    label: 'Vacaciones proporcionales',
    help: 'Estimación por vacaciones según antigüedad.',
  },
  {
    key: 'aguinaldo',
    label: '13vo mes proporcional',
    help: 'Proporcional del 13vo (año comercial 360).',
  },
  {
    key: 'decimoCuarto',
    label: '14vo mes proporcional',
    help: 'Proporcional del 14vo desde julio (año 360).',
  },
  {
    key: 'reservaLaboralEnTotal',
    label: 'Reserva laboral',
    help: 'Estimación del saldo RAP (4% sobre salario ordinario). Puede diferir del monto efectivo depositado.',
  },
]

type Props = {
  result: LiquidacionResult
  incluirRAP: boolean
  disclaimer: string
}

export default function PrestacionesResultHero({ result, incluirRAP, disclaimer }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-6 sm:p-8">
        <p className="text-sm text-green-300/90 font-medium mb-1">Total estimado a recibir</p>
        <p className="text-4xl sm:text-5xl font-bold text-green-400 mb-4 tracking-tight">
          {formatCurrency(result.rubros.totalPagar)}
        </p>

        <CalcSpeedComparison
          manualLabel="Horas de estrés y errores"
          sisuLabel="Segundos — automático"
          className="mb-4 text-xs sm:text-sm"
        />

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-brand-200 border-t border-white/10 pt-4">
          <div>
            <dt className="text-brand-300/70">Salario base</dt>
            <dd className="text-white">{formatCurrency(result.bases.salarioBaseMensual)}</dd>
          </div>
          <div>
            <dt className="text-brand-300/70">Salario promedio</dt>
            <dd className="text-white">{formatCurrency(result.bases.salarioPromedioMensual)}</dd>
          </div>
          <div>
            <dt className="text-brand-300/70">Antigüedad (360)</dt>
            <dd className="text-white">
              {result.tiempos.anos}a {result.tiempos.meses}m {result.tiempos.dias}d
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Desglose por concepto</h2>
        <div className="space-y-2">
          {BREAKDOWN_ROWS.map((row) => (
            <div key={row.key} className="glass rounded-xl p-4 border border-white/10 flex justify-between gap-4">
              <div className="min-w-0">
                <div className="text-white font-medium text-sm">{row.label}</div>
                <div className="text-xs text-brand-200/70 mt-0.5">{row.help}</div>
                {row.key === 'rapAplicado' && !incluirRAP && (
                  <div className="text-xs text-brand-300/60 mt-1">No incluido en el cálculo.</div>
                )}
              </div>
              <div className="text-lg font-bold text-white shrink-0">
                {formatCurrency(result.rubros[row.key])}
              </div>
            </div>
          ))}
          <div className="glass rounded-xl p-4 border border-white/10 flex justify-between items-center">
            <span className="text-white font-semibold">Total</span>
            <span className="text-xl font-bold text-green-400">{formatCurrency(result.rubros.totalPagar)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-brand-300/80">{result.metadata.reservaLaboralDisclaimer}</p>
      <p className="text-xs text-brand-300/80">{disclaimer}</p>
    </div>
  )
}
