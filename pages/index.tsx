import Head from 'next/head'
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
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import { generateOrganizationSchema, generateWebSiteSchema, generateWebPageSchema, generateReviewSchema } from '../lib/seo/schema'
import { initGoogleAdsTracking } from '../lib/analytics/googleAds'

const CursorSpotlight = dynamic(() => import('../components/landing/CursorSpotlight'), { ssr: false })
const ScrollReveal = dynamic(() => import('../components/landing/ScrollReveal'))
const HowItWorksBento = dynamic(() => import('../components/landing/HowItWorksBento'))
const FreeToolsSection = dynamic(() => import('../components/FreeToolsSection'))
const AWSCertificationsSection = dynamic(() => import('../components/AWSCertificationsSection'))

/** Approx banner height — keeps dock + page padding clear of the stripe. */
const HOME_BANNER_OFFSET_PX = 36

const TESTIMONIALS = [
  { name: 'Felix Garcia', company: 'Restaurante Tonys Mar', employees: '40 empleados', quote: 'Ya no pierdo domingos haciendo planilla. 4 horas ahora son 4 minutos.', rating: 5 },
  { name: 'Nancy Urrutia', company: 'Prohalca', employees: '37 empleados', quote: 'Habiamos contratado un sistema de asistencia que no hacia planilla, ahora tenemos dashboard interactivo.', rating: 5 },
  { name: 'Abogado Marcio Moya', company: '', employees: '15 empleados', quote: 'Cero errores en deducciones desde que lo uso. Mis clientes están felices.', rating: 5 },
]

export default function LandingPage() {
  const [bannerVisible, setBannerVisible] = useState(false)
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

  const pageTitle = getPageTitle('home')
  const pageDescription = getPageDescription('home')
  const ogImage = '/og-image.png'

  const organizationSchema = generateOrganizationSchema()
  const webSiteSchema = generateWebSiteSchema()
  const webPageSchema = generateWebPageSchema({
    url: '/',
    title: pageTitle,
    description: pageDescription,
    image: ogImage,
  })

  return (
    <div
      className={`min-h-screen bg-mesh relative text-white ${
        bannerVisible ? 'pt-28 sm:pt-32' : 'pt-20 sm:pt-24'
      }`}
    >
      <MarketingStyles sheets={['landing', 'landing-liquid']} />
      <Head>
        <title>{pageTitle}</title>
        <link rel="icon" href="/logo-humano-sisu.png" />
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="Humano SISU, software recursos humanos, control de asistencia, nómina automatizada, Honduras El Salvador Guatemala, IHSS RAP ISR, biometría planilla" />
        <meta name="author" content="Humano SISU" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://humanosisu.net" />
        <meta property="og:image" content={`https://humanosisu.net${ogImage}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={`https://humanosisu.net${ogImage}`} />
        <link rel="canonical" href="https://humanosisu.net" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      <SchemaMarkup schema={[organizationSchema, webSiteSchema, webPageSchema]} />

      <MeshBackground />
      <CursorSpotlight />
      <HomeAnnouncementBanner onVisibilityChange={onBannerVisibilityChange} />
      <DockNavbar topOffsetPx={bannerVisible ? HOME_BANNER_OFFSET_PX : 0} />

      <MagneticHero />

      <section id="prueba-social" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-white leading-tight mb-6 sm:mb-8 px-2 max-w-5xl mx-auto">
            <span className="text-white block sm:inline">Clientes de SISU lo certifican: </span>
            <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">el control de asistencia integrado con la nómina es la ventaja verdadera</span>
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {TESTIMONIALS.map((testimonial, i) => {
            const reviewSchema = generateReviewSchema({
              productName: 'Humano SISU',
              authorName: testimonial.name,
              rating: testimonial.rating,
              reviewText: testimonial.quote,
            })
            return (
              <ScrollReveal key={`testimonial-${i}`} delay={i * 0.08}>
                <SchemaMarkup schema={reviewSchema} />
                <div className="glass-modern rounded-2xl p-6 h-full hover:scale-[1.01] transition-transform duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-brand-500/80 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                      {testimonial.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium">{testimonial.name}</p>
                      {testimonial.company ? (
                        <p className="text-slate-400 text-sm font-medium opacity-50 grayscale">{testimonial.company}</p>
                      ) : (
                        <p className="text-slate-400 text-sm font-medium">{testimonial.employees}</p>
                      )}
                    </div>
                  </div>
                  <div className="mb-2">
                    {[...Array(5)].map((_, idx) => (
                      <span key={idx} className={`text-lg ${idx < testimonial.rating ? 'text-yellow-400' : 'text-slate-600'}`}>★</span>
                    ))}
                  </div>
                  <blockquote className="text-slate-400 italic mb-4 font-medium landing-dark-text">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                  {testimonial.company && (
                    <span className="text-brand-400 text-sm font-medium">{testimonial.employees}</span>
                  )}
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <HowItWorksBento />
      <FreeToolsSection />
      {/* Sección "Módulos de Humano SISU" ocultada temporalmente: algunas cards gustan pero la sección completa no agrega valor por ahora. */}
      {/* <BentoServicesGrid /> */}
      <AWSCertificationsSection />
      {/* Newsletter + cierre CTA ocultados temporalmente. Reactivar: descomentar imports y <MailListSection /> / <LandingClosingSection /> */}
      {/* <MailListSection /> */}
      {/* <LandingClosingSection /> */}
      <TrustBar />

      <div className="landing-footer-bridge pt-8">
        <DemoFooter variant="minimal" />
      </div>
    </div>
  )
}
