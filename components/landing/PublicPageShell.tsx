import dynamic from 'next/dynamic'
import { type ReactNode } from 'react'
import DemoFooter from '../DemoFooter'
import DockNavbar from './DockNavbar'
import MeshBackground from './MeshBackground'
import TrustBar from './TrustBar'
import MarketingStyles from '../marketing/MarketingStyles'

const CursorSpotlight = dynamic(() => import('./CursorSpotlight'), { ssr: false })

export type PublicPageTone = 'dark' | 'light'

interface PublicPageShellProps {
  children: ReactNode
  showSpotlight?: boolean
  showFooter?: boolean
  showTrustBar?: boolean
  loginAlwaysVisible?: boolean
  mainClassName?: string
  centered?: boolean
  /** Visual canvas: dark mesh (default) or white light for campaign pages like /paz. */
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
  tone = 'dark',
}: PublicPageShellProps) {
  const isLight = tone === 'light'

  return (
    <div
      className={`min-h-screen relative ${
        isLight ? 'bg-white text-slate-900' : 'bg-mesh text-white'
      }`}
    >
      <MarketingStyles sheets={['landing', 'landing-liquid']} />
      {!isLight && <MeshBackground />}
      {showSpotlight && !isLight && <CursorSpotlight />}
      <DockNavbar loginAlwaysVisible={loginAlwaysVisible} tone={tone} />
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
