/**
 * Tokens de tema → CSS. `theme.radius` es sm|md|lg, no un valor CSS.
 * El renderer inyecta --lp-radius como longitud.
 */

import type { LandingPageContent } from '../../types/landing'

export const LANDING_RADIUS_CSS = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem',
} as const

export type LandingRadiusToken = keyof typeof LANDING_RADIUS_CSS

export function landingRadiusCss(radius: LandingRadiusToken | string): string {
  if (radius === 'sm' || radius === 'md' || radius === 'lg') return LANDING_RADIUS_CSS[radius]
  return LANDING_RADIUS_CSS.lg
}

export function landingThemeCssVars(theme: LandingPageContent['theme']): {
  backgroundColor: string
  '--lp-primary': string
  '--lp-accent': string
  '--lp-surface': string
  '--lp-radius': string
} {
  return {
    backgroundColor: theme.surface,
    '--lp-primary': theme.primary,
    '--lp-accent': theme.accent || '#3b82f6',
    '--lp-surface': theme.surface,
    '--lp-radius': landingRadiusCss(theme.radius),
  }
}

export function heroLayoutClass(imageUrl?: string): string {
  return imageUrl
    ? 'grid items-center gap-8 text-left md:grid-cols-2'
    : 'mx-auto grid max-w-3xl grid-cols-1 gap-8 text-center'
}

export function heroCopyClass(imageUrl?: string): string {
  return imageUrl
    ? 'flex flex-col items-start space-y-6'
    : 'flex flex-col items-center space-y-6'
}
