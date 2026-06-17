import dynamic from 'next/dynamic'
import { type ReactNode } from 'react'
import DemoFooter from '../DemoFooter'
import DockNavbar from './DockNavbar'
import MeshBackground from './MeshBackground'
import TrustBar from './TrustBar'

const CursorSpotlight = dynamic(() => import('./CursorSpotlight'), { ssr: false })

interface PublicPageShellProps {
  children: ReactNode
  showSpotlight?: boolean
  showFooter?: boolean
  showTrustBar?: boolean
  loginAlwaysVisible?: boolean
  mainClassName?: string
  centered?: boolean
}

export default function PublicPageShell({
  children,
  showSpotlight = false,
  showFooter = true,
  showTrustBar = false,
  loginAlwaysVisible = false,
  mainClassName = '',
  centered = false,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-mesh relative">
      <MeshBackground />
      {showSpotlight && <CursorSpotlight />}
      <DockNavbar loginAlwaysVisible={loginAlwaysVisible} />
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
