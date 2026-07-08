import { useState } from 'react'
import type { PublicCalculatorConfig } from '../../lib/public-calculator/config'
import type { CalculatorTool } from '../../lib/analytics/calculator-events'
import type { SocialSharePlacement } from '../../lib/public-calculator/social-share'
import CalculatorShareSheet from './CalculatorShareSheet'

type Props = {
  config: PublicCalculatorConfig
  calcTool: CalculatorTool
  placement: SocialSharePlacement
  label?: string
  size?: 'sm' | 'md'
  className?: string
  fullWidth?: boolean
}

export default function CalculatorShareTrigger({
  config,
  calcTool,
  placement,
  label,
  size = 'sm',
  className = '',
  fullWidth = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const pad = size === 'sm' ? 'py-2.5 px-5 text-sm' : 'py-3 px-8'
  const buttonLabel =
    label ??
    (placement === 'post-calc' ? config.socialShare.postCalcButton : config.landingBridge.shareButton)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${fullWidth ? 'w-full' : 'inline-block'} ${pad} border border-white/25 text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-center ${className}`}
      >
        {buttonLabel}
      </button>
      <CalculatorShareSheet
        config={config}
        calcTool={calcTool}
        placement={placement}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
