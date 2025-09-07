import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import DemoFooter from '../components/DemoFooter'
import ServicesSection from '../components/ServicesSection'
import AWSCertificationsSection from '../components/AWSCertificationsSection'
import LandingHero from '../components/LandingHero'
import CountdownTimer from '../components/CountdownTimer'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import LanguageSwitcher from '../components/LanguageSwitcher'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { t } = useTranslation(['common', 'landing'])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      setIsScrolled(scrollTop > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const href = e.currentTarget.getAttribute('href')
    if (href && href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) element.scrollIntoView({ behavior: 'smooth' })
    }
  }
  const badges = t('trustBadges', { returnObjects: true }) as string[]

  return (
    <div className="min-h-screen bg-app pt-20 relative">
      <Head>
        <title>{t('head.title')}</title>
        <meta name="description" content={t('head.description')} />
        <meta name="keywords" content={t('head.keywords')} />
        <meta name="author" content={t('head.author')} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={t('head.ogTitle')} />
        <meta property="og:description" content={t('head.ogDescription')} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={process.env.NEXT_PUBLIC_SITE_URL} />
        <meta property="og:image" content="/logo-humano-sisu.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('head.twitterTitle')} />
        <meta name="twitter:description" content={t('head.twitterDescription')} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Fixed Header with Glass Effect */}
        <div
          className={`w-full transition-all duration-300 ${
            isScrolled 
              ? 'bg-slate-900/90 backdrop-blur-sm border-b border-white/20 shadow-lg' 
              : 'bg-transparent border-b border-white/10'
          }`}
        >
          <nav className="px-6 lg:px-8">
            <div className="flex items-center h-16">
              {/* Logo SISU */}
              <div className="flex items-center">
                <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/20 backdrop-blur-sm">
                  <Image
                    src="/logo-humano-sisu.png"
                    alt="Humano SISU Logo"
                    width={64}
                    height={64}
                    className="rounded-lg"
                  />
                </div>
              </div>
              
              {/* Título */}
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-tight ml-2 flex-shrink-0 text-left">
                <span className="text-white">{t('header.tagline.main')}</span>
                <span className="hidden sm:inline"> </span>
                <span className="text-brand-300">{t('header.tagline.highlight')}</span>
              </h1>

              <div className="hidden md:block ml-auto">
                <div className="ml-6 flex items-center space-x-4">
                  <a
                    href="#servicios"
                    className="text-brand-200 hover:text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                    onClick={scrollToSection}
                  >
                    {t('common:nav.services')}
                  </a>
                  <Link
                    href="/app/login"
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap min-w-[140px] text-center"
                  >
                    {t('common:nav.login')}
                  </Link>
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="glass inline-flex items-center justify-center p-2 rounded-md text-brand-200 hover:text-white hover:bg-brand-700/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <span className="sr-only">{t('common:nav.openMenu')}</span>
                  {isMobileMenuOpen ? (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Mobile menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 glass-strong rounded-lg shadow-lg mt-2">
                
                <a
                  href="#servicios"
                  className="block px-3 py-2 text-base font-medium text-brand-200/90 hover:text-white hover:bg-brand-800/20 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('common:nav.services')}
                </a>
                <Link
                  href="/app/login"
                  className="bg-brand-900 hover:bg-brand-800 text-white w-full text-center block py-2 px-4 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('common:nav.login')}
                </Link>
                <LanguageSwitcher />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Hero - LandingHero enfocado en conversión */}
      <section className="py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8 animate-fade-up-subtle">
            {badges.map((badge, i) => (
              <span
                key={badge}
                className={`text-sm px-3 py-1 rounded-full border transition-all duration-300 hover:-translate-y-0.5 animate-delay-${(i + 1) * 100}`}
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Countdown Timer - Centrado debajo de los trust badges */}
          <CountdownTimer />

          {/* LandingHero Section - Reemplaza completamente al carrusel */}
          <div className="text-center max-w-6xl mx-auto mb-6">
            <LandingHero />
          </div>
        </div>
      </section>

      {/* Services Section - Rediseñada */}
      <div className="mt-4">
        <ServicesSection />
      </div>

      {/* AWS Certifications Section */}
      <AWSCertificationsSection />

      {/* Social Proof Section - Simplificada */}
      <section id="servicios" className="py-16 bg-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            {t('socialProof.title')}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {(t('socialProof.testimonials', { returnObjects: true }) as any[]).map((testimonial, i) => (
              <div key={`testimonial-${i}`} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium">{testimonial.name}</p>
                    <p className="text-brand-200/80 text-sm">{testimonial.company}</p>
                  </div>
                </div>
                <blockquote className="text-brand-200/90 italic mb-4">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-400">{testimonial.employees}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shared Cloud Background */}
      <CloudBackground />

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-slate-400 mb-4" dangerouslySetInnerHTML={{ __html: t('common:footer.protect') }} />
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
              <Link
                href="/politicadeprivacidad"
                className="text-brand-300 hover:text-brand-400 transition-colors underline decoration-brand-400/30 hover:decoration-brand-400"
              >
                {t('common:footer.privacy')}
              </Link>
              <span className="text-slate-500">•</span>
              <span className="text-slate-500">{t('common:footer.rights')}</span>
            </div>
          </div>
        </div>
      </footer>

      <DemoFooter />
    </div>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'landing'])),
    },
  }
}
