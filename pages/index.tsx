import Head from 'next/head'
import { useEffect } from 'react'
import DemoFooter from '../components/DemoFooter'
import ServicesSection from '../components/ServicesSection'
import HowItWorks from '../components/HowItWorks'
import FreeToolsSection from '../components/FreeToolsSection'
import AWSCertificationsSection from '../components/AWSCertificationsSection'
import LandingHero from '../components/LandingHero'
import MainHeader from '../components/MainHeader'
import dynamic from 'next/dynamic'
import LandingClosingSection from '../components/LandingClosingSection'
import MailListSection from '../components/MailListSection'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import { generateOrganizationSchema, generateWebSiteSchema, generateWebPageSchema, generateReviewSchema } from '../lib/seo/schema'
import { CheckCircleIcon, BoltIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { initGoogleAdsTracking } from '../lib/analytics/googleAds'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

export default function LandingPage() {
  useEffect(() => {
    // Initialize Google Ads tracking (UTM parameters)
    initGoogleAdsTracking()

    // Manejar scroll automático cuando se navega con hash
    const handleHashScroll = () => {
      if (window.location.hash) {
        const hash = window.location.hash
        const element = document.querySelector(hash)
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
        }
      }
    }

    // Ejecutar al montar el componente
    handleHashScroll()

    // También escuchar cambios en el hash
    window.addEventListener('hashchange', handleHashScroll)
    return () => window.removeEventListener('hashchange', handleHashScroll)
  }, [])

  const pageTitle = getPageTitle('home')
  const pageDescription = getPageDescription('home')
  // TODO: Replace with optimized 1200x630px image when available
  const ogImage = '/og-image.png' // Fallback to logo if og-image.png doesn't exist yet

  // Generate Schema.org JSON-LD
  const organizationSchema = generateOrganizationSchema()
  const webSiteSchema = generateWebSiteSchema()
  const webPageSchema = generateWebPageSchema({
    url: '/',
    title: pageTitle,
    description: pageDescription,
    image: ogImage
  })

  return (
    <div className="min-h-screen bg-app pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>{pageTitle}</title>
        <link rel="icon" href="/logo-humano-sisu.png" />
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="planilla El Salvador Guatemala Honduras, IHSS, RAP, ISR, automatización RH, STSS, Humano SISU, nómina automatizada" />
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
      
      {/* Schema.org JSON-LD */}
      <SchemaMarkup schema={[organizationSchema, webSiteSchema, webPageSchema]} />

      {/* Header */}
      <MainHeader enableScrollEffect={true} fixed={true} />

      {/* Main Hero - LandingHero enfocado en conversión */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 mb-6 sm:mb-8 animate-fade-up-subtle">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30 font-medium">
              <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Adaptado a leyes de CA (HN, SV, GT)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30 font-medium">
              <BoltIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Implementación rápida
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30 font-medium">
              <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Soporte local
            </span>
          </div>

          {/* Hero Title - Opción A (Paz Mental) */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-bold text-white leading-tight sm:leading-tight">
              <span className="text-white block sm:inline">Gestión de Capital Humano 100% Automatizada:</span>
              <span className="text-brand-300 block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-4xl mt-2 sm:mt-1">Dejá el Excel y eliminá los errores en tu nómina.</span>
            </h1>
            <p className="text-lg sm:text-xl text-brand-200/90 max-w-3xl mx-auto mt-4 sm:mt-6 font-medium landing-dark-text">
              El cerebro digital que integra biometría y software. Detén la fuga silenciosa de tiempo y automatiza tus deducciones legales, para que tu equipo deje de hacer trabajo manual y se enfoque en hacer crecer la empresa.
            </p>
          </div>

          {/* LandingHero Section - Reemplaza completamente al carrusel */}
          <div className="text-center max-w-6xl mx-auto mb-6">
            <LandingHero />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="prueba-social" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="landing-section-glow left-0 top-1/4 -translate-x-1/2" aria-hidden />
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-bold text-center text-white leading-tight sm:leading-tight mb-6 sm:mb-8 px-2 max-w-5xl mx-auto">
            <span className="text-white block sm:inline">Lo dicen nuestros clientes: </span>
            <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">la verdadera ventaja es conectar la biometría directamente con la nómina</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { name: 'Felix Garcia', company: 'Tony\'s Mar Restaurant', employees: '40 empleados', quote: 'Ya no pierdo domingos haciendo planilla. 4 horas ahora son 4 minutos.', rating: 5 },
              { name: 'Nancy Urrutia', company: 'PROHALCA', employees: '37 empleados', quote: 'Habiamos contratado un sistema de asistencia que no hacia planilla, ahora tenemos dashboard interactivo.', rating: 5 },
              { name: 'Abogado Marcio Moya', company: '', employees: '15 empleados', quote: 'Cero errores en deducciones desde que lo uso. Mis clientes están felices.', rating: 5 }
            ].map((testimonial, i) => {
              const reviewSchema = generateReviewSchema({
                productName: 'Humano SISU',
                authorName: testimonial.name,
                rating: testimonial.rating,
                reviewText: testimonial.quote
              })
              return (
                <div key={`testimonial-${i}`}>
                  <SchemaMarkup schema={reviewSchema} />
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                        {testimonial.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium">{testimonial.name}</p>
                        {testimonial.company ? (
                          <p className="text-brand-200/90 text-sm font-medium opacity-50 grayscale">{testimonial.company}</p>
                        ) : (
                          <p className="text-brand-200/90 text-sm font-medium">{testimonial.employees}</p>
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      {[...Array(5)].map((_, idx) => (
                        <span
                          key={idx}
                          className={`text-lg ${idx < testimonial.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <blockquote className="text-brand-200/90 italic mb-4 font-medium landing-dark-text">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                    {testimonial.company && (
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-400 font-medium">{testimonial.employees}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Organic funnel: landing ↔ calculadoras (cluster que ya rankea) */}
      <FreeToolsSection />

      {/* Services Section - Rediseñada */}
      <div className="mt-4">
        <ServicesSection />
      </div>

      {/* AWS Certifications Section */}
      <AWSCertificationsSection />

      {/* Mail List Subscription Section */}
      <MailListSection />

      <LandingClosingSection />

      {/* Shared Cloud Background */}
      <CloudBackground />

      <DemoFooter />
    </div>
  )
}
