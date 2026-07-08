import { useEffect, useState } from 'react'
import type { PublicCalculatorConfig } from '../../lib/public-calculator/config'
import type { CalculatorTool } from '../../lib/analytics/calculator-events'
import { trackGA4Event } from '../../lib/analytics/ga4'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import {
  buildBossShareUrl,
  buildCalculatorShareLink,
  buildPeerShareMessage,
  buildPeerShareUrl,
  type CalculatorShareCampaign,
} from '../../lib/public-calculator/bridge-share'
import type { SocialSharePlacement } from '../../lib/public-calculator/social-share'
import { CalcCheckIcon, CalcIconTextRow } from './CalculatorUiIcons'
import SocialShareRow from './SocialShareRow'

type Props = {
  config: PublicCalculatorConfig
  calcTool: CalculatorTool
  placement: SocialSharePlacement
  open: boolean
  onClose: () => void
}

function campaignsForPlacement(placement: SocialSharePlacement) {
  const prefix = placement === 'post-calc' ? 'post-calc' : 'bridge'
  return {
    peer: `${prefix}-share-peer` as CalculatorShareCampaign,
    copy: `${prefix}-share-copy` as CalculatorShareCampaign,
    native: `${prefix}-share-native` as CalculatorShareCampaign,
  }
}

export default function CalculatorShareSheet({ config, calcTool, placement, open, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const share = config.landingBridge.share
  const b2b = config.b2bFunnel
  const campaigns = campaignsForPlacement(placement)
  const peerScript =
    placement === 'post-calc' ? config.socialShare.postCalcScript : share.peerScript
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const peerUrl = buildPeerShareUrl(peerScript, config.path, config.countryCode, campaigns.peer)
  const peerCopyText = buildPeerShareMessage(peerScript, config.path, config.countryCode, campaigns.copy)
  const peerLink = buildCalculatorShareLink(config.path, config.countryCode, campaigns.native)
  const bossUrl = b2b ? buildBossShareUrl(b2b.trojanHorse.rrhh.whatsappScript, config.countryCode) : null

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const trackShare = (option: string) => {
    trackGA4Event(placement === 'post-calc' ? 'calc_postcalc_share' : 'calc_bridge_share', {
      event_category: 'Calculator',
      event_label: option,
      tool: calcTool,
      country: config.countryCode,
    })
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
        text: peerScript,
        url: peerLink,
      })
      trackShare('native')
      onClose()
    } catch {
      // user cancelled or share failed
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculator-share-title"
        className="relative w-full max-w-md glass-modern rounded-2xl border border-white/15 p-5 sm:p-6 shadow-2xl"
      >
        <h4 id="calculator-share-title" className="text-lg font-bold text-white mb-4 text-center">
          {share.sheetTitle}
        </h4>
        <div className="flex flex-col gap-3">
          <TrackedWhatsAppLink
            href={peerUrl}
            target="_blank"
            rel="noopener noreferrer"
            trackingContext={`calc_${placement}_share_peer_${config.countryCode.toLowerCase()}`}
            onClick={() => {
              trackShare('peer')
              onClose()
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
              trackingContext={`calc_${placement}_share_boss_${config.countryCode.toLowerCase()}`}
              onClick={() => {
                trackShare('boss')
                onClose()
              }}
              className="inline-block w-full py-3 px-5 bg-green-600/90 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-sm text-center"
            >
              {share.bossLabel}
            </TrackedWhatsAppLink>
          )}
          <SocialShareRow
            path={config.path}
            countryCode={config.countryCode}
            text={peerScript}
            label={config.socialShare.networksLabel}
            calcTool={calcTool}
            placement={placement}
            onShare={onClose}
          />
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
          onClick={onClose}
          className="mt-4 w-full py-2 text-sm text-brand-300 hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
