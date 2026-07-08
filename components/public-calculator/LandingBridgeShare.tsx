import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PublicCalculatorConfig } from '../../lib/public-calculator/config'
import type { CalculatorTool } from '../../lib/analytics/calculator-events'
import { trackCalcActivarClick } from '../../lib/analytics/calculator-events'
import { trackGA4Event } from '../../lib/analytics/ga4'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import {
  buildBossShareUrl,
  buildCalculatorShareLink,
  buildPeerShareMessage,
  buildPeerShareUrl,
} from '../../lib/public-calculator/bridge-share'
import { CalcCheckIcon, CalcIconTextRow } from './CalculatorUiIcons'

type Props = {
  config: PublicCalculatorConfig
  activarUrl: string
  calcTool: CalculatorTool
  size?: 'sm' | 'md'
}

export default function LandingBridgeShare({ config, activarUrl, calcTool, size = 'sm' }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const share = config.landingBridge.share
  const b2b = config.b2bFunnel
  const pad = size === 'sm' ? 'py-2.5 px-5 text-sm' : 'py-3 px-8'
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const peerUrl = buildPeerShareUrl(share.peerScript, config.path, config.countryCode)
  const peerCopyText = buildPeerShareMessage(
    share.peerScript,
    config.path,
    config.countryCode,
    'bridge-share-copy'
  )
  const peerLink = buildCalculatorShareLink(config.path, config.countryCode, 'bridge-share-native')
  const bossUrl = b2b ? buildBossShareUrl(b2b.trojanHorse.rrhh.whatsappScript, config.countryCode) : null

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const trackShare = (option: 'open' | 'peer' | 'boss' | 'copy' | 'native') => {
    trackGA4Event('calc_bridge_share', {
      event_category: 'Calculator',
      event_label: option,
      tool: calcTool,
      country: config.countryCode,
    })
  }

  const openSheet = () => {
    trackShare('open')
    setOpen(true)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(peerCopyText)
      setCopied(true)
      trackShare('copy')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // ignore
    }
  }

  const handleNativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: 'Calculadora de deducciones SISU',
        text: share.peerScript,
        url: peerLink,
      })
      trackShare('native')
      setOpen(false)
    } catch {
      // user cancelled or share failed
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={openSheet}
          className={`inline-block ${pad} border border-white/25 text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-center`}
        >
          {config.landingBridge.shareButton}
        </button>
        <Link
          href={activarUrl}
          onClick={() => trackCalcActivarClick(calcTool, 'footer')}
          className={`inline-block ${pad} bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all text-center`}
        >
          {config.landingBridge.activarButton}
        </Link>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-bridge-share-title"
            className="relative w-full max-w-md glass-modern rounded-2xl border border-white/15 p-5 sm:p-6 shadow-2xl"
          >
            <h4 id="landing-bridge-share-title" className="text-lg font-bold text-white mb-4 text-center">
              {share.sheetTitle}
            </h4>
            <div className="flex flex-col gap-3">
              <TrackedWhatsAppLink
                href={peerUrl}
                target="_blank"
                rel="noopener noreferrer"
                trackingContext={`calc_bridge_share_peer_${config.countryCode.toLowerCase()}`}
                onClick={() => {
                  trackShare('peer')
                  setOpen(false)
                }}
                className="inline-block w-full py-3 px-5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-sm text-center"
              >
                {share.peerLabel}
              </TrackedWhatsAppLink>
              {bossUrl && (
                <TrackedWhatsAppLink
                  href={bossUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  trackingContext={`calc_bridge_share_boss_${config.countryCode.toLowerCase()}`}
                  onClick={() => {
                    trackShare('boss')
                    setOpen(false)
                  }}
                  className="inline-block w-full py-3 px-5 bg-green-600/90 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-sm text-center"
                >
                  {share.bossLabel}
                </TrackedWhatsAppLink>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-3 px-5 text-sm text-brand-100 border border-white/20 rounded-xl hover:bg-white/5 transition-colors"
              >
                {copied ? (
                  <CalcIconTextRow icon={<CalcCheckIcon className="text-green-400" />}>
                    {share.copiedLabel}
                  </CalcIconTextRow>
                ) : (
                  share.copyLabel
                )}
              </button>
              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-5 text-xs text-brand-200 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                >
                  {share.moreOptionsLabel}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full py-2 text-sm text-brand-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
