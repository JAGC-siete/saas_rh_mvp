import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import PublicPageShell from './PublicPageShell'
import PublicPageHead from '../SEO/PublicPageHead'
import SchemaMarkup from '../SEO/SchemaMarkup'
import CampaignStyles from '../marketing/CampaignStyles'
import PeaceLeadWizard, { type PeaceLeadWizardHandle } from '../info-game/PeaceLeadWizard'
import { generateFAQPageSchema, generateWebPageSchema, generateBreadcrumbListSchema } from '../../lib/seo/schema'
import { VIERNES_COPY, VIERNES_PUBLIC_PATH } from '../../lib/marketing/viernes-copy'

function scrollToPeaceWizard() {
  document.getElementById('peace-wizard')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function ViernesLanding() {
  const copy = VIERNES_COPY
  const router = useRouter()
  const wizardRef = useRef<PeaceLeadWizardHandle>(null)
  const autoUnlockDone = useRef(false)

  const webPageSchema = generateWebPageSchema({
    url: VIERNES_PUBLIC_PATH,
    title: copy.seo.title,
    description: copy.seo.description,
  })
  const faqSchema = generateFAQPageSchema(copy.faq.map((f) => ({ question: f.question, answer: f.answer })))
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Domingos sin planilla', url: VIERNES_PUBLIC_PATH },
  ])

  const openPeaceWizard = () => {
    wizardRef.current?.startUnlock()
    scrollToPeaceWizard()
  }

  useEffect(() => {
    if (!router.isReady || autoUnlockDone.current || router.query.unlock !== '1') return
    autoUnlockDone.current = true
    wizardRef.current?.startUnlock()
    requestAnimationFrame(scrollToPeaceWizard)
  }, [router.isReady, router.query.unlock])

  return (
    <PublicPageShell showTrustBar loginAlwaysVisible mainClassName="flex flex-col" showFooter={false}>
      <CampaignStyles sheets={['viernes']} />
      <PublicPageHead
        title={copy.seo.title}
        description={copy.seo.description}
        canonicalPath={VIERNES_PUBLIC_PATH}
      />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      <div className="viernes-page flex-grow">
        <section className="viernes-section pt-8 sm:pt-12 text-center">
          <span className="viernes-badge">{copy.hero.badge}</span>
          <h1 className="viernes-serif viernes-hero-title mb-6">
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-normal not-italic">
              {copy.hero.headlineLead}
            </span>
            <span className="block italic mt-1">{copy.hero.headlineAccent}</span>
          </h1>
          <p className="viernes-lead mb-6 max-w-2xl mx-auto">{copy.hero.subheadline}</p>
          <p className="viernes-mantra mb-8 max-w-xl mx-auto text-left">{copy.hero.mantra}</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
            <button type="button" onClick={openPeaceWizard} className="viernes-btn viernes-btn-primary">
              {copy.hero.ctaPrimary}
            </button>
            <Link
              href="/calculadora?utm_source=viernes&utm_medium=hero&utm_campaign=validar-calculo"
              className="viernes-btn viernes-btn-ghost text-sm"
            >
              {copy.hero.ctaSecondary}
            </Link>
          </div>
        </section>

        <hr className="viernes-divider" />

        <section className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">{copy.insight.title}</h2>
          <div className="viernes-card">
            <p className="viernes-insight-lead viernes-serif italic">{copy.insight.lead}</p>
            {copy.insight.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="viernes-lead mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
            <div className="viernes-comparison">
              {copy.insight.comparison.map((row) => (
                <div key={row.before} className="viernes-comparison-row">
                  <span className="viernes-comparison-before">{row.before}</span>
                  <span className="viernes-comparison-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="viernes-comparison-after">{row.after}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="viernes-divider" />

        <section id="peace-wizard" className="viernes-section">
          <PeaceLeadWizard ref={wizardRef} channel="viernes" embedded idPrefix="viernes" />
        </section>

        <hr className="viernes-divider" />

        <section className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">{copy.proof.title}</h2>
          <div className="viernes-card">
            {copy.proof.items.map((item) => (
              <p key={item} className="viernes-proof-item">
                {item}
              </p>
            ))}
          </div>
        </section>

        <hr className="viernes-divider" />

        <section className="viernes-section">
          <h2 className="viernes-serif viernes-section-title">Preguntas frecuentes</h2>
          <div>
            {copy.faq.map((faq) => (
              <details key={faq.question} className="viernes-faq-item group">
                <summary className="viernes-faq-summary">{faq.question}</summary>
                <p className="viernes-faq-answer">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <hr className="viernes-divider" />

        <section className="viernes-section py-16 sm:py-20 text-center">
          <h2 className="viernes-serif viernes-final-title">
            <span className="viernes-final-title-lead">{copy.finalCta.headlineLead}</span>
            <span className="viernes-final-title-accent">{copy.finalCta.headlineAccent}</span>
          </h2>
          <p className="viernes-lead max-w-lg mx-auto mb-8">{copy.finalCta.sub}</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mb-4">
            <Link href={copy.finalCta.activarHref} className="viernes-btn viernes-btn-activar">
              {copy.finalCta.primary}
            </Link>
          </div>
          <p className="text-sm text-[var(--v-ink-soft)]">
            <Link
              href="/ventas?utm_source=viernes&utm_medium=cta-final&utm_campaign=cotizacion"
              className="viernes-link"
            >
              {copy.finalCta.secondary}
            </Link>
          </p>
        </section>
      </div>
    </PublicPageShell>
  )
}
