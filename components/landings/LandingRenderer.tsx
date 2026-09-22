/**
 * Motor de render: recorre content.blocks y dibuja cada bloque con Tailwind.
 *
 * El tema del tenant se inyecta como variables CSS en el contenedor, así los
 * componentes de components/ui/* se reutilizan sin arrastrar los colores de nuestra marca.
 * Las imágenes vienen de URLs del tenant y se pintan con <img> porque next/image
 * exigiría declarar cada dominio en next.config.js.
 */

import React, { type CSSProperties, type ReactNode } from 'react'
import { Card } from '../ui/card'
import { resolveCta } from '../../lib/landings/cta'
import { heroCopyClass, heroLayoutClass, landingThemeCssVars } from '../../lib/landings/theme-css'
import { cn } from '../../lib/utils'
import LandingLeadForm from './LandingLeadForm'
import RetailVisitRenderer from './RetailVisitRenderer'
import ServiceBookingRenderer from './ServiceBookingRenderer'
import { isRetailVisitContent } from '../../lib/landings/retail-visit'
import { isServiceBookingContent } from '../../lib/landings/service-booking'
import type { LandingBlock, LandingCta, LandingPageBusiness, PublicLandingPage } from '../../types/landing'

interface LandingRendererProps {
  page: PublicLandingPage
}

type BlockOf<K extends LandingBlock['kind']> = Extract<LandingBlock, { kind: K }>

interface BlockContext {
  business: LandingPageBusiness
  leadFormAnchor: string | null
  slug: string
}

export default function LandingRenderer({ page }: LandingRendererProps) {
  if (isRetailVisitContent(page.content)) {
    return <RetailVisitRenderer page={page} />
  }
  if (isServiceBookingContent(page.content)) {
    return <ServiceBookingRenderer page={page} />
  }

  const { theme, business, blocks } = page.content
  const visible = blocks.filter((block) => block.visible)
  const leadFormAnchor = visible.find((block) => block.kind === 'leadForm')?.id ?? null
  const dark = theme.tone === 'dark'

  const context: BlockContext = { business, leadFormAnchor, slug: page.slug }

  return (
    <div
      className={[
        'min-h-screen',
        theme.font === 'serif' ? 'font-serif' : 'font-sans',
        dark ? 'text-white' : 'text-slate-900',
      ].join(' ')}
      style={landingThemeCssVars(theme) as CSSProperties}
    >
      {visible.map((block) => (
        <BlockSwitch key={block.id} block={block} context={context} dark={dark} />
      ))}
      <LandingFooter business={business} dark={dark} />
    </div>
  )
}

function BlockSwitch({
  block,
  context,
  dark,
}: {
  block: LandingBlock
  context: BlockContext
  dark: boolean
}) {
  switch (block.kind) {
    case 'hero':
      return <HeroBlock block={block} context={context} />
    case 'items':
      return <ItemsBlock block={block} dark={dark} />
    case 'gallery':
      return <GalleryBlock block={block} />
    case 'text':
      return <TextBlock block={block} />
    case 'hours':
      return <HoursBlock block={block} dark={dark} />
    case 'testimonials':
      return <TestimonialsBlock block={block} dark={dark} />
    case 'faq':
      return <FaqBlock block={block} dark={dark} />
    case 'leadForm':
      return <LeadFormBlock block={block} context={context} />
    case 'contact':
      return <ContactBlock block={block} context={context} dark={dark} />
    case 'cta':
      return <CtaBlock block={block} context={context} />
    case 'visit':
      return null
    case 'benefits':
      return <BenefitsBlock block={block} dark={dark} />
    case 'areas':
      return null
    case 'team':
      return <TeamBlock block={block} dark={dark} />
    default:
      return null
  }
}

/* ----------------------------- primitivas ----------------------------- */

function Section({
  id,
  children,
  className = '',
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('px-5 py-12 sm:px-8 sm:py-16', className)}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 max-w-2xl text-sm opacity-80 sm:text-base">{subtitle}</p>}
    </header>
  )
}

