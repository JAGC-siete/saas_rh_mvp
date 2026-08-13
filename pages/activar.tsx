import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import CampaignStyles from '../components/marketing/CampaignStyles'
import MotorEncendidoLead from '../components/activar-game/MotorEncendidoLead'
import { initGoogleAdsTracking } from '../lib/analytics/googleAds'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import { generateBreadcrumbListSchema, generateWebPageSchema } from '../lib/seo/schema'
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

  const pageTitle = getPageTitle('activate')
  const pageDescription = getPageDescription('activate')
  const webPageSchema = generateWebPageSchema({
    url: '/activar',
    title: pageTitle,
    description: pageDescription,
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Activar', url: '/activar' },
  ])

  return (
    <PublicPageShell showTrustBar loginAlwaysVisible mainClassName="flex flex-col">
      <CampaignStyles sheets={['activar']} />
      <PublicPageHead
        title={pageTitle}
        description={pageDescription}
        canonicalPath="/activar"
      />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema]} />
      <MotorEncendidoLead utmContext={utmContext} initialCountryCode={countryCode} />
    </PublicPageShell>
  )
}
