import { useState } from 'react'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import { trackGA4Event } from '../../lib/analytics/ga4'
import type { PrestacionesFunnelConfig } from '../../lib/public-calculator/prestaciones-config'
import { prestacionesCalculatorUtmSource } from '../../lib/public-calculator/utm'
import { CalcCheckIcon, CalcIconTextRow } from './CalculatorUiIcons'

const SITE_BASE = 'https://humanosisu.net'

type TrojanRecipient = 'rrhh' | 'boss'

type Props = {
  trojanHorse: PrestacionesFunnelConfig['trojanHorse']
  totalFormatted: string
}

function buildShare(recipient: TrojanRecipient, script: string, label: string) {
  const params = new URLSearchParams({
    country: 'HND',
    utm_source: prestacionesCalculatorUtmSource(),
    utm_medium: 'trojan',
    utm_campaign: recipient === 'rrhh' ? 'trojan-rrhh' : 'trojan-boss',
  })
  const link = `${SITE_BASE}/activar?${params.toString()}`
  const message = `${script.trim()} ${link}`
  return {
    label,
    url: `https://wa.me/?text=${encodeURIComponent(message)}`,
    message,
    trackingContext: `calc_prestaciones_trojan_${recipient}`,
  }
}

export default function PrestacionesTrojanShare({ trojanHorse, totalFormatted }: Props) {
  const [copied, setCopied] = useState<TrojanRecipient | null>(null)

  const rrhh = buildShare('rrhh', trojanHorse.rrhh.whatsappScript, trojanHorse.rrhh.label)
  const boss = buildShare('boss', trojanHorse.boss.whatsappScript, trojanHorse.boss.label)

  const handleCopy = async (recipient: TrojanRecipient) => {
    const item = recipient === 'rrhh' ? rrhh : boss
    try {
      await navigator.clipboard.writeText(
        `${item.message}\n\n(Mi liquidación estimada: ${totalFormatted})`
      )
      setCopied(recipient)
      trackGA4Event('calc_trojan_share', {
        event_category: 'Calculator',
        event_label: `prestaciones_copy_${recipient}`,
      })
      setTimeout(() => setCopied(null), 2500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      id="trojan-horse"
      className="glass-modern rounded-2xl border border-cyan-500/30 p-5 sm:p-6 text-center scroll-mt-28"
    >
      <h3 className="text-xl font-bold text-white mb-2">{trojanHorse.headline}</h3>
      <p className="text-brand-200/90 mb-4 text-sm">{trojanHorse.subheadline}</p>
      <p className="text-xs text-brand-300/70 mb-4">Liquidación estimada: {totalFormatted}</p>
      <div className="flex flex-col gap-3">
        <TrackedWhatsAppLink
          href={rrhh.url}
          target="_blank"
          rel="noopener noreferrer"
          trackingContext={rrhh.trackingContext}
          onClick={() =>
            trackGA4Event('calc_trojan_share', {
              event_category: 'Calculator',
              event_label: 'prestaciones_rrhh',
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
              event_label: 'prestaciones_boss',
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
            {copied === 'rrhh' ? (
              <CalcIconTextRow icon={<CalcCheckIcon className="text-green-400" />}>Copiado (RRHH)</CalcIconTextRow>
            ) : (
              'Copiar mensaje (RRHH)'
            )}
          </button>
          <button
            type="button"
            onClick={() => handleCopy('boss')}
            className="py-2 px-4 text-xs text-brand-200 border border-white/20 rounded-lg hover:bg-white/5"
          >
            {copied === 'boss' ? (
              <CalcIconTextRow icon={<CalcCheckIcon className="text-green-400" />}>Copiado (Jefe)</CalcIconTextRow>
            ) : (
              'Copiar mensaje (Jefe)'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
