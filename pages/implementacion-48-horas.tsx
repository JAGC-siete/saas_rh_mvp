import Head from 'next/head'
import TrackedInternalCta from '../components/TrackedInternalCta'
import PublicPageShell from '../components/landing/PublicPageShell'
import TrackedWhatsAppLink from '../components/TrackedWhatsAppLink'
import { useLandingPreferences } from '../components/landing/LandingPreferencesProvider'
import { getSeoLandingCopy } from '../lib/i18n/landings/seo'
import { LOCALE_SCHEMA_LANG } from '../lib/i18n/locale'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import RelatedGuides from '../components/SEO/RelatedGuides'
import { generateWebPageSchema, generateFAQPageSchema, generateBreadcrumbListSchema } from '../lib/seo/schema'
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { SERVICE_GUARANTEES } from '../lib/marketing/service-guarantees'

export default function Implementacion48HorasPage() {
  const { locale, href } = useLandingPreferences()
  const copy = getSeoLandingCopy(locale, 'implementacion48h')

  const pageTitle = copy.pageTitle
  const pageDescription = copy.pageDescription
  const webPageSchema = generateWebPageSchema({
    url: href('/implementacion-48-horas'),
    title: pageTitle,
    description: pageDescription,
    inLanguage: LOCALE_SCHEMA_LANG[locale],
  })

  const faqs = copy.faqs
  const faqSchema = generateFAQPageSchema(faqs)
  const breadcrumbSchema = generateBreadcrumbListSchema(
    copy.breadcrumbs.map((item) => ({ name: item.name, url: href(item.url) }))
  )
  const steps = copy.steps
  const guarantees = SERVICE_GUARANTEES
  const testimonials = copy.testimonials

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

          {/* CTA Button */}
          <div className="flex justify-center mb-6">
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20solicitar%20cotización%20de%20Humano%20SISU"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
              trackingContext="implementacion_48h_hero_cotizacion"
            >
              {copy.heroCta}
            </TrackedWhatsAppLink>
          </div>
        </div>
      </section>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Comparison */}
        <section className="mb-12 sm:mb-16 md:mb-20 grid md:grid-cols-2 gap-4 sm:gap-6">
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-400">{copy.othersTitle}</h2>
            <ul className="space-y-3 text-brand-200/90 text-sm sm:text-base">
              {copy.othersItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ClockIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>
                    {item.label ? <strong>{item.label}</strong> : null}
                    {item.label ? ` ${item.text}` : item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-green-400">{copy.sisuTitle}</h2>
            <ul className="space-y-3 text-brand-200/90 text-sm sm:text-base">
              {copy.sisuItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Process Steps */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.processTitle}
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-4xl">{step.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-sky-600/20 text-sky-300 rounded-full text-sm font-semibold">
                        {step.time}
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-white">{step.title}</h3>
                    </div>
                    <p className="text-brand-200/90 text-sm sm:text-base leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Guarantees */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.guaranteesTitle}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {guarantees.map((guarantee, index) => (
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
                <div className="text-4xl mb-4">{guarantee.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">{guarantee.title}</h3>
                <p className="text-brand-200/90 text-sm sm:text-base leading-relaxed">{guarantee.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            {copy.testimonialsTitle}
          </h2>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="glass-modern rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <p className="text-brand-200/90 text-sm sm:text-base italic mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-brand-200/70">{testimonial.company}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold">
                    {testimonial.time}
                  </span>
                </div>
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
              location="implementacion_48h_footer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              {copy.ctaSection.primary}
            </TrackedInternalCta>
            <TrackedWhatsAppLink
              href="https://wa.me/50432226773?text=Hola,%20quiero%20saber%20más%20sobre%20la%20implementación%20express%20de%20Humano%20SISU"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-green-700 transition-colors shadow-sm"
              trackingContext="implementacion_48h_footer_experto"
            >
              {copy.ctaSection.secondary}
            </TrackedWhatsAppLink>
          </div>
        </section>

        <RelatedGuides currentPath="/implementacion-48-horas" />
      </div>
    </PublicPageShell>
  )
}
