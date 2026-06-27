import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import CotizacionGuiadaLead from '../components/ventas-game/CotizacionGuiadaLead'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import { isCountryCode, type CountryCode } from '../lib/country/supported'
import {
  getVentasUtmContext,
  readVentasUtmSource,
} from '../lib/ventas-game/ventas-utm-context'

export default function VentasPage() {
  const router = useRouter()
  const [countryCode, setCountryCode] = useState<CountryCode>('HND')

  useEffect(() => {
    const raw = router.query.country
    if (typeof raw !== 'string') return
    const cc = raw.trim().toUpperCase()
    if (!isCountryCode(cc)) return
    setCountryCode(cc)
  }, [router.query.country])

  const utmContext = useMemo(
    () => getVentasUtmContext(readVentasUtmSource(router.query)),
    [router.query]
  )

  return (
    <PublicPageShell showFooter={false} loginAlwaysVisible mainClassName="flex flex-col overflow-hidden">
      <PublicPageHead
        title={getPageTitle('ventas')}
        description={getPageDescription('ventas')}
        canonicalPath="/ventas"
      />
      <CotizacionGuiadaLead utmContext={utmContext} initialCountryCode={countryCode} />
    </PublicPageShell>
  )
}