function CtaLink({
  cta,
  context,
  variant,
}: {
  cta: LandingCta
  context: BlockContext
  variant: 'primary' | 'secondary'
}) {
  const resolved = resolveCta(cta, context.business, context.leadFormAnchor)
  if (!resolved) return null

  const base =
    'inline-flex h-11 items-center justify-center rounded-lp px-6 text-sm font-semibold transition-opacity hover:opacity-90'
  const styles =
    variant === 'primary'
      ? 'bg-lp-primary text-white'
      : 'border border-lp-accent bg-transparent text-lp-accent'

  return (
    <a
      href={resolved.href}
      className={`${base} ${styles}`}
      {...(resolved.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {resolved.label}
    </a>
  )
}

/* ------------------------------- bloques ------------------------------ */

function HeroBlock({ block, context }: { block: BlockOf<'hero'>; context: BlockContext }) {
  const hasImage = Boolean(block.imageUrl)
  return (
    <Section id={block.id} className="py-16 md:py-24">
      <div className={heroLayoutClass(block.imageUrl)}>
        <div className={heroCopyClass(block.imageUrl)}>
          {block.badge && (
            <span className="inline-block rounded-full bg-lp-accent px-3 py-1 text-xs font-semibold text-slate-900">
              {block.badge}
            </span>
          )}
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">{block.headline}</h1>
          {block.subheadline && <p className="text-lg opacity-85">{block.subheadline}</p>}
          <div className={`flex flex-wrap gap-3 ${hasImage ? '' : 'justify-center'}`}>
            <CtaLink cta={block.primaryCta} context={context} variant="primary" />
            {block.secondaryCta && (
              <CtaLink cta={block.secondaryCta} context={context} variant="secondary" />
            )}
          </div>
        </div>
        {hasImage && block.imageUrl ? (
          <div className="relative h-64 overflow-hidden rounded-lp md:h-96">
            <img
              src={block.imageUrl}
              alt={context.business.name}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        ) : null}
      </div>
    </Section>
  )
}

function ItemsBlock({ block, dark }: { block: BlockOf<'items'>; dark: boolean }) {
  const grid = block.layout === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'

  return (
    <Section id={block.id}>
      <SectionTitle title={block.title} subtitle={block.subtitle} />
      <div className={grid}>
        {block.items.map((item, index) => (
          <Card
            key={`${block.id}-${index}`}
            variant="solid"
            className={`rounded-lp ${dark ? 'border-white/10 bg-white/5 text-white shadow-none' : ''}`}
          >
            <div className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">{item.name}</p>
                {item.detail && <p className="mt-1 text-sm opacity-75">{item.detail}</p>}
              </div>
              {item.priceLabel && (
                <span className="whitespace-nowrap text-sm font-bold text-lp-primary">
                  {item.priceLabel}
                </span>
              )}
            </div>
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
            )}
          </Card>
        ))}
      </div>
    </Section>
  )
}

