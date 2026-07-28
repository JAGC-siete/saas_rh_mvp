import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import PublicPageShell from '../../components/landing/PublicPageShell'
import PublicPageHead from '../../components/SEO/PublicPageHead'
import CampaignStyles from '../../components/marketing/CampaignStyles'
import { Card, CardContent } from '../../components/ui/card'
import { trackTrialThankYouPageView } from '../../lib/analytics/googleAds'
import { MOTOR_ENCENDIDO_COPY } from '../../lib/activar-game/motor-encendido-copy'
import { COUNTRY_LABEL } from '../../lib/activar-game/activar-form'
import { isCountryCode } from '../../lib/country/supported'
import { getPageTitle } from '../../lib/seo/title'
import { getPageDescription } from '../../lib/seo/description'

/**
 * Thank-you page post-trial (/activar → éxito).
 * Google Ads: page-load conversion URL = /activar/gracias
 */
export default function ActivarGraciasPage() {
  const router = useRouter()
  const copy = MOTOR_ENCENDIDO_COPY

  const nombre =
    typeof router.query.nombre === 'string' ? router.query.nombre.trim() : ''
  const empresa =
    typeof router.query.empresa === 'string' ? router.query.empresa.trim() : 'tu empresa'
  const empleadosRaw =
    typeof router.query.empleados === 'string' ? Number(router.query.empleados) : 1
  const empleados = Number.isFinite(empleadosRaw) && empleadosRaw > 0 ? empleadosRaw : 1
  const countryRaw =
    typeof router.query.country === 'string' ? router.query.country.trim().toUpperCase() : ''
  const countryLabel = isCountryCode(countryRaw) ? COUNTRY_LABEL[countryRaw] : 'tu país'

  const displayName = useMemo(() => nombre || 'Equipo', [nombre])

  useEffect(() => {
    if (!router.isReady) return
    trackTrialThankYouPageView()
  }, [router.isReady])

  return (
    <PublicPageShell showTrustBar loginAlwaysVisible mainClassName="flex flex-col">
      <CampaignStyles sheets={['activar']} />
      <PublicPageHead
        title={getPageTitle('activarGracias')}
        description={getPageDescription('activarGracias')}
        canonicalPath="/activar/gracias"
        noindex
      />
      <div className="max-w-2xl mx-auto text-center px-4 py-8 flex-grow flex flex-col justify-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {copy.success.title(displayName)}
          </h1>
          <p className="text-lg text-brand-300 mb-6">
            {copy.success.body(countryLabel, empresa, empleados)}
          </p>
          <p className="text-brand-300">{copy.success.emailHint}</p>
        </div>

        <Card variant="liquid" className="mb-8 text-left">
          <CardContent className="p-6 sm:p-8">
            <p className="text-white font-medium mb-2">{copy.success.biometricHint}</p>
            <p className="text-sm text-brand-400 mt-4">humanosisu@humanosisu.net</p>
          </CardContent>
        </Card>

        <Link href="/" className="inline-flex items-center justify-center text-brand-300 hover:text-white transition-colors">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Volver a inicio
        </Link>
      </div>
    </PublicPageShell>
  )
}
