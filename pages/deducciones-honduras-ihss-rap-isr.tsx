import Head from 'next/head'
import Link from 'next/link'
import TrackedInternalCta from '../components/TrackedInternalCta'
import PublicPageShell from '../components/landing/PublicPageShell'
import { useLandingPreferences } from '../components/landing/LandingPreferencesProvider'
import { getSeoLandingCopy } from '../lib/i18n/landings/seo'
import { LOCALE_SCHEMA_LANG } from '../lib/i18n/locale'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import RelatedGuides from '../components/SEO/RelatedGuides'
import { generateWebPageSchema, generateFAQPageSchema, generateBreadcrumbListSchema } from '../lib/seo/schema'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { deductionCalculatorPublicPath } from '../lib/marketing/calculator-public-paths'

export default function DeduccionesHondurasPage() {
  const { locale, href } = useLandingPreferences()
  const copy = getSeoLandingCopy(locale, 'deduccionesHonduras')

  const pageTitle = copy.pageTitle
  const pageDescription = copy.pageDescription
  const webPageSchema = generateWebPageSchema({
    url: href('/deducciones-honduras-ihss-rap-isr'),
    title: pageTitle,
    description: pageDescription,
    inLanguage: LOCALE_SCHEMA_LANG[locale],
  })

  const faqs = copy.faqs
  const faqSchema = generateFAQPageSchema(faqs)
  const breadcrumbSchema = generateBreadcrumbListSchema(
    copy.breadcrumbs.map((item) => ({ name: item.name, url: href(item.url) }))
  )
  const comparison = copy.comparison
  const calculatorPath = href(deductionCalculatorPublicPath('HND'))

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
              location="deducciones_honduras_hero"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-sky-700 transition-colors shadow-sm"
            >
              {copy.heroCta.primary}
            </TrackedInternalCta>
            <Link
              href={calculatorPath}
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-green-700 transition-colors shadow-sm"
            >
              {copy.heroCta.secondary}
            </Link>
          </div>
        </div>
      </section>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* What Are Deductions */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.whatTitle}
          </h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {copy.deductions.map((deduction, index) => (
              <div
                key={index}
                className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30"
              >
                <div className="text-4xl mb-4">{deduction.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">{deduction.title}</h3>
                <p className="text-brand-200/90 mb-3 text-sm sm:text-base">
                  <strong>{deduction.fullName}</strong>
                </p>
                <p className="text-xs sm:text-sm text-brand-200/70">{deduction.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Excel vs Humano SISU */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.comparisonTitle}
          </h2>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 overflow-x-auto border border-white/10">
            <table className="w-full text-white text-sm sm:text-base">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4 font-semibold">{copy.comparisonTableHeaders.aspect}</th>
                  <th className="text-center py-4 px-4 font-semibold">{copy.comparisonTableHeaders.excel}</th>
                  <th className="text-center py-4 px-4 font-semibold">{copy.comparisonTableHeaders.humanoSisu}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span className="font-semibold text-white">{item.aspect}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-red-400">
                      {item.excel}
                    </td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">
                      {item.humanoSisu}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How Humano SISU Calculates */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.howTitle}
          </h2>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10">
            <div className="space-y-4">
              {copy.howItems.map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold mb-1 text-white">{item.title}</h3>
                    <p className="text-brand-200/90 text-sm sm:text-base">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
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
              location="deducciones_honduras_footer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              {copy.ctaSection.primary}
            </TrackedInternalCta>
            <Link
              href={calculatorPath}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              {copy.ctaSection.secondary}
            </Link>
          </div>
        </section>

        <RelatedGuides currentPath="/deducciones-honduras-ihss-rap-isr" />
      </div>
    </PublicPageShell>
  )
}
