import Image from 'next/image'
import Link from 'next/link'
import TrackedInternalCta from '../TrackedInternalCta'
import PublicPageShell from './PublicPageShell'
import PublicPageHead from '../SEO/PublicPageHead'
import SchemaMarkup from '../SEO/SchemaMarkup'
import CampaignStyles from '../marketing/CampaignStyles'
import { generateFAQPageSchema, generateWebPageSchema, generateBreadcrumbListSchema } from '../../lib/seo/schema'
import { useLandingPreferences } from './LandingPreferencesProvider'
import { getCampaignsCopy } from '../../lib/i18n/landings/campaigns'
import { LOCALE_SCHEMA_LANG } from '../../lib/i18n/locale'
import PazVideoGate from './PazVideoGate'
import { trackCTAClick } from '../../lib/analytics/googleAds'
import { PAZ_CALENDAR_URL } from '../../lib/marketing/paz-video'

const PAGE_TITLE = 'La forma pacífica de cerrar planilla | Humano SISU'
const PAGE_DESCRIPTION =
  '¿Perdiste un domingo haciendo Excel? No sos una máquina de errores de deducción. Encontrá tu paz con Humano SISU.'

/* Profiles + testimonials (ocultos por ahora)
const PROFILES = [
  { name: 'Felix', role: 'Dueño de restaurante', initials: 'F', color: 'rgba(37, 99, 235, 0.12)' },
  { name: 'Nancy', role: 'Gerente de RRHH', initials: 'N', color: 'rgba(22, 163, 74, 0.12)' },
  { name: 'Marcio', role: 'Contador', initials: 'M', color: 'rgba(59, 130, 246, 0.14)' },
  { name: 'Karla', role: 'Administradora', initials: 'K', color: 'rgba(14, 165, 233, 0.12)' },
  { name: "Tony's Mar", role: 'Todo el equipo', initials: 'TM', color: 'rgba(22, 163, 74, 0.14)' },
  { name: 'Roberto', role: 'Contador freelance', initials: 'R', color: 'rgba(37, 99, 235, 0.1)' },
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
*/

const FAQS = [
  {
    question: '¿Cómo me preparo para el retiro?',
    answer:
      'Tu laptop con el file de Excel. Nosotros te presentamos el biométrico preconfigurado con acceso a nuestros servidores inteligentes.',
  },
  {
    question: '¿Cuánto tardo en sentir la diferencia?',
    answer:
      'La mayoría siente alivio en la primera quincena automatizada. Algunos en 4 minutos (por que antes le tomaba 6 horas).',
  },
  {
    question: '¿Puedo traer a mi contador?',
    answer: 'Sí. Y traés a tu jefe de personal, mejor. Todos son bienvenidos.',
  },
  {
    question: '¿Cuánto cuesta el retiro?',
    answer:
      'Trial y comparación gratis. Cotización sin letras pequeñas. La paz es real y la demostración es gratis; el biométrico roto ya te costó suficientes males.',
  },
  {
    question: '¿Este retiro es real?',
    answer:
      'El retiro es metáfora. La nómina automatizada, el biométrico y el cumplimiento IHSS/RAP/ISR son reales. (El paz también es real.)',
  },
]

