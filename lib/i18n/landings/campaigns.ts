import type { LandingLocale } from '../locale'

/** Campaign landings (/paz, /domingos-sin-planilla): satire stays ES; chrome EN. */
export type CampaignsCopy = {
  enNote: string
  ctaActivate: string
  ctaQuote: string
}

const byLocale: Record<LandingLocale, CampaignsCopy> = {
  es: {
    enNote: '',
    ctaActivate: 'Activar',
    ctaQuote: 'Solicitar cotización',
  },
  en: {
    enNote: 'This campaign page is in Spanish (satire / local voice). Switch back to Español for the full experience — or continue to Activate / Quote in English chrome.',
    ctaActivate: 'Activate',
    ctaQuote: 'Request a quote',
  },
}

export function getCampaignsCopy(locale: LandingLocale): CampaignsCopy {
  return byLocale[locale] ?? byLocale.es
}
