import type { CountryCode } from '../country/supported'
import { buildTrojanShareMessage, buildTrojanShareUrl } from './trojan-whatsapp'
import { calculatorUtmSource } from './utm'

const SITE_BASE = 'https://humanosisu.net'

export type CalculatorShareCampaign =
  | 'bridge-share-peer'
  | 'bridge-share-copy'
  | 'bridge-share-native'
  | 'post-calc-share-peer'
  | 'post-calc-share-copy'
  | 'post-calc-share-native'
  | 'share-x'
  | 'share-facebook'
  | 'share-linkedin'

export function buildCalculatorShareLink(
  path: string,
  countryCode: CountryCode,
  campaign: CalculatorShareCampaign
): string {
  const params = new URLSearchParams({
    utm_source: calculatorUtmSource(countryCode),
    utm_medium: 'share',
    utm_campaign: campaign,
  })
  return `${SITE_BASE}${path}?${params.toString()}`
}

export function buildPeerShareMessage(
  script: string,
  path: string,
  countryCode: CountryCode,
  campaign: CalculatorShareCampaign = 'bridge-share-peer'
): string {
  const link = buildCalculatorShareLink(path, countryCode, campaign)
  return `${script.trim()} ${link}`
}

export function buildPeerShareUrl(
  script: string,
  path: string,
  countryCode: CountryCode,
  campaign: CalculatorShareCampaign = 'bridge-share-peer'
): string {
  const message = buildPeerShareMessage(script, path, countryCode, campaign)
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function buildBossShareUrl(script: string, countryCode: CountryCode): string {
  return buildTrojanShareUrl(script, countryCode, 'rrhh')
}

export function buildBossShareMessage(script: string, countryCode: CountryCode): string {
  return buildTrojanShareMessage(script, countryCode, 'rrhh')
}
