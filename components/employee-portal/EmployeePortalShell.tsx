import Image from 'next/image'
import Link from 'next/link'
import { type ReactNode } from 'react'
import MeshBackground from '../landing/MeshBackground'

interface EmployeePortalShellProps {
  children: ReactNode
  centered?: boolean
  showAppBar?: boolean
  mainClassName?: string
}

export default function EmployeePortalShell({
  children,
  centered = false,
  showAppBar = true,
  mainClassName = '',
}: EmployeePortalShellProps) {
  const mainPadding = showAppBar ? 'pt-16 sm:pt-[4.5rem]' : ''

  return (
    <div className="min-h-screen bg-mesh relative">
      <MeshBackground />

      {showAppBar && (
        <header className="fixed top-0 left-0 right-0 z-50 glass-modern border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-[3.75rem] flex items-center gap-3">
            <Link href="/" className="shrink-0">
              <Image
                src="/logo-humano-sisu.png"
                alt="Humano SISU"
                width={32}
                height={32}
                className="rounded-lg w-8 h-8"
              />
            </Link>
            <span className="text-white text-sm font-medium">Portal de empleados</span>
          </div>
        </header>
      )}

      <main
        className={`relative z-10 ${mainPadding} ${
          centered ? 'flex min-h-screen items-center justify-center px-4' : ''
        } ${mainClassName}`.trim()}
      >
        {children}
      </main>
    </div>
  )
}
