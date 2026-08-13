import Head from 'next/head'
import TrackedInternalCta from '../components/TrackedInternalCta'
import { useEffect } from 'react'
import PublicPageShell from '../components/landing/PublicPageShell'
import TrackedWhatsAppLink from '../components/TrackedWhatsAppLink'
import { useLandingPreferences } from '../components/landing/LandingPreferencesProvider'
import { trackComparisonView } from '../lib/analytics/googleAds'
import { getSeoLandingCopy } from '../lib/i18n/landings/seo'
import { LOCALE_SCHEMA_LANG } from '../lib/i18n/locale'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import RelatedGuides from '../components/SEO/RelatedGuides'
import { generateWebPageSchema, generateFAQPageSchema, generateBreadcrumbListSchema } from '../lib/seo/schema'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function AlternativaOdooPage() {
  const { locale, href } = useLandingPreferences()
  const copy = getSeoLandingCopy(locale, 'alternativaOdoo')

  useEffect(() => {
    trackComparisonView('alternativa_odoo')
  }, [])

  const pageTitle = copy.pageTitle
  const pageDescription = copy.pageDescription
  const webPageSchema = generateWebPageSchema({
    url: href('/alternativa-odoo-honduras'),
    title: pageTitle,
    description: pageDescription,
    inLanguage: LOCALE_SCHEMA_LANG[locale],
  })

  const faqs = copy.faqs
  const faqSchema = generateFAQPageSchema(faqs)
  const breadcrumbSchema = generateBreadcrumbListSchema(
    copy.breadcrumbs.map((item) => ({ name: item.name, url: href(item.url) }))
  )
  const comparisonFeatures = copy.comparisonFeatures

  return (
    <PublicPageShell showSpotlight>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta name="keywords" content={copy.metaKeywords} />
      </Head>
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      {/* Hero Section */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 mb-6 sm:mb-8 animate-fade-up-subtle">
            {copy.hero.badges.map((badge, index) => {
              const colors = [
                'bg-green-500/20 text-green-300 border-green-500/30',
                'bg-blue-500/20 text-blue-300 border-blue-500/30',
                'bg-purple-500/20 text-purple-300 border-purple-500/30',
                'bg-orange-500/20 text-orange-300 border-orange-500/30',
              ]
              return (
                <span
                  key={index}
                  className={`px-3 py-1 text-xs rounded-full border ${colors[index % colors.length]}`}
                >
                  {badge}
                </span>
              )
            })}
          </div>

          {/* Hero Title */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight sm:leading-tight">
              <span className="text-white block sm:inline">{copy.hero.h1Lead}</span>
              <span className="text-brand-300 block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mt-2 sm:mt-1">{copy.hero.h1Accent}</span>
            </h1>
            <p className="text-lg sm:text-xl text-brand-200/90 max-w-3xl mx-auto mt-4 sm:mt-6">
              {copy.hero.lead}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
            <TrackedInternalCta
              href={href('/activar')}
              ctaType="activar_trial"
              location="alternativa_odoo_hero"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-sky-700 transition-colors shadow-sm"
            >
              {copy.heroCta.primary}
            </TrackedInternalCta>
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20comparar%20Humano%20SISU%20con%20Odoo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-green-700 transition-colors shadow-sm"
              trackingContext="alternativa_odoo_hero_whatsapp"
            >
              {copy.heroCta.secondary}
            </TrackedWhatsAppLink>
          </div>
        </div>
      </section>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Comparison Table */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.comparisonTitle}
          </h2>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 overflow-x-auto border border-white/10">
            <table className="w-full text-white text-sm sm:text-base">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4 font-semibold">{copy.comparisonTableHeaders.feature}</th>
                  <th className="text-center py-4 px-4 font-semibold">{copy.comparisonTableHeaders.humanoSisu}</th>
                  <th className="text-center py-4 px-4 font-semibold">{copy.comparisonTableHeaders.odoo}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">{item.feature}</div>
                      <div className="text-sm text-brand-200/80">{item.description}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.humanoSisu === true ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-400 mx-auto" />
                      ) : item.humanoSisu === false ? (
                        <XMarkIcon className="h-6 w-6 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-green-400 font-semibold">{item.humanoSisu}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.odoo === true ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-400 mx-auto" />
                      ) : item.odoo === false ? (
                        <XMarkIcon className="h-6 w-6 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-gray-400">{item.odoo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Key Differentiators */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.whyTitle}
          </h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {copy.whyCards.map((card, index) => (
              <div
                key={index}
                className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30"
              >
                <div className="text-4xl mb-4">{card.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">{card.title}</h3>
                <p className="text-brand-200/90 text-sm sm:text-base">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.faqTitle}
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <h3 className="text-base sm:text-lg font-bold mb-2 text-white">{faq.question}</h3>
                <p className="text-brand-200/90 text-sm sm:text-base">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center glass-modern rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 mb-12 sm:mb-16 border border-white/10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
            {copy.ctaSection.title}
          </h2>
          <p className="text-lg sm:text-xl text-brand-200/90 mb-6 sm:mb-8">
            {copy.ctaSection.lead}
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <TrackedInternalCta
              href={href('/activar')}
              ctaType="activar_trial"
              location="alternativa_odoo_footer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              {copy.ctaSection.primary}
            </TrackedInternalCta>
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20saber%20más%20sobre%20Humano%20SISU%20vs%20Odoo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-green-700 transition-colors shadow-sm"
              trackingContext="alternativa_odoo_cta_whatsapp"
            >
              {copy.ctaSection.secondary}
            </TrackedWhatsAppLink>
          </div>
        </section>

        {/* Migration Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.migration.title}
          </h2>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10">
            <p className="text-base sm:text-lg text-brand-200/90 mb-4 sm:mb-6">
              {copy.migration.lead}
            </p>
            <ul className="list-disc list-inside space-y-2 text-brand-200/90 mb-6 sm:mb-8 text-sm sm:text-base">
              {copy.migration.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20migrar%20desde%20Odoo%20a%20Humano%20SISU"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              trackingContext="alternativa_odoo_migracion_whatsapp"
            >
              {copy.migration.cta}
            </TrackedWhatsAppLink>
          </div>
        </section>

        <RelatedGuides currentPath="/alternativa-odoo-honduras" />
      </div>
    </PublicPageShell>
  )
}
