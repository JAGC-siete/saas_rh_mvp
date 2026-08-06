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
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import { SEO_DEFAULT_OG_IMAGE_PATH, seoAbsoluteUrl } from '../lib/seo/assets'
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
  {
    name: 'Felix G.',
    company: "Tony's Mar Restaurante",
    employees: 'Dueño',
    image: '/images/testimonials/felix.jpg',
    imagePosition: 'object-top' as const,
    quote:
      'Siempre descargando la asistencia a una USB, no había control de asistencia. Perdía los domingos batallando con fórmulas de Excel. Ahora cierro planilla en minutos y las muchachas ya no me piden “una corrección más”.',
    rating: 5,
  },
  {
    name: 'Cinthia López',
    company: 'Enlace',
    employees: 'Jefa de Personal',
    image: '/images/testimonials/karla.jpg',
    imagePosition: 'object-top' as const,
    quote:
      'Lo que más me quitaba la paz eran las deducciones IHSS, RAP e ISR a mano. Con SISU dejé de ser la máquina de Excel de la empresa.',
    rating: 5,
  },
  {
    name: 'Manuel Sierra',
    company: 'Agrocomercial Ferretero Eben-Ezer',
    employees: 'Administrador',
    image: '/images/testimonials/roberto.jpg',
    imagePosition: 'object-top' as const,
    quote:
      'El biométrico y la nómina en un solo servicio fué lo que nos terminó de convencer, redujo los errores y conflictos de fin de cada quincena. Remedio inmediato, verdaderamente.',
    rating: 5,
  },
  {
    name: 'Ligia Mejia',
    company: 'Rooster Cafe',
    employees: 'Gerente de RRHH',
    image: '/images/testimonials/nancy.jpg',
    imagePosition: 'object-center' as const,
    quote:
      'Antes necesitaba un experto para operar la gestión de recursos humanos. Desde que activé solamente reviso y listo. Recuperé mi tiempo… y un poco de paz.',
    rating: 5,
  },
  {
    name: 'Jorge Sierra',
    company: 'Grupo Gastro Cueva',
    employees: 'Contador',
    image: '/images/testimonials/jorge.jpg',
    imagePosition: 'object-[center_20%]' as const,
    quote:
      'Pasamos de pelear con deducciones y no contar con controles a tener un flujo claro. Se acabaron los reclamos por deducciones mal aplicadas.',
    rating: 5,
  },
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
  const ogImage = SEO_DEFAULT_OG_IMAGE_PATH
  const ogImageUrl = seoAbsoluteUrl(ogImage)

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
        <link rel="icon" href="/brand/favicon-humano-sisu.png" />
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="Humano SISU, software recursos humanos, control de asistencia, nómina automatizada, Honduras El Salvador Guatemala, IHSS RAP ISR, biometría planilla" />
        <meta name="author" content="Humano SISU" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://humanosisu.net" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <link rel="canonical" href="https://humanosisu.net" />
      </Head>

      <SchemaMarkup schema={[organizationSchema, webSiteSchema, webPageSchema]} />

      <MeshBackground />
      <CursorSpotlight />
      <HomeAnnouncementBanner onVisibilityChange={onBannerVisibilityChange} />
      <DockNavbar topOffsetPx={bannerVisible ? HOME_BANNER_OFFSET_PX : 0} />

      <MagneticHero />

      <section
        id="prueba-social"
        className="relative py-12 sm:py-16 md:py-20 overflow-hidden"
        aria-label="Testimonios de clientes"
      >
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-white leading-tight mb-8 sm:mb-10 px-4 sm:px-6 max-w-5xl mx-auto">
            <span className="text-white block sm:inline">Clientes de SISU lo certifican: </span>
            <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">el control de asistencia integrado con la nómina es la ventaja verdadera</span>
          </h2>
        </ScrollReveal>

        {TESTIMONIALS.map((testimonial, i) => (
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
            {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, i) => {
              const isDuplicate = i >= TESTIMONIALS.length
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
                        alt={isDuplicate ? '' : `Foto de ${testimonial.name}`}
                        fill
                        className={`object-cover ${testimonial.imagePosition}`}
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{testimonial.name}</p>
                      {testimonial.company ? (
                        <p className="text-slate-400 text-sm font-medium opacity-50 grayscale truncate">{testimonial.company}</p>
                      ) : (
                        <p className="text-slate-400 text-sm font-medium truncate">{testimonial.employees}</p>
                      )}
                    </div>
                  </div>
                  <div className="mb-2" aria-hidden="true">
                    {[...Array(5)].map((_, idx) => (
                      <span key={idx} className={`text-lg ${idx < testimonial.rating ? 'text-yellow-400' : 'text-slate-600'}`}>★</span>
                    ))}
                  </div>
                  <blockquote className="text-slate-400 italic text-sm sm:text-base font-medium landing-dark-text line-clamp-5">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  {testimonial.company && (
                    <span className="mt-3 inline-block text-brand-400 text-sm font-medium">{testimonial.employees}</span>
                  )}
                </article>
              )
            })}
          </div>
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
