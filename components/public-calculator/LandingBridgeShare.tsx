import Link from 'next/link'
import type { PublicCalculatorConfig } from '../../lib/public-calculator/config'
import type { CalculatorTool } from '../../lib/analytics/calculator-events'
import { trackCalcActivarClick } from '../../lib/analytics/calculator-events'
import CalculatorShareTrigger from './CalculatorShareTrigger'

type Props = {
  config: PublicCalculatorConfig
  activarUrl: string
  calcTool: CalculatorTool
  size?: 'sm' | 'md'
}

export default function LandingBridgeShare({ config, activarUrl, calcTool, size = 'sm' }: Props) {
  const pad = size === 'sm' ? 'py-2.5 px-5 text-sm' : 'py-3 px-8'

  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
      <CalculatorShareTrigger
        config={config}
        calcTool={calcTool}
        placement="bridge"
        size={size}
      />
      <Link
        href={activarUrl}
        onClick={() => trackCalcActivarClick(calcTool, 'footer')}
        className={`inline-block ${pad} bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all text-center`}
      >
        {config.landingBridge.activarButton}
      </Link>
    </div>
  )
}
