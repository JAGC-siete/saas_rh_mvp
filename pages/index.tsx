import Head from 'next/head'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DemoFooter from '../components/DemoFooter'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import DockNavbar from '../components/landing/DockNavbar'
import HomeAnnouncementBanner from '../components/landing/HomeAnnouncementBanner'
import MagneticHero from '../components/landing/MagneticHero'
import TrustBar from '../components/landing/TrustBar'
import MeshBackground from '../components/landing/MeshBackground'
import MarketingStyles from '../components/marketing/MarketingStyles'
import LandingHreflang from '../components/landing/LandingHreflang'
import { useLandingPreferences } from '../components/landing/LandingPreferencesProvider'
import { getHomeCopy } from '../lib/i18n/landings/home'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import { SEO_DEFAULT_OG_IMAGE_PATH, seoAbsoluteUrl } from '../lib/seo/assets'
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateWebPageSchema,
  generateReviewSchema,
} from '../lib/seo/schema'
import { initGoogleAdsTracking } from '../lib/analytics/googleAds'
import { LOCALE_SCHEMA_LANG } from '../lib/i18n/locale'

const CursorSpotlight = dynamic(() => import('../components/landing/CursorSpotlight'), { ssr: false })
const ScrollReveal = dynamic(() => import('../components/landing/ScrollReveal'))
const HowItWorksBento = dynamic(() => import('../components/landing/HowItWorksBento'))
const FreeToolsSection = dynamic(() => import('../components/FreeToolsSection'))
const AWSCertificationsSection = dynamic(() => import('../components/AWSCertificationsSection'))

/** Approx banner height — keeps dock + page padding clear of the stripe. */
const HOME_BANNER_OFFSET_PX = 36

export default function LandingPage() {
  const [bannerVisible, setBannerVisible] = useState(false)
  const { tone, locale } = useLandingPreferences()
  const home = getHomeCopy(locale)
  const isLight = tone === 'light'
  const onBannerVisibilityChange = useCallback((visible: boolean) => {
    setBannerVisible(visible)
  }, [])

  useEffect(() => {
    initGoogleAdsTracking()

    const handleHashScroll = () => {
      if (window.location.hash) {
        const element = document.querySelector(window.location.hash)
        if (element) {
          setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
        }
      }
    }

    handleHashScroll()
    window.addEventListener('hashchange', handleHashScroll)
    return () => window.removeEventListener('hashchange', handleHashScroll)
  }, [])

  const pageTitle =
    locale === 'en'
      ? 'Human resources software (HR) | Biometric attendance + payroll | Humano SISU'
      : getPageTitle('home')
  const pageDescription =
    locale === 'en'
      ? 'HR system with attendance control (fingerprint/facial) and local payroll in Honduras, El Salvador, and Guatemala. Try free.'
      : getPageDescription('home')
  const ogImage = SEO_DEFAULT_OG_IMAGE_PATH
  const ogImageUrl = seoAbsoluteUrl(ogImage)
  const canonicalPath = locale === 'en' ? '/en' : '/'

  const organizationSchema = generateOrganizationSchema()
  const webSiteSchema = generateWebSiteSchema()
  const webPageSchema = generateWebPageSchema({
    url: canonicalPath,
    title: pageTitle,
    description: pageDescription,
    image: ogImage,
    inLanguage: LOCALE_SCHEMA_LANG[locale],
  })

  return (
    <div
      className={`landing-shell landing-tone-surface min-h-screen relative ${
        isLight ? 'bg-white text-slate-900' : 'bg-mesh text-white'
      } ${bannerVisible ? 'pt-28 sm:pt-32' : 'pt-20 sm:pt-24'}`}
    >
      <MarketingStyles sheets={['landing', 'landing-liquid']} />
      <LandingHreflang />
      <Head>
        <title>{pageTitle}</title>
        <link rel="icon" href="/brand/favicon-humano-sisu.png" />
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={home.metaKeywords} />
        <meta name="author" content="Humano SISU" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Head>

      <SchemaMarkup schema={[organizationSchema, webSiteSchema, webPageSchema]} />

      {!isLight && <MeshBackground />}
      {!isLight && <CursorSpotlight />}
      <HomeAnnouncementBanner onVisibilityChange={onBannerVisibilityChange} />
      <DockNavbar topOffsetPx={bannerVisible ? HOME_BANNER_OFFSET_PX : 0} tone={tone} />

      <MagneticHero />

      <section
        id="prueba-social"
        className="relative py-12 sm:py-16 md:py-20 overflow-hidden"
        aria-label={home.socialProof.aria}
      >
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center landing-ink leading-tight mb-8 sm:mb-10 px-4 sm:px-6 max-w-5xl mx-auto">
            <span className="landing-ink block sm:inline">{home.socialProof.titleLead}</span>
            <span className="landing-brand-soft block sm:inline mt-1 sm:mt-0">{home.socialProof.titleAccent}</span>
          </h2>
        </ScrollReveal>

        {home.testimonials.map((testimonial, i) => (
          <SchemaMarkup
            key={`review-schema-${i}`}
            schema={generateReviewSchema({
              productName: 'Humano SISU',
              authorName: testimonial.name,
              rating: testimonial.rating,
              reviewText: testimonial.quote,
            })}
          />
        ))}

        <div className="testimonials-marquee-viewport relative">
          <div className="testimonials-marquee">
            {[...home.testimonials, ...home.testimonials].map((testimonial, i) => {
              const isDuplicate = i >= home.testimonials.length
              return (
                <article
                  key={`${testimonial.name}-${i}`}
                  className="glass-modern rounded-2xl p-5 sm:p-6 w-[min(22rem,85vw)] sm:w-[24rem] shrink-0"
                  aria-hidden={isDuplicate}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full overflow-hidden ring-2 ring-white/15 bg-brand-500/40">
                      <Image
                        src={testimonial.image}
                        alt={isDuplicate ? '' : testimonial.name}
                        fill
                        className={`object-cover ${testimonial.imagePosition}`}
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="landing-ink font-medium truncate">{testimonial.name}</p>
                      {testimonial.company ? (
                        <p className="landing-muted text-sm font-medium opacity-50 grayscale truncate">
                          {testimonial.company}
                        </p>
                      ) : (
                        <p className="landing-muted text-sm font-medium truncate">{testimonial.role}</p>
                      )}
                    </div>
                  </div>
                  <div className="mb-2" aria-hidden="true">
                    {[...Array(5)].map((_, idx) => (
                      <span
                        key={idx}
                        className={`text-lg ${idx < testimonial.rating ? 'text-yellow-400' : 'text-slate-600'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <blockquote className="landing-muted italic text-sm sm:text-base font-medium landing-dark-text line-clamp-5">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  {testimonial.company && (
                    <span className="mt-3 inline-block landing-brand-soft text-sm font-medium">{testimonial.role}</span>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <HowItWorksBento />
      <FreeToolsSection />
      <AWSCertificationsSection />
      <TrustBar />

      <div className="landing-footer-bridge pt-8">
        <DemoFooter variant="minimal" />
      </div>
    </div>
  )
}