function GalleryBlock({ block }: { block: BlockOf<'gallery'> }) {
  return (
    <Section id={block.id}>
      {block.title && <SectionTitle title={block.title} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {block.images.map((image, index) => (
          <img
            key={`${block.id}-${index}`}
            src={image.url}
            alt={image.alt}
            className="h-48 w-full rounded-lp object-cover"
            loading="lazy"
          />
        ))}
      </div>
    </Section>
  )
}

function TextBlock({ block }: { block: BlockOf<'text'> }) {
  return (
    <Section id={block.id}>
      {block.title && <SectionTitle title={block.title} />}
      <p className="max-w-3xl whitespace-pre-line text-base leading-relaxed opacity-90">{block.body}</p>
    </Section>
  )
}

function HoursBlock({ block, dark }: { block: BlockOf<'hours'>; dark: boolean }) {
  return (
    <Section id={block.id}>
      <SectionTitle title={block.title} />
      <dl className={`max-w-xl divide-y ${dark ? 'divide-white/10' : 'divide-slate-200'}`}>
        {block.rows.map((row, index) => (
          <div key={`${block.id}-${index}`} className="flex items-center justify-between py-3">
            <dt className="text-sm font-medium">{row.label}</dt>
            <dd className="text-sm opacity-80">{row.value}</dd>
          </div>
        ))}
      </dl>
      {block.note && <p className="mt-4 text-xs opacity-70">{block.note}</p>}
    </Section>
  )
}

function TestimonialsBlock({ block, dark }: { block: BlockOf<'testimonials'>; dark: boolean }) {
  return (
    <Section id={block.id}>
      <SectionTitle title={block.title} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {block.items.map((item, index) => (
          <blockquote
            key={`${block.id}-${index}`}
            className={`rounded-lp border p-5 ${dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}
          >
            <p className="text-sm italic opacity-90">“{item.quote}”</p>
            <footer className="mt-3 text-xs font-semibold">
              {item.author}
              {item.role && <span className="font-normal opacity-70"> · {item.role}</span>}
            </footer>
          </blockquote>
        ))}
      </div>
    </Section>
  )
}

function FaqBlock({ block, dark }: { block: BlockOf<'faq'>; dark: boolean }) {
  return (
    <Section id={block.id}>
      <SectionTitle title={block.title} />
      <div className="max-w-3xl space-y-3">
        {block.items.map((item, index) => (
          <details
            key={`${block.id}-${index}`}
            className={`rounded-lp border p-4 ${dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}
          >
            <summary className="cursor-pointer text-sm font-semibold">{item.question}</summary>
            <p className="mt-2 text-sm opacity-80">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}

function LeadFormBlock({ block, context }: { block: BlockOf<'leadForm'>; context: BlockContext }) {
  return (
    <Section id={block.id} className="scroll-mt-8">
      <div className="mx-auto max-w-xl">
        <SectionTitle title={block.title} subtitle={block.subtitle} />
        <LandingLeadForm block={block} slug={context.slug} />
      </div>
    </Section>
  )
}

function ContactBlock({
  block,
  context,
  dark,
}: {
  block: BlockOf<'contact'>
  context: BlockContext
  dark: boolean
}) {
  const { business } = context
  const rows: Array<{ label: string; value: string; href?: string; external?: boolean }> = []

  if (block.showWhatsapp) {
    const whatsapp = resolveCta({ label: 'WhatsApp', action: 'whatsapp' }, business, null)
    if (whatsapp && business.whatsapp) {
      rows.push({ label: 'WhatsApp', value: business.whatsapp, href: whatsapp.href, external: true })
    }
  }
  if (block.showPhone && business.phone) {
    const call = resolveCta({ label: 'Llamar', action: 'call' }, business, null)
    rows.push({ label: 'Teléfono', value: business.phone, href: call?.href })
  }
  if (block.showEmail && business.email) {
    rows.push({ label: 'Correo', value: business.email, href: `mailto:${business.email}` })
  }
  if (block.showAddress && business.address) {
    const maps = resolveCta({ label: 'Ver en el mapa', action: 'maps' }, business, null)
    rows.push({
      label: 'Dirección',
      value: business.address,
      href: maps?.href,
      external: Boolean(maps),
    })
  }
  if (block.showMap) {
    const maps = resolveCta({ label: 'Ver en el mapa', action: 'maps' }, business, null)
    if (maps) rows.push({ label: 'Mapa', value: 'Ver en Google Maps', href: maps.href, external: true })
  }

  return (
    <Section id={block.id} className={dark ? 'bg-white/5' : 'bg-black/5'}>
      <SectionTitle title={block.title} subtitle={block.note} />
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="text-sm">
            <dt className="font-semibold">{row.label}</dt>
            <dd className="opacity-85">
              {row.href ? (
                <a
                  href={row.href}
                  className="underline decoration-lp-accent underline-offset-4"
                  {...(row.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function BenefitsBlock({ block, dark }: { block: BlockOf<'benefits'>; dark: boolean }) {
  return (
    <Section id={block.id}>
      <SectionTitle title={block.title} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {block.items.map((item) => (
          <article
            key={item.mark}
            className={`rounded-lp border p-5 ${dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}
          >
            <p className="text-xs font-bold text-lp-primary">{item.mark}</p>
            <h3 className="mt-1 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm opacity-80">{item.body}</p>
          </article>
        ))}
      </div>
    </Section>
  )
}

function TeamBlock({ block, dark }: { block: BlockOf<'team'>; dark: boolean }) {
  return (
    <Section id={block.id}>
      <SectionTitle title={block.title} subtitle={block.subtitle} />
      <div className="grid gap-4 sm:grid-cols-2">
        {block.items.map((member) => (
          <article
            key={member.name}
            className={`flex gap-4 rounded-lp border p-5 ${dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}
          >
            {member.imageUrl ? (
              <img
                src={member.imageUrl}
                alt={member.name}
                className="h-14 w-14 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lp-primary text-lg font-bold text-white">
                {member.name.slice(0, 1)}
              </div>
            )}
            <div>
              <p className="font-semibold">{member.name}</p>
              <p className="text-xs font-medium text-lp-primary">{member.role}</p>
              {member.bio ? <p className="mt-1 text-sm opacity-80">{member.bio}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}

function CtaBlock({ block, context }: { block: BlockOf<'cta'>; context: BlockContext }) {
  const resolved = resolveCta(block.primaryCta, context.business, context.leadFormAnchor)
  if (!resolved) return null

  return (
    <Section id={block.id}>
      <div className="rounded-lp bg-lp-primary px-6 py-10 text-center text-white">
        <h2 className="text-2xl font-bold sm:text-3xl">{block.headline}</h2>
        {block.subheadline && <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90">{block.subheadline}</p>}
        <div className="mt-6 flex justify-center">
          <a
            href={resolved.href}
            className="inline-flex h-11 items-center justify-center rounded-lp bg-white px-6 text-sm font-semibold text-lp-primary transition-opacity hover:opacity-90"
            {...(resolved.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {resolved.label}
          </a>
        </div>
      </div>
    </Section>
  )
}

function LandingFooter({ business, dark }: { business: LandingPageBusiness; dark: boolean }) {
  const socials = [
    business.socials.instagram ? { label: 'Instagram', href: business.socials.instagram } : null,
    business.socials.facebook ? { label: 'Facebook', href: business.socials.facebook } : null,
    business.socials.tiktok ? { label: 'TikTok', href: business.socials.tiktok } : null,
  ].filter((item): item is { label: string; href: string } => item !== null)

  return (
    <footer className={`border-t px-5 py-8 text-xs sm:px-8 ${dark ? 'border-white/10' : 'border-black/10'}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 opacity-75">
        <p>
          {business.name}
          {business.city && ` · ${business.city}`}
        </p>
        {socials.length > 0 && (
          <nav className="flex gap-4">
            {socials.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">
                {social.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  )
}
