import Link from 'next/link'
import type { CalculatorTool } from '../../lib/analytics/calculator-events'
import { trackCTAClick } from '../../lib/analytics/googleAds'
import type { PublicCalculatorConfig } from '../../lib/public-calculator/config'
import {
  appendSuscripcionUtmParams,
  CALCULATOR_SUBSCRIPTION_BRIDGE,
} from '../../lib/public-calculator/subscription-bridge'
import CalculatorShareTrigger from './CalculatorShareTrigger'

type Props = {
  tool: CalculatorTool
  placement?: 'footer' | 'post-calc'
  shareConfig: PublicCalculatorConfig
}

export default function CalculatorSubscriptionBridge({
  tool,
  placement = 'footer',
  shareConfig,
}: Props) {
  const suscripcionHref = appendSuscripcionUtmParams(tool, placement)

  return (
    <section className="glass-modern rounded-2xl p-5 sm:p-6 border border-brand-500/25 bg-brand-600/5">
      <h2 className="text-lg font-bold text-white mb-2">{CALCULATOR_SUBSCRIPTION_BRIDGE.title}</h2>
      <p className="text-sm text-brand-200/90 mb-4 leading-relaxed">{CALCULATOR_SUBSCRIPTION_BRIDGE.body}</p>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <Link
          href={suscripcionHref}
          onClick={() => trackCTAClick('suscripcion', `calc_${tool}_${placement}`)}
          className="inline-flex justify-center py-3 px-5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm text-center transition-all"
        >
          {CALCULATOR_SUBSCRIPTION_BRIDGE.ctaLabel}
        </Link>
        <CalculatorShareTrigger
          config={shareConfig}
          calcTool={tool}
          placement="bridge"
          label={CALCULATOR_SUBSCRIPTION_BRIDGE.shareLabel}
          size="sm"
          className="inline-flex justify-center py-3 px-5"
        />
        <Link
          href={CALCULATOR_SUBSCRIPTION_BRIDGE.pricingHref}
          className="inline-flex justify-center py-3 px-5 text-brand-300 hover:text-white underline decoration-white/20 text-sm text-center"
        >
          {CALCULATOR_SUBSCRIPTION_BRIDGE.pricingLabel}
        </Link>
      </div>
    </section>
  )
}
