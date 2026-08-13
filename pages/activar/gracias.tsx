import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import PublicPageShell from '../../components/landing/PublicPageShell'
import PublicPageHead from '../../components/SEO/PublicPageHead'
import CampaignStyles from '../../components/marketing/CampaignStyles'
import { Card, CardContent } from '../../components/ui/card'
import { trackTrialThankYouPageView } from '../../lib/analytics/googleAds'
import { readThankYouContext, type ThankYouContext } from '../../lib/analytics/thank-you-context'
import { MOTOR_ENCENDIDO_COPY } from '../../lib/activar-game/motor-encendido-copy'
import { COUNTRY_LABEL } from '../../lib/activar-game/activar-form'
import { isCountryCode } from '../../lib/country/supported'
import { getPageTitle } from '../../lib/seo/title'
import { getPageDescription } from '../../lib/seo/description'

/**
 * Thank-you page post-trial (/activar → éxito).
 * Google Ads Primary page-load URL = /activar/gracias (sin PII en query).
 */
export default function ActivarGraciasPage() {
  const copy = MOTOR_ENCENDIDO_COPY
  const [ctx, setCtx] = useState<ThankYouContext | null>(null)

  useEffect(() => {
    setCtx(readThankYouContext('activar'))
    trackTrialThankYouPageView()
  }, [])

  const displayName = ctx?.displayName?.trim() || 'Equipo'
  const empresa = ctx?.empresa?.trim() || 'tu empresa'
  const empleados =
    typeof ctx?.empleados === 'number' && ctx.empleados > 0 ? ctx.empleados : 1
  const countryLabel =
    ctx?.countryCode && isCountryCode(ctx.countryCode)
      ? COUNTRY_LABEL[ctx.countryCode]
      : 'tu país'

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
          <p className="text-brand-300">
            {ctx?.emailHintMasked
              ? `Revisá ${ctx.emailHintMasked} (y spam).`
              : copy.success.emailHint}
          </p>
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
