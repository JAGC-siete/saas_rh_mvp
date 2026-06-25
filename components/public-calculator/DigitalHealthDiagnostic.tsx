import { useEffect } from 'react'
import type { PublicCalculatorConfig } from '../../lib/public-calculator/config'
import { buildDigitalHealthInsights } from '../../lib/public-calculator/digital-health'
import { trackGA4Event } from '../../lib/analytics/ga4'

type Props = {
  config: NonNullable<PublicCalculatorConfig['b2bFunnel']>
  monthlyGrossSalary: number
  netSalaryFormatted: string
}

export default function DigitalHealthDiagnostic({ config, monthlyGrossSalary, netSalaryFormatted }: Props) {
  const insights = buildDigitalHealthInsights(config, monthlyGrossSalary)

  useEffect(() => {
    trackGA4Event('calc_digital_health_view', {
      event_category: 'Calculator',
      event_label: 'digital_health',
    })
  }, [])

  return (
    <div className="glass rounded-xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
      <h3 className="text-lg font-semibold text-white mb-1">{config.digitalHealth.title}</h3>
      <p className="text-xs text-brand-300/80 mb-4">
        Basado en tu neto de <span className="text-white font-medium">{netSalaryFormatted}</span>
      </p>
      <ul className="space-y-3 text-sm">
        <li className="flex gap-2 text-brand-100">
          <span className="shrink-0" aria-hidden="true">
            ⚠️
          </span>
          <span>
            <strong className="text-amber-200">Fuga de tiempo:</strong> Tu empresa pierde ~
            {insights.timeLeakHoursPerMonth} horas al mes calculando esto en Excel.
          </span>
        </li>
        <li className="flex gap-2 text-brand-100">
          <span className="shrink-0" aria-hidden="true">
            ⚠️
          </span>
          <span>
            <strong className="text-amber-200">Burocracia ({config.digitalHealth.cavemanLabel}):</strong> Si pides una
            constancia hoy, te la darán en {insights.constanciaCaveman}.
          </span>
        </li>
        <li className="flex gap-2 text-brand-100">
          <span className="shrink-0" aria-hidden="true">
            🚀
          </span>
          <span>
            <strong className="text-green-300">Con SISU ({config.digitalHealth.proLabel}):</strong> Estaría en tu
            correo en {insights.constanciaPro}.
          </span>
        </li>
      </ul>
    </div>
  )
}
