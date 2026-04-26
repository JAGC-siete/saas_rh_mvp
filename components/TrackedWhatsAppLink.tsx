import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { trackWhatsAppClick } from '../lib/analytics/googleAds'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  trackingContext: string
  children: ReactNode
}

/**
 * Enlace a WhatsApp (wa.me) con evento de analítica para Ads/engagement.
 */
export default function TrackedWhatsAppLink({
  trackingContext,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        trackWhatsAppClick(trackingContext)
        onClick?.(e)
      }}
    >
      {children}
    </a>
  )
}