function scrollToVideo() {
  trackCTAClick('paz_video_gate', 'paz_landing_hero')
  document.getElementById('paz-video')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export default function PazLanding() {
  const { locale, href } = useLandingPreferences()
  const campaigns = getCampaignsCopy(locale)
  const webPageSchema = generateWebPageSchema({
    url: locale === 'en' ? '/en/paz' : '/paz',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    inLanguage: LOCALE_SCHEMA_LANG[locale],
  })
  const faqSchema = generateFAQPageSchema(FAQS)
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: locale === 'en' ? 'Home' : 'Inicio', url: href('/') },
    { name: 'Paz al cerrar planilla', url: href('/paz') },
  ])

  return (
    <PublicPageShell
      toneLock="light"
      loginAlwaysVisible
      mainClassName="flex flex-col"
      showFooter={false}
    >
      <CampaignStyles sheets={['paz']} />
      <PublicPageHead
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        canonicalPath="/paz"
      />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema, faqSchema]} />

      <div className="paz-page flex-grow">
        {campaigns.enNote ? (
          <p className="mx-auto max-w-2xl px-4 pt-4 text-center text-sm text-slate-600">{campaigns.enNote}</p>
        ) : null}
        {/* Mismo patrón que MagneticHero: Tailwind grid + next/image en flujo (no fill). */}
        <section className="relative pt-8 sm:pt-12 pb-14 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-8 lg:gap-12 items-center">
              <div className="min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
                <span className="paz-badge">Remedio inmediato</span>
                <h1 className="paz-serif paz-hero-title mb-6">
                  ¿Conocés a alguien que perdió la paz con Recursos Humanos?
                  <br />
                  <span className="italic">¿Esa persona?</span>
                </h1>
                <p className="paz-mantra mb-8 w-full">
                  Ayudamos a Dueños de Negocio y Jefes de Personal a encontrar una forma más pacífica
                  de llevar la gestión del personal.{' '}
                  <strong className="font-semibold text-[var(--paz-ink)]">
                    No eres una máquina de Excel.
                  </strong>
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center lg:items-start justify-center lg:justify-start gap-3">
                  <a
                    href={PAZ_CALENDAR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paz-btn paz-btn-activar"
                    data-analytics="cta_paz_hero_agendar"
                    onClick={() => trackCTAClick('agendar_asesoria', 'paz_landing_hero')}
                  >
                    Agendar asesoría
                  </a>
                  <button
                    type="button"
                    onClick={scrollToVideo}
                    className="paz-btn paz-btn-ghost"
                    data-analytics="cta_paz_hero_revelar"
                  >
                    Revelar secreto
                  </button>
                </div>
              </div>

              <div className="w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 min-w-0">
                <div className="rounded-2xl p-2 border border-[var(--paz-border)] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.1)]">
                  <div className="rounded-xl overflow-hidden bg-[var(--paz-glass)] leading-none">
                    <Image
                      src="/images/paz/hero-burnout.jpg"
                      alt="Profesional agobiada frente a su laptop, con las manos en la cara al cerrar planilla"
                      width={682}
                      height={1024}
                      className="block w-full max-w-full h-auto object-cover object-center"
                      sizes="(max-width: 1023px) min(100vw - 2rem, 24rem), 28vw"
                    />
                  </div>
                </div>
                <p className="text-center mt-3 text-xs font-medium text-[var(--paz-ink-soft)]">
                  Recupera la paz hoy con tu nueva asistente de RRHH. Digital y Automatizado.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="paz-divider" />

        <section id="paz-video" className="paz-section">
          <div className="text-center mb-8">
            <h2 className="paz-serif paz-section-title mb-4">Método revelado</h2>
            <p className="paz-lead max-w-xl mx-auto">
              Unos minutos de meditación sobre cómo cerrar planilla de manera pacífica, dirigida por
              el viento y los servidores de SISU. Dejá tu correo. Tu herramienta nueva está aquí.
            </p>
          </div>
          <PazVideoGate />
        </section>

        <hr className="paz-divider" />

        {/* Sección perfiles + testimonios (ocultos por ahora)
        <section className="paz-section text-center">
          <h2 className="paz-serif paz-section-title mb-4 max-w-2xl mx-auto">
            Tu camino hacia el cierre interior de planilla te espera.
          </h2>
          <p className="paz-lead max-w-xl mx-auto mb-12">
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
                <p className="text-xs text-[var(--paz-ink-soft)] mt-0.5">{profile.role}</p>
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
            <p className="paz-serif text-xl italic text-[var(--paz-ink-muted)] mt-6">
              Bienvenido al otro lado. El Excel ya no te define.
            </p>
          )}
        </section>

        <hr className="paz-divider" />

        <section className="paz-section">
          <h2 className="paz-serif paz-section-title text-center mb-10">
            Empresarios que encontraron su paz
          </h2>
          <div className="paz-card max-w-2xl mx-auto">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="paz-testimonial">
                <blockquote className="paz-testimonial-quote paz-serif mb-4">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <footer>
                  <cite className="not-italic font-medium text-[var(--paz-ink)]">{t.name}</cite>
                  {t.role && (
                    <span className="text-[var(--paz-ink-soft)] text-sm"> — {t.role}</span>
                  )}
                </footer>
              </article>
            ))}
          </div>
        </section>

        <hr className="paz-divider" />
        */}

        <section className="paz-section">
          <h2 className="paz-serif paz-section-title text-center mb-4">
            Respirá. Tenemos respuestas.
          </h2>
          <p className="text-center text-[var(--paz-ink-soft)] mb-10 text-sm">
            ¿Querés validar tu paz antes del retiro?{' '}
            <Link
              href="/calculadora?utm_source=paz&utm_medium=faq&utm_campaign=valida-tu-paz"
              className="paz-link"
            >
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

        <hr className="paz-divider" />

        {/* Misma mecánica que hero: grid + next/image en flujo, minmax/min-w-0 */}
        <section className="relative py-16 sm:py-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,3fr)] gap-8 lg:gap-10 items-center">
              <div className="w-full max-w-xs mx-auto lg:max-w-none min-w-0 order-2 lg:order-1">
                <div className="rounded-2xl p-2 border border-[var(--paz-border)] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.1)]">
                  <div className="rounded-xl overflow-hidden bg-[var(--paz-glass)] leading-none">
                    <Image
                      src="/images/paz/cta-stress.jpg"
                      alt="Profesional agobiada en oficina, perdiendo la paz con la gestión del personal"
                      width={682}
                      height={1024}
                      className="block w-full max-w-full h-auto object-cover object-center"
                      sizes="(max-width: 1023px) min(100vw - 2rem, 20rem), 22vw"
                    />
                  </div>
                </div>
              </div>

              <div className="min-w-0 text-center order-1 lg:order-2">
                <h2 className="paz-dual-cta paz-serif mb-6">
                  Perder la paz <span>/</span> Hacer las paces
                </h2>
                <p className="paz-lead max-w-lg mx-auto mb-10">
                  La ayuda está a un click. Activá tu demo o pedí de una vez tu cotización. El tiempo
                  perdido es real, pero también lo es la solución. (La paz recuperada también.)
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
                  <TrackedInternalCta
                    href="/activar?utm_source=paz&utm_medium=cta&utm_campaign=cerrar-planilla"
                    ctaType="activar_trial"
                    location="paz_landing_primary"
                    className="paz-btn paz-btn-activar"
                  >
                    Probar gratis
                  </TrackedInternalCta>
                  <TrackedInternalCta
                    href="/ventas?utm_source=paz&utm_medium=cta&utm_campaign=tocar-pasto"
                    ctaType="solicitar_cotizacion"
                    location="paz_landing_secondary"
                    className="paz-btn paz-btn-ghost"
                  >
                    Solicitar cotización
                  </TrackedInternalCta>
                </div>
              </div>

              <div className="w-full max-w-xs mx-auto lg:max-w-none min-w-0 order-3">
                <div className="rounded-2xl p-2 border border-[var(--paz-border)] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.1)]">
                  <div className="rounded-xl overflow-hidden bg-[var(--paz-glass)] leading-none">
                    <Image
                      src="/images/paz/cta-peace.jpg"
                      alt="Profesional sonriendo en oficina, con paz al gestionar personal"
                      width={682}
                      height={1024}
                      className="block w-full max-w-full h-auto object-cover object-center"
                      sizes="(max-width: 1023px) min(100vw - 2rem, 20rem), 22vw"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="paz-footer">
          <p className="paz-serif italic mb-2 text-[var(--paz-ink)]">Humano SISU — Paz</p>
          <p>
            Campaña satírica. La nómina automatizada es real.{' '}
            <Link href="/" className="paz-link">
              Ir a humanosisu.net
            </Link>
          </p>
        </footer>
      </div>
    </PublicPageShell>
  )
}
