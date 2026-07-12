import MarketingStyles, { type MarketingStyleSheet } from './MarketingStyles'

export type CampaignStyleSheet = Extract<MarketingStyleSheet, 'paz' | 'viernes' | 'activar'>

/** @deprecated Prefer MarketingStyles — kept for existing campaign page imports. */
export default function CampaignStyles({ sheets }: { sheets: CampaignStyleSheet[] }) {
  return <MarketingStyles sheets={sheets} />
}
