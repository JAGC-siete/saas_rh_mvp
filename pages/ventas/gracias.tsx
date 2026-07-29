import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import PublicPageShell from '../../components/landing/PublicPageShell'
import PublicPageHead from '../../components/SEO/PublicPageHead'
import TrackedWhatsAppLink from '../../components/TrackedWhatsAppLink'
import { Card, CardContent } from '../../components/ui/card'
import { trackQuoteThankYouPageView } from '../../lib/analytics/googleAds'
import { readThankYouContext, type ThankYouContext } from '../../lib/analytics/thank-you-context'
import { COTIZACION_GUIADA_COPY } from '../../lib/ventas-game/cotizacion-guiada-copy'
import { VENTAS_COUNTRY_LABEL } from '../../lib/ventas-game/ventas-form'
import { isCountryCode } from '../../lib/country/supported'
import { getPageTitle } from '../../lib/seo/title'
import { getPageDescription } from '../../lib/seo/description'

/**
 * Thank-you page post-quote (/ventas → éxito).
 * Google Ads Primary page-load URL = /ventas/gracias (sin PII en query).
 */
export default function VentasGraciasPage() {
  const copy = COTIZACION_GUIADA_COPY
  const [ctx, setCtx] = useState<ThankYouContext | null>(null)

  useEffect(() => {
    setCtx(readThankYouContext('ventas'))
    trackQuoteThankYouPageView()
  }, [])

  const countryLabel =
    ctx?.countryCode && isCountryCode(ctx.countryCode)
      ? VENTAS_COUNTRY_LABEL[ctx.countryCode]
      : null

  const emailHint = ctx?.emailHintMasked
    ? `Revisa la bandeja de ${ctx.emailHintMasked} (incluido spam). Ahí van el PDF para gerencia y las credenciales de acceso gratuito.`
    : 'Revisa tu correo (incluido spam). Ahí van el PDF para gerencia y las credenciales de acceso gratuito.'

  return (
    <PublicPageShell showTrustBar loginAlwaysVisible mainClassName="flex flex-col">
      <PublicPageHead
        title={getPageTitle('ventasGracias')}
        description={getPageDescription('ventasGracias')}
        canonicalPath="/ventas/gracias"
        noindex
      />
      <div className="max-w-2xl mx-auto text-center px-4 py-8 flex-grow flex flex-col justify-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{copy.success.title}</h1>
          <p className="text-lg text-brand-300 mb-6">{emailHint}</p>
          {countryLabel && (
            <p className="text-sm text-brand-400">
              Legislación aplicada: <strong className="text-cyan-100/90">{countryLabel}</strong>
            </p>
          )}
        </div>

        {ctx?.whatsappUrl && (
          <Card variant="liquid" className="mb-8 border-emerald-400/20 text-left">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-2">¿Listo para formalizar?</h2>
              <p className="text-sm text-cyan-100/80 mb-6">{copy.success.contractHint}</p>
              <TrackedWhatsAppLink
                href={ctx.whatsappUrl}
                trackingContext="ventas_success_contract"
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 font-semibold transition-colors"
              >
                {copy.success.contractCta}
              </TrackedWhatsAppLink>
            </CardContent>
          </Card>
        )}

        <Link href="/" className="inline-flex items-center justify-center text-brand-300 hover:text-white transition-colors">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Volver al inicio
        </Link>
      </div>
    </PublicPageShell>
  )
}
