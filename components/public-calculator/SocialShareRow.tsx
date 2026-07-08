import type { CountryCode } from '../../lib/country/supported'
import type { SocialNetwork, SocialSharePlacement } from '../../lib/public-calculator/social-share'
import { buildSocialShareUrl } from '../../lib/public-calculator/social-share'
import { buildCalculatorShareLink } from '../../lib/public-calculator/bridge-share'
import { trackGA4Event } from '../../lib/analytics/ga4'
import type { CalculatorTool } from '../../lib/analytics/calculator-events'

type Props = {
  path: string
  countryCode: CountryCode
  text: string
  label: string
  calcTool: CalculatorTool
  placement: SocialSharePlacement
  onShare?: () => void
}

const NETWORKS: Array<{
  id: SocialNetwork
  label: string
  className: string
  icon: React.ReactNode
}> = [
  {
    id: 'x',
    label: 'X',
    className: 'hover:bg-white/15',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    className: 'hover:bg-blue-600/30',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    className: 'hover:bg-sky-600/30',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
]

export default function SocialShareRow({
  path,
  countryCode,
  text,
  label,
  calcTool,
  placement,
  onShare,
}: Props) {
  const handleShare = (network: SocialNetwork) => {
    const url = buildCalculatorShareLink(path, countryCode, `share-${network}`)
    const shareUrl = buildSocialShareUrl(network, url, text)
    trackGA4Event('calc_social_share', {
      event_category: 'Calculator',
      event_label: `${placement}_${network}`,
      tool: calcTool,
      network,
    })
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
    onShare?.()
  }

  return (
    <div>
      <p className="text-xs text-brand-300/80 text-center mb-2">{label}</p>
      <div className="flex justify-center gap-3">
        {NETWORKS.map((network) => (
          <button
            key={network.id}
            type="button"
            onClick={() => handleShare(network.id)}
            className={`inline-flex items-center justify-center h-11 w-11 rounded-xl border border-white/20 text-white transition-colors ${network.className}`}
            aria-label={`Compartir en ${network.label}`}
            title={network.label}
          >
            {network.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
