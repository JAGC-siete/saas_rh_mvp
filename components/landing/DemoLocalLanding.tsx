import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  BuildingStorefrontIcon,
  GlobeAltIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import PublicPageShell from './PublicPageShell'
import PublicPageHead from '../SEO/PublicPageHead'
import SchemaMarkup from '../SEO/SchemaMarkup'
import BorderBeam from './BorderBeam'
import ScrollReveal from './ScrollReveal'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { generateBreadcrumbListSchema, generateWebPageSchema } from '../../lib/seo/schema'
import { PRIVACY_PUBLIC_PATH, TERMS_PUBLIC_PATH } from '../../lib/marketing/legal-paths'
import {
  DEMO_LOCAL_API_PATH,
  DEMO_LOCAL_CATALOGS,
  DEMO_LOCAL_COPY,
  DEMO_LOCAL_MARKETING_SOURCE,
  DEMO_LOCAL_PUBLIC_PATH,
  DEMO_LOCAL_RUBROS,
  catalogForRubro,
  demoLocalFieldErrors,
  parseDemoLocalLead,
  type DemoLocalRubro,
} from '../../lib/marketing/demo-local'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackDemoLocalLeadSubmit,
} from '../../lib/analytics/metaPixel'
import { trackCTAClick } from '../../lib/analytics/googleAds'

const copy = DEMO_LOCAL_COPY

const OFFER_ICONS = [GlobeAltIcon, MapPinIcon] as const

const fieldClass =
  'input-glass h-10 w-full border-white/15 bg-white/5 text-white placeholder:text-white/50 disabled:cursor-not-allowed disabled:opacity-50'

function scrollToId(id: string, cta: string, location: string) {
  trackCTAClick(cta, location)
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function DemoLocalLanding() {
  const [rubro, setRubro] = useState<DemoLocalRubro>('barberia')
  const catalog = catalogForRubro(rubro)

  const webPageSchema = generateWebPageSchema({
    url: DEMO_LOCAL_PUBLIC_PATH,
    title: copy.seo.title,
    description: copy.seo.description,
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Inicio', url: '/' },
    { name: 'Página para negocio local', url: DEMO_LOCAL_PUBLIC_PATH },
  ])

  return (
    <PublicPageShell
      showSpotlight
      showFooter={false}
      navChrome="local"
      localCta={{ href: '#solicitud', label: copy.hero.ctaPrimary }}
      mainClassName="flex flex-col"
    >
      <PublicPageHead
        title={copy.seo.title}
        description={copy.seo.description}
        canonicalPath={DEMO_LOCAL_PUBLIC_PATH}
        keywords={copy.seo.keywords}
      />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema]} />

      <section className="relative overflow-hidden px-4 sm:px-6 pt-6 sm:pt-10 pb-10 sm:pb-16">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-56 w-56 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="inline-flex max-w-full items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium leading-snug text-cyan-200">
                {copy.hero.kicker}
              </span>
            </div>
            <h1 className="landing-hero-gradient text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {copy.hero.headline}
            </h1>
            <p className="landing-muted mt-5 max-w-2xl text-base font-medium sm:text-lg">{copy.hero.subheadline}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                className="btn-shiny min-h-[48px] bg-green-600 px-6 text-base font-semibold shadow-[0_0_24px_rgba(34,197,94,0.28)] hover:bg-green-700"
                onClick={() => scrollToId('solicitud', 'demo_local_solicitud', 'demo_local_hero')}
              >
                {copy.hero.ctaPrimary}
              </Button>
            </div>
          </div>

          <BorderBeam>
            <div className="glass-modern relative overflow-hidden rounded-2xl p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Búsqueda en el barrio</p>
              <p className="mt-2 text-lg font-semibold text-white">“{catalog.mapsQuery}”</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{copy.hero.mapsBenefit}</p>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10">
                    <MapPinIcon className="h-5 w-5 text-cyan-300" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{catalog.shopName}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{catalog.neighborhood}</p>
                    <p className="mt-1 text-xs text-cyan-200">{catalog.hours}</p>
                  </div>
                </div>
              </div>
            </div>
          </BorderBeam>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-28 px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">{copy.offer.title}</h2>
            </div>
          </ScrollReveal>
          <ul className="grid gap-4 md:grid-cols-2">
            {copy.offer.steps.map((step, index) => {
              const Icon = OFFER_ICONS[index] ?? GlobeAltIcon
              return (
                <ScrollReveal key={step.title} delay={index * 0.06}>
                  <li className="glass-modern h-full rounded-2xl p-5 sm:p-6">
                    <div className="mb-4 flex items-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/15">
                        <Icon className="h-5 w-5 text-brand-300" aria-hidden />
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.body}</p>
                  </li>
                </ScrollReveal>
              )
            })}
          </ul>
        </div>
      </section>

      <section id="solicitud" className="scroll-mt-28 px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{copy.form.title}</h2>
            <p className="landing-muted mt-3 text-sm sm:text-base">{copy.form.subtitle}</p>
            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              {copy.form.bullets.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <DemoLocalLeadForm selectedRubro={rubro} onRubroChange={setRubro} />
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="glass-modern mx-auto max-w-3xl rounded-3xl px-6 py-10 text-center sm:px-10">
          <BuildingStorefrontIcon className="mx-auto mb-4 h-8 w-8 text-cyan-300" aria-hidden />
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{copy.close.headline}</h2>
          <p className="landing-muted mx-auto mt-3 max-w-lg">{copy.close.sub}</p>
          <Button
            type="button"
            size="lg"
            className="btn-shiny mt-8 min-h-[48px] bg-green-600 px-6 text-base font-semibold hover:bg-green-700"
            onClick={() => scrollToId('solicitud', 'demo_local_solicitud', 'demo_local_final')}
          >
            {copy.close.primary}
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{copy.footer.blurb}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              {copy.footer.payrollNote}{' '}
              <Link href="/" className="text-slate-200 underline-offset-2 hover:underline">
                {copy.footer.payrollCta}
              </Link>
            </span>
            <Link href={PRIVACY_PUBLIC_PATH} className="hover:text-white">
              {copy.form.privacy}
            </Link>
            <Link href={TERMS_PUBLIC_PATH} className="hover:text-white">
              {copy.form.terms}
            </Link>
          </div>
        </div>
      </footer>
    </PublicPageShell>
  )
}

