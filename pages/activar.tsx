import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import CampaignStyles from '../components/marketing/CampaignStyles'
import MotorEncendidoLead from '../components/activar-game/MotorEncendidoLead'
import { initGoogleAdsTracking } from '../lib/analytics/googleAds'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import {
  getActivarUtmContext,
  readActivarUtmSource,
} from '../lib/activar-game/activar-utm-context'
import { isCountryCode, type CountryCode } from '../lib/country/supported'

export default function ActivarPage() {
  const router = useRouter()
  const [countryCode, setCountryCode] = useState<CountryCode>('HND')

  useEffect(() => {
    initGoogleAdsTracking()
  }, [])

  useEffect(() => {
    const raw = router.query.country
    if (typeof raw !== 'string') return
    const cc = raw.trim().toUpperCase()
    if (!isCountryCode(cc)) return
    setCountryCode(cc)
  }, [router.query.country])

  const utmContext = useMemo(
    () => getActivarUtmContext(readActivarUtmSource(router.query)),
    [router.query]
  )

  return (
    <PublicPageShell showTrustBar loginAlwaysVisible mainClassName="flex flex-col">
      <CampaignStyles sheets={['activar']} />
      <PublicPageHead
        title={getPageTitle('activate')}
        description={getPageDescription('activate')}
        canonicalPath="/activar"
      />
      <MotorEncendidoLead utmContext={utmContext} initialCountryCode={countryCode} />
    </PublicPageShell>
  )
}
