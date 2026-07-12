import { useState } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import SchemaMarkup from '../SEO/SchemaMarkup'
import CampaignStyles from '../marketing/CampaignStyles'
import { generateFAQPageSchema, generateWebPageSchema, generateBreadcrumbListSchema } from '../../lib/seo/schema'
import { PAZ_SOCIAL_LINKS, SOCIAL_LINKS } from '../../lib/marketing/social-links'

const PAGE_TITLE = 'La forma pacífica de cerrar planilla | Humano SISU'
const PAGE_DESCRIPTION =
  '¿Perdiste un domingo haciendo Excel? No sos una máquina de errores de deducción. Encontrá tu paz con Humano SISU.'

const PROFILES = [
  { name: 'Felix', role: 'Dueño de restaurante', initials: 'F', color: '#d4e4d0' },
  { name: 'Nancy', role: 'Gerente de RRHH', initials: 'N', color: '#e0ddd4' },
  { name: 'Marcio', role: 'Contador', initials: 'M', color: '#cdd9c8' },
  { name: 'Karla', role: 'Administradora', initials: 'K', color: '#e8e4d8' },
  { name: "Tony's Mar", role: 'Todo el equipo', initials: 'TM', color: '#b8c9b2' },
  { name: 'Roberto', role: 'Contador freelance', initials: 'R', color: '#d8dfd4' },
]

const TESTIMONIALS = [
  {
    name: 'Felix',
    role: 'Dueño de restaurante',
    quote: 'No soy una máquina de Excel. No soy una máquina de Excel.',
  },
  {
    name: 'Nancy',
    role: 'Gerente de RRHH',
    quote:
      'Pasé toda la vida en planillero hasta este retiro. Ahora me desplanilleré y me siento increíble.',
  },
  {
    name: 'Marcio',
    role: 'Contador',
    quote:
      'Toqué pasto. Después toqué prod… digo, cerré quincena. Después toqué pasto otra vez.',
  },
  {
    name: 'Karla',
    role: 'Administradora',
    quote: 'Solía pasar el día preocupada por el IHSS. Ahora paso el día purr… digo, pura.',
  },
  {
    name: 'Roberto',
    role: 'Contador freelance',
    quote:
      'Cerré planilla un viernes a las 4pm. No sentí nada. Nada hermoso, liviano, sin peso.',
  },
  {
    name: "Todo el equipo de Tony's Mar",
    role: '',
    quote: 'Sentimos diferente.',
  },
]

const FAQS = [
  {
    question: '¿Qué debo llevar al retiro?',
    answer:
      'Tu laptop con el Excel roto. Nosotros traemos el biométrico y el motor legal.',
  },
  {
    question: '¿Cuánto tardo en sentir algo?',
    answer:
      'La mayoría siente alivio en la primera quincena automatizada. Algunos en 4 minutos (antes eran 4 horas).',
  },
  {
    question: '¿Puedo venir solo?',
    answer: 'Sí. Pero si traés a tu contador, mejor. La paz compartida escala.',
  },
  {
    question: '¿Cuánto cuesta el retiro?',
    answer:
      'Cotización sin costo. Trial gratis según política vigente. El pasto es gratis; el Excel ya te costó suficientes domingos.',
  },
  {
    question: '¿Este retiro es real?',
    answer:
      'El retiro es metáfora. La nómina automatizada, el biométrico y el cumplimiento IHSS/RAP/ISR son reales. (El pasto también es real.)',
  },
]

