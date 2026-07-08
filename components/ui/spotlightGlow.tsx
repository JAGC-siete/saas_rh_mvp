'use client'

import { useCallback, useRef, type MouseEvent } from 'react'

export type SpotlightAccent = 'green' | 'gold'

type SpotlightAccentTokens = {
  /** Border color applied on hover. */
  borderHover: string
  /** Colored glow shadow applied on hover. */
  shadowHover: string
  /** rgba color used inside the cursor-following radial gradient. */
  glow: string
  /** Active/solid border + subtle fill (for selectable cards). */
  activeBorder: string
  /** Accent color for eyebrow labels. */
  eyebrow: string
  /** Accent color for arrow icon on hover. */
  arrowHover: string
  /** Accent class for active count pips. */
  pipActive: string
}

// The green mirrors the "Activar" button (green-600 / glow green-500).
// The gold mirrors the current "El Factor Humano" card (amber-400).
export const SPOTLIGHT_ACCENTS: Record<SpotlightAccent, SpotlightAccentTokens> = {
  green: {
    borderHover: 'hover:border-green-400/40',
    shadowHover: 'hover:shadow-[0_0_40px_rgba(34,197,94,0.14)]',
    glow: 'rgba(34,197,94,0.22)',
    activeBorder: 'border-green-400/70 bg-green-500/10',
    eyebrow: 'text-green-300/80',
    arrowHover: 'group-hover:text-green-300',
    pipActive: 'bg-green-400/90 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  },
  gold: {
    borderHover: 'hover:border-amber-400/40',
    shadowHover: 'hover:shadow-[0_0_40px_rgba(251,191,36,0.12)]',
    glow: 'rgba(251,191,36,0.22)',
    activeBorder: 'border-amber-400/70 bg-amber-500/10',
    eyebrow: 'text-amber-200/70',
    arrowHover: 'group-hover:text-amber-200',
    pipActive: 'bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  },
}

/**
 * Tracks the pointer position over an element and exposes it via the
 * `--glow-x` / `--glow-y` CSS custom properties so a radial gradient can
 * "follow" the cursor. Works with any HTMLElement (anchor, button, div).
 */
export function useSpotlightGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  const onMouseMove = useCallback((e: MouseEvent<T>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    el.style.setProperty('--glow-x', `${x}%`)
    el.style.setProperty('--glow-y', `${y}%`)
  }, [])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--glow-x', '50%')
    el.style.setProperty('--glow-y', '30%')
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}

type SpotlightGlowOverlayProps = {
  glow: string
  /** Base opacity class before hover (e.g. 'opacity-0' or 'opacity-50'). */
  baseOpacity?: string
}

/** Absolutely-positioned radial gradient that follows the cursor on hover. */
export function SpotlightGlowOverlay({ glow, baseOpacity = 'opacity-0' }: SpotlightGlowOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 ${baseOpacity} group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      style={{
        background: `radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 30%), ${glow}, transparent 55%)`,
      }}
    />
  )
}
