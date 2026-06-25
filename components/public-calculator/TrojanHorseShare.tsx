import { useState } from 'react'
import type { CountryCode } from '../../lib/country/supported'
import type { PublicCalculatorConfig } from '../../lib/public-calculator/config'
import {
  buildTrojanShareMessage,
  buildTrojanShareUrl,
  type TrojanRecipient,
} from '../../lib/public-calculator/trojan-whatsapp'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import { trackGA4Event } from '../../lib/analytics/ga4'

type Props = {
  config: NonNullable<PublicCalculatorConfig['b2bFunnel']>
  countryCode: CountryCode
  compact?: boolean
}

export default function TrojanHorseShare({ config, countryCode, compact = false }: Props) {
  const [copied, setCopied] = useState<TrojanRecipient | null>(null)

  const share = (recipient: TrojanRecipient) => {
    const script =
      recipient === 'rrhh' ? config.trojanHorse.rrhh.whatsappScript : config.trojanHorse.boss.whatsappScript
    return {
      label: recipient === 'rrhh' ? config.trojanHorse.rrhh.label : config.trojanHorse.boss.label,
      url: buildTrojanShareUrl(script, countryCode, recipient),
      message: buildTrojanShareMessage(script, countryCode, recipient),
      trackingContext: `calc_trojan_${recipient}_${countryCode.toLowerCase()}`,
    }
  }

  const handleCopy = async (recipient: TrojanRecipient) => {
    const { message } = share(recipient)
    try {
      await navigator.clipboard.writeText(message)
      setCopied(recipient)
      trackGA4Event('calc_trojan_share', {
        event_category: 'Calculator',
        event_label: `copy_${recipient}`,
      })
      setTimeout(() => setCopied(null), 2500)
    } catch {
      // ignore
    }
  }

  const rrhh = share('rrhh')
  const boss = share('boss')

  return (
    <div
      id="trojan-horse"
      className={`glass-modern rounded-xl border border-cyan-500/30 ${compact ? 'p-4' : 'p-6'} text-center scroll-mt-28`}
    >
      {!compact && (
        <>
          <h3 className="text-xl font-bold text-white mb-2">{config.trojanHorse.headline}</h3>
          <p className="text-brand-200/90 mb-4 text-sm">{config.trojanHorse.subheadline}</p>
        </>
      )}
      <div className="flex flex-col gap-3">
        <TrackedWhatsAppLink
          href={rrhh.url}
          target="_blank"
          rel="noopener noreferrer"
          trackingContext={rrhh.trackingContext}
          onClick={() =>
            trackGA4Event('calc_trojan_share', {
              event_category: 'Calculator',
              event_label: 'rrhh',
            })
          }
          className="inline-block w-full py-3 px-5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-sm"
        >
          {rrhh.label}
        </TrackedWhatsAppLink>
        <TrackedWhatsAppLink
          href={boss.url}
          target="_blank"
          rel="noopener noreferrer"
          trackingContext={boss.trackingContext}
          onClick={() =>
            trackGA4Event('calc_trojan_share', {
              event_category: 'Calculator',
              event_label: 'boss',
            })
          }
          className="inline-block w-full py-3 px-5 bg-green-600/90 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-sm"
        >
          {boss.label}
        </TrackedWhatsAppLink>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => handleCopy('rrhh')}
            className="py-2 px-4 text-xs text-brand-200 border border-white/20 rounded-lg hover:bg-white/5"
          >
            {copied === 'rrhh' ? '✓ Copiado' : 'Copiar mensaje (RRHH)'}
          </button>
          <button
            type="button"
            onClick={() => handleCopy('boss')}
            className="py-2 px-4 text-xs text-brand-200 border border-white/20 rounded-lg hover:bg-white/5"
          >
            {copied === 'boss' ? '✓ Copiado' : 'Copiar mensaje (Jefe)'}
          </button>
        </div>
      </div>
    </div>
  )
}
