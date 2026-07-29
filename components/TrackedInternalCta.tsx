import Link, { type LinkProps } from 'next/link'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { trackCTAClick } from '../lib/analytics/googleAds'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  LinkProps & {
    href: string
    ctaType: string
    location: string
    children: ReactNode
  }

/**
 * Internal marketing CTA (/activar, /ventas, tools): GA4 engagement only — never Ads conversion.
 */
export default function TrackedInternalCta({
  ctaType,
  location,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        trackCTAClick(ctaType, location)
        onClick?.(e)
      }}
    >
      {children}
    </Link>
  )
}