function scrollToVideo() {
  document.getElementById('paz-video')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export default function PazLanding() {
  const [desplanillero, setDesplanillero] = useState(false)

  const webPageSchema = generateWebPageSchema({
    url: '/paz',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  })
  const faqSchema = generateFAQPageSchema(FAQS)
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Paz al cerrar planilla', url: '/paz' },
  ])

  return (
    <div className="paz-page">
      <CampaignStyles sheets={['paz']} />
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://humanosisu.net/paz" />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:url" content="https://humanosisu.net/paz" />
        <meta property="og:type" content="website" />
      </Head>
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      <div className="paz-grain" aria-hidden="true" />

      <nav className="paz-nav">
        <Link href="/" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <Image src="/brand/logo-humano-sisu-sm.png" alt="Humano SISU" width={64} height={36} className="h-8 w-auto" />
          <span className="paz-serif text-lg font-medium text-[var(--paz-ink)]">Humano SISU</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-[var(--paz-ink-muted)] hover:text-[var(--paz-ink)] transition-colors"
        >
          Volver al mundo real
        </Link>
      </nav>

      {/* Hero */}
      <section className="paz-section pt-28 sm:pt-32 text-center">
        <p className="paz-serif text-sm uppercase tracking-[0.2em] text-[var(--paz-sage)] mb-6">
          La forma pacífica de cerrar planilla
        </p>
        <h1 className="paz-hero-title paz-serif text-[var(--paz-ink)] mb-6">
          ¿Conocés a alguien que perdió la paz cerrando planilla?
          <br />
          <span className="italic">¿Esa persona sos vos?</span>
        </h1>
        <p className="paz-mantra max-w-2xl mx-auto mb-10">
          Ayudamos a dueños de negocio y equipos de RRHH como vos a encontrar una forma más
          pacífica de pagar nómina.{' '}
          <strong className="text-[var(--paz-ink)] font-medium">No sos una máquina de Excel.</strong>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={scrollToVideo} className="paz-btn paz-btn-primary">
            Ver el video
            <span className="text-sm opacity-75">(45 seg de serenidad)</span>
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PAZ_SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="paz-btn paz-btn-ghost text-sm"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Video */}
      <section id="paz-video" className="paz-section py-8 sm:py-12">
        <div className="text-center mb-8">
          <h2 className="paz-serif paz-hero-title text-[var(--paz-ink)] mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            Cuarenta y cinco segundos de serenidad
          </h2>
          <p className="paz-mantra max-w-xl mx-auto">
            Una meditación sobre cerrar planilla, dirigida por el viento y el motor legal de Humano
            SISU. Dale play. Respirá.
          </p>
        </div>
        <div className="paz-video-frame paz-breathe">
          <div className="paz-video-placeholder">
            <button
              type="button"
              className="paz-play-btn"
              aria-label="Reproducir meditación"
              onClick={() =>
                window.open(SOCIAL_LINKS.youtube, '_blank', 'noopener,noreferrer')
              }
            >
              <svg width="20" height="24" viewBox="0 0 20 24" fill="currentColor" aria-hidden="true">
                <path d="M0 0v24l20-12L0 0z" />
              </svg>
            </button>
            <p className="paz-serif text-lg text-[var(--paz-ink-muted)] italic">
              Excel roto → dashboard SISU → pasto → café de domingo
            </p>
            <p className="text-sm text-[var(--paz-sage)]">Próximamente en YouTube</p>
          </div>
        </div>
      </section>

      {/* Path */}
      <section className="paz-section py-12 sm:py-16 text-center border-t border-[var(--paz-border)]">
        <h2 className="paz-serif text-3xl sm:text-4xl font-medium text-[var(--paz-ink)] mb-4 max-w-2xl mx-auto leading-tight">
          Tu camino hacia el cierre interior de planilla te espera.
        </h2>
        <p className="paz-mantra max-w-xl mx-auto mb-12">
          Liberá tu código… digo, tu nómina. Y tu sufrimiento. Unite a empresarios como vos que ya
          encontraron la paz.
        </p>

        <div className="paz-avatar-grid max-w-3xl mx-auto mb-12">
          {PROFILES.map((profile) => (
            <div key={profile.name} className="paz-avatar-card">
              <div
                className="paz-avatar-circle"
                style={{ backgroundColor: profile.color }}
              >
                {profile.initials}
              </div>
              <p className="font-medium text-[var(--paz-ink)] text-sm">{profile.name}</p>
              <p className="text-xs text-[var(--paz-ink-muted)] mt-0.5">{profile.role}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="paz-toggle"
          onClick={() => setDesplanillero((v) => !v)}
          aria-label={desplanillero ? 'Modo desplanillero' : 'Modo planillero'}
        >
          <span className={`paz-toggle-option ${!desplanillero ? 'active' : ''}`}>Planillero</span>
          <span className={`paz-toggle-option ${desplanillero ? 'active' : ''}`}>Desplanillero</span>
        </button>
        {desplanillero && (
          <p className="paz-serif text-xl italic text-[var(--paz-sage)] mt-6 animate-fade-up-subtle">
            Bienvenido al otro lado. El Excel ya no te define.
          </p>
        )}
      </section>

      {/* Testimonials */}
      <section className="paz-section py-12 sm:py-16 border-t border-[var(--paz-border)]">
        <h2 className="paz-serif text-3xl sm:text-4xl font-medium text-center text-[var(--paz-ink)] mb-12">
          Empresarios que encontraron su paz
        </h2>
        <div className="max-w-2xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <article key={t.name} className="paz-testimonial">
              <blockquote className="paz-testimonial-quote paz-serif text-[var(--paz-ink)] mb-4">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <footer>
                <cite className="not-italic font-medium text-[var(--paz-ink)]">{t.name}</cite>
                {t.role && (
                  <span className="text-[var(--paz-ink-muted)] text-sm"> — {t.role}</span>
                )}
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="paz-section py-12 sm:py-16 border-t border-[var(--paz-border)]">
        <h2 className="paz-serif text-3xl sm:text-4xl font-medium text-center text-[var(--paz-ink)] mb-4">
          Respirá. Tenemos respuestas.
        </h2>
        <p className="text-center text-[var(--paz-ink-muted)] mb-10 text-sm">
          ¿Querés validar tu paz antes del retiro?{' '}
          <Link href="/calculadora?utm_source=paz&utm_medium=faq&utm_campaign=valida-tu-paz" className="underline hover:text-[var(--paz-ink)]">
            Probá las calculadoras gratis
          </Link>
        </p>
        <div className="max-w-2xl mx-auto">
          {FAQS.map((faq) => (
            <details key={faq.question} className="paz-faq-item group">
              <summary className="paz-faq-summary">{faq.question}</summary>
              <p className="paz-faq-answer">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="paz-section py-16 sm:py-24 text-center border-t border-[var(--paz-border)]">
        <h2 className="paz-dual-cta paz-serif text-[var(--paz-ink)] mb-6">
          Cerrar planilla <span>/</span> Tocar pasto
        </h2>
        <p className="paz-mantra max-w-lg mx-auto mb-10">
          La ayuda está a un paso. Activá tu trial o pedí cotización. La recuperación es real, y
          también lo es el software. (El pasto también.)
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/activar?utm_source=paz&utm_medium=cta&utm_campaign=cerrar-planilla"
            className="paz-btn paz-btn-primary"
          >
            Probar gratis
          </Link>
          <Link
            href="/ventas?utm_source=paz&utm_medium=cta&utm_campaign=tocar-pasto"
            className="paz-btn paz-btn-ghost"
          >
            Solicitar cotización
          </Link>
        </div>
      </section>

      <footer className="paz-footer relative z-10">
        <p className="paz-serif italic mb-2">Humano SISU — Paz</p>
        <p>
          Campaña satírica. La nómina automatizada es real.{' '}
          <Link href="/" className="underline hover:text-[var(--paz-ink)]">
            Ir a humanosisu.net
          </Link>
        </p>
      </footer>
    </div>
  )
}
