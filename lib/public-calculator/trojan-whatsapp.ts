import type { CountryCode } from '../country/supported'
import { calculatorUtmSource } from './utm'

const SITE_BASE = 'https://humanosisu.net'

export type TrojanRecipient = 'rrhh' | 'boss'

function activarLink(countryCode: CountryCode, campaign: TrojanRecipient): string {
  const params = new URLSearchParams({
    country: countryCode,
    utm_source: calculatorUtmSource(countryCode),
    utm_medium: 'trojan',
    utm_campaign: campaign === 'rrhh' ? 'trojan-rrhh' : 'trojan-boss',
  })
  return `${SITE_BASE}/activar?${params.toString()}`
}

export function buildTrojanShareMessage(
  script: string,
  countryCode: CountryCode,
  recipient: TrojanRecipient
): string {
  const link = activarLink(countryCode, recipient)
  return `${script.trim()} ${link}`
}

export function buildTrojanShareUrl(
  script: string,
  countryCode: CountryCode,
  recipient: TrojanRecipient
): string {
  const message = buildTrojanShareMessage(script, countryCode, recipient)
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
