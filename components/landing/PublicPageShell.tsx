import dynamic from 'next/dynamic'
import { type ReactNode } from 'react'
import DemoFooter from '../DemoFooter'
import DockNavbar from './DockNavbar'
import MeshBackground from './MeshBackground'
import TrustBar from './TrustBar'
import MarketingStyles from '../marketing/MarketingStyles'
import LandingHreflang from './LandingHreflang'
import { useLandingPreferences, useLandingToneLock } from './LandingPreferencesProvider'
import type { LandingTone } from '../../lib/landing/theme'

const CursorSpotlight = dynamic(() => import('./CursorSpotlight'), { ssr: false })

export type PublicPageTone = LandingTone

interface PublicPageShellProps {
  children: ReactNode
  showSpotlight?: boolean
  showFooter?: boolean
  showTrustBar?: boolean
  loginAlwaysVisible?: boolean
  mainClassName?: string
  centered?: boolean
  /**
   * Lock canvas tone (e.g. /paz stays light). Syncs DOM tokens via provider and hides theme toggle.
   */
  toneLock?: PublicPageTone
  /** @deprecated Prefer toneLock or preference; kept for call-site compatibility. */
  tone?: PublicPageTone
}

export default function PublicPageShell({
  children,
  showSpotlight = false,
  showFooter = true,
  showTrustBar = false,
  loginAlwaysVisible = false,
  mainClassName = '',
  centered = false,
  toneLock,
  tone: toneProp,
}: PublicPageShellProps) {
  const { tone: prefTone } = useLandingPreferences()
  useLandingToneLock(toneLock)
  const tone = toneLock ?? toneProp ?? prefTone
  const isLight = tone === 'light'

  return (
    <div
      className={`landing-shell landing-tone-surface min-h-screen relative ${
        isLight ? 'bg-white text-slate-900' : 'bg-mesh text-white'
      }`}
    >
      <MarketingStyles sheets={['landing', 'landing-liquid']} />
      <LandingHreflang />
      {!isLight && <MeshBackground />}
      {showSpotlight && !isLight && <CursorSpotlight />}
      <DockNavbar
        loginAlwaysVisible={loginAlwaysVisible}
        tone={tone}
        toneLocked={Boolean(toneLock)}
      />
      <main
        className={`relative z-10 pt-20 sm:pt-24 ${centered ? 'flex min-h-[calc(100vh-5rem)] items-center justify-center' : ''} ${mainClassName}`.trim()}
      >
        {children}
      </main>
      {showTrustBar && <TrustBar />}
      {showFooter && (
        <div className="landing-footer-bridge">
          <DemoFooter variant="minimal" />
        </div>
      )}
    </div>
  )
}
