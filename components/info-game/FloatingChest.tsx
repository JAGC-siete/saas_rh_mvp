import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import FloatingChestSvg from './FloatingChestSvg'

const FloatingChestCanvas = dynamic(() => import('./FloatingChestCanvas'), { ssr: false })

type FloatingChestProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASS = {
  sm: 'h-28 w-32',
  md: 'h-40 w-48 sm:h-44 sm:w-52',
  lg: 'h-52 w-64',
} as const

/** Bronze treasure chest — canvas sprite with SVG fallback for SSR and reduced motion. */
export default function FloatingChest({ className = '', size = 'md' }: FloatingChestProps) {
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [canvasFailed, setCanvasFailed] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const useSvg = !mounted || reducedMotion || canvasFailed

  return (
    <div
      className={`relative mx-auto animate-elastic-up ${SIZE_CLASS[size]} ${className}`}
      role="img"
      aria-label="Cofre secreto flotando"
    >
      <div
        className="absolute bottom-0 left-1/2 h-5 w-4/5 -translate-x-1/2 rounded-full bg-amber-400/30 blur-2xl animate-chest-glow"
        aria-hidden
      />

      <div className={`relative z-10 h-full w-full ${useSvg ? 'animate-chest-float' : ''}`}>
        {useSvg ? (
          <FloatingChestSvg />
        ) : (
          <>
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                canvasReady ? 'pointer-events-none opacity-0' : 'opacity-100'
              }`}
              aria-hidden={canvasReady}
            >
              <FloatingChestSvg />
            </div>
            <FloatingChestCanvas
              onReady={() => setCanvasReady(true)}
              onError={() => setCanvasFailed(true)}
            />
          </>
        )}
      </div>
    </div>
  )
}