function DemoLocalLeadForm({
  selectedRubro,
  onRubroChange,
}: {
  selectedRubro: DemoLocalRubro
  onRubroChange: (rubro: DemoLocalRubro) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    ownerName: '',
    businessName: '',
    email: '',
    phone: '',
    city: '',
    note: '',
    wantsBooking: false,
    consent: false,
  })

  const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400'

  const payloadPreview = useMemo(
    () => ({
      ...form,
      rubro: selectedRubro,
      note: form.note.trim() || undefined,
    }),
    [form, selectedRubro]
  )

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseDemoLocalLead({ ...payloadPreview, consent: form.consent })
    if (!parsed.success) {
      setErrors(demoLocalFieldErrors(parsed.error))
      return
    }

    setIsLoading(true)
    setErrors({})
    const metaEventId = createMetaEventId(DEMO_LOCAL_MARKETING_SOURCE)

    try {
      const resp = await fetch(DEMO_LOCAL_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          ...buildMetaApiTrackingFields(metaEventId),
        }),
      })
      const data = (await resp.json()) as { error?: string; success?: boolean }
      if (!resp.ok) {
        setErrors({ submit: data.error || 'No se pudo enviar la solicitud.' })
        return
      }

      trackDemoLocalLeadSubmit({
        eventId: metaEventId,
        email: parsed.data.email,
        phone: parsed.data.phone,
        firstName: parsed.data.ownerName,
        rubro: parsed.data.rubro,
      })
      setSuccessEmail(parsed.data.email)
    } catch {
      setErrors({ submit: 'No se pudo enviar. Revise su conexión e intente de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (successEmail) {
    return (
      <BorderBeam>
        <div className="glass-modern rounded-2xl p-6 sm:p-7">
          <p className="text-lg font-semibold text-green-300">{copy.form.successTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {copy.form.successBody} Enviamos confirmación a <strong className="text-white">{successEmail}</strong>.
          </p>
        </div>
      </BorderBeam>
    )
  }

  return (
    <BorderBeam>
      <form
        action={DEMO_LOCAL_API_PATH}
        method="post"
        onSubmit={onSubmit}
        className="glass-modern space-y-4 rounded-2xl p-5 sm:p-7"
        noValidate
      >
        <div>
          <label htmlFor="dl-owner" className={labelClass}>
            Tu nombre
          </label>
          <Input
            id="dl-owner"
            className={fieldClass}
            autoComplete="name"
            value={form.ownerName}
            onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
          />
          {errors.ownerName ? <p className="mt-1 text-xs text-red-300">{errors.ownerName}</p> : null}
        </div>
        <div>
          <label htmlFor="dl-business" className={labelClass}>
            Nombre del negocio
          </label>
          <Input
            id="dl-business"
            className={fieldClass}
            autoComplete="organization"
            value={form.businessName}
            onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
          />
          {errors.businessName ? <p className="mt-1 text-xs text-red-300">{errors.businessName}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dl-email" className={labelClass}>
              Correo
            </label>
            <Input
              id="dl-email"
              type="email"
              className={fieldClass}
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            {errors.email ? <p className="mt-1 text-xs text-red-300">{errors.email}</p> : null}
          </div>
          <div>
            <label htmlFor="dl-phone" className={labelClass}>
              WhatsApp / teléfono
            </label>
            <Input
              id="dl-phone"
              type="tel"
              className={fieldClass}
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            {errors.phone ? <p className="mt-1 text-xs text-red-300">{errors.phone}</p> : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dl-rubro" className={labelClass}>
              Tipo de negocio
            </label>
            <select
              id="dl-rubro"
              className={fieldClass}
              value={selectedRubro}
              onChange={(e) => onRubroChange(e.target.value as DemoLocalRubro)}
            >
              {DEMO_LOCAL_RUBROS.map((id) => (
                <option key={id} value={id}>
                  {DEMO_LOCAL_CATALOGS[id].label}
                </option>
              ))}
            </select>
            {errors.rubro ? <p className="mt-1 text-xs text-red-300">{errors.rubro}</p> : null}
          </div>
          <div>
            <label htmlFor="dl-city" className={labelClass}>
              Ciudad o colonia
            </label>
            <Input
              id="dl-city"
              className={fieldClass}
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            />
            {errors.city ? <p className="mt-1 text-xs text-red-300">{errors.city}</p> : null}
          </div>
        </div>
        <div>
          <label htmlFor="dl-note" className={labelClass}>
            Qué ofreces (opcional)
          </label>
          <Textarea
            id="dl-note"
            className={`${fieldClass} min-h-[88px]`}
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder={copy.form.notePlaceholder}
          />
          {errors.note ? <p className="mt-1 text-xs text-red-300">{errors.note}</p> : null}
        </div>
        <label htmlFor="dl-booking" className="flex items-start gap-3 text-sm text-slate-300">
          <input
            id="dl-booking"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10"
            checked={form.wantsBooking}
            onChange={(e) => setForm((prev) => ({ ...prev, wantsBooking: e.target.checked }))}
          />
          <span>{copy.form.bookingLabel}</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10"
            checked={form.consent}
            onChange={(e) => setForm((prev) => ({ ...prev, consent: e.target.checked }))}
          />
          <span>
            {copy.form.consent}{' '}
            <Link href={PRIVACY_PUBLIC_PATH} className="text-brand-300 underline-offset-2 hover:underline">
              {copy.form.privacy}
            </Link>
            {' · '}
            <Link href={TERMS_PUBLIC_PATH} className="text-brand-300 underline-offset-2 hover:underline">
              {copy.form.terms}
            </Link>
          </span>
        </label>
        {errors.consent ? <p className="text-xs text-red-300">{errors.consent}</p> : null}
        {errors.submit ? <p className="text-sm text-red-300">{errors.submit}</p> : null}
        <Button type="submit" disabled={isLoading} className="btn-shiny w-full bg-brand-500 hover:bg-brand-600">
          {isLoading ? copy.form.submitting : copy.form.submit}
        </Button>
      </form>
    </BorderBeam>
  )
}
