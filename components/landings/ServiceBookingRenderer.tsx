/**
 * Motor de reserva para rubros Service: cromado persistente, menú con precios,
 * widget de 3 pasos, equipo, prueba social y barra móvil de Reservar.
 * Lo dispara un hero.layout === 'booking'.
 */

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { callHref, mapsHref, resolveCta } from '../../lib/landings/cta'
import {
  collectServiceOptions,
  groupServiceItems,
  type ServiceMenuItem,
} from '../../lib/landings/service-booking'
import { landingThemeCssVars } from '../../lib/landings/theme-css'
import { cn } from '../../lib/utils'
import type { LandingBlock, LandingPageBusiness, PublicLandingPage } from '../../types/landing'
import LandingLeadForm from './LandingLeadForm'
import styles from './service-booking.module.css'

interface ServiceBookingRendererProps {
  page: PublicLandingPage
}

type BlockOf<K extends LandingBlock['kind']> = Extract<LandingBlock, { kind: K }>

export default function ServiceBookingRenderer({ page }: ServiceBookingRendererProps) {
  const { theme, business, blocks } = page.content
  const visible = blocks.filter((block) => block.visible)
  const hero = visible.find((block): block is BlockOf<'hero'> => block.kind === 'hero')
  const gallery = visible.find((block): block is BlockOf<'gallery'> => block.kind === 'gallery')
  const process = visible.find((block): block is BlockOf<'benefits'> => block.kind === 'benefits')
  const menus = visible.filter((block): block is BlockOf<'items'> => block.kind === 'items')
  const booking = visible.find((block): block is BlockOf<'leadForm'> => block.kind === 'leadForm')
  const team = visible.find((block): block is BlockOf<'team'> => block.kind === 'team')
  const testimonials = visible.find(
    (block): block is BlockOf<'testimonials'> => block.kind === 'testimonials'
  )
  const faq = visible.find((block): block is BlockOf<'faq'> => block.kind === 'faq')
  const hours = visible.find((block): block is BlockOf<'hours'> => block.kind === 'hours')
  const contact = visible.find((block): block is BlockOf<'contact'> => block.kind === 'contact')
  const cierre = visible.find((block): block is BlockOf<'cta'> => block.kind === 'cta')

  const services = useMemo(() => collectServiceOptions(page.content), [page.content])
  const [selectedService, setSelectedService] = useState('')

  const leadFormAnchor = booking?.id ?? 'reserva'
  const dark = theme.tone === 'dark'
  const call = callHref(business)
  const maps = mapsHref(business)
  const primary = hero ? resolveCta(hero.primaryCta, business, leadFormAnchor) : null
  const secondary = hero?.secondaryCta ? resolveCta(hero.secondaryCta, business, leadFormAnchor) : null
  const reserveHref = `#${leadFormAnchor}`
  const instagram = business.socials.instagram

  function reserveService(name: string) {
    setSelectedService(name)
    const node = document.getElementById(leadFormAnchor)
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className={cn(styles.shell, theme.font === 'serif' ? 'font-serif' : 'font-sans', dark && styles.shellDark)}
      style={landingThemeCssVars(theme) as CSSProperties}
    >
      <div className={styles.stickyChrome}>
        <header className={styles.header}>
          <a href="#hero" className={styles.brand}>
            {business.name}
          </a>
          <nav className={styles.headerNav} aria-label="Secciones">
            <a href="#servicios">Servicios</a>
            {team ? <a href="#equipo">Equipo</a> : null}
            {instagram ? (
              <a href={instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            ) : null}
            {maps ? (
              <a href={maps} target="_blank" rel="noopener noreferrer">
                Cómo llegar
              </a>
            ) : null}
          </nav>
          <a href={reserveHref} className={styles.headerCta}>
            {hero?.primaryCta.label || 'Reservar cita'}
          </a>
        </header>
      </div>

      <main>
        {hero ? (
          <section
            id="hero"
            className={styles.hero}
            style={hero.imageUrl ? { backgroundImage: `url(${hero.imageUrl})` } : undefined}
          >
            <div className={styles.heroInner}>
              {hero.badge ? <p className={styles.heroBadge}>{hero.badge}</p> : null}
              <h1 className={styles.heroTitle}>{hero.headline}</h1>
              {hero.subheadline ? <p className={styles.heroLead}>{hero.subheadline}</p> : null}
              <div className={styles.heroCtas}>
                {primary ? (
                  <a
                    href={primary.href}
                    className={styles.ctaSolid}
                    {...(primary.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {primary.label}
                  </a>
                ) : null}
                {secondary ? (
                  <a
                    href={secondary.href}
                    className={styles.ctaGhost}
                    {...(secondary.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {secondary.label}
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {gallery ? (
          <Section id={gallery.id} title={gallery.title}>
            <div className={styles.gallery}>
              {gallery.images.map((image) => (
                <img key={image.url} src={image.url} alt={image.alt} loading="lazy" />
              ))}
            </div>
          </Section>
        ) : null}

        {process ? (
          <Section id={process.id} title={process.title}>
            <div className={styles.process}>
              {process.items.map((item) => (
                <article key={item.mark} className={styles.processCard}>
                  <span>{item.mark}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </Section>
        ) : null}

        {menus.map((menu) => (
          <Section key={menu.id} id={menu.id} title={menu.title} subtitle={menu.subtitle}>
            <MenuBlock
              items={menu.items}
              grouped={menu.items.some((item) => item.category)}
              onReserve={reserveService}
            />
          </Section>
        ))}

        {booking ? (
          <Section id={booking.id} title={booking.title} subtitle={booking.subtitle}>
            <div className={styles.bookingCard}>
              <LandingLeadForm
                block={booking}
                slug={page.slug}
                services={services}
                selectedService={selectedService}
                onSelectedService={setSelectedService}
              />
            </div>
          </Section>
        ) : null}

        {team ? (
          <Section id={team.id} title={team.title} subtitle={team.subtitle}>
            <div className={styles.team}>
              {team.items.map((member) => (
                <article key={member.name} className={styles.teamCard}>
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt={member.name} loading="lazy" />
                  ) : (
                    <div className={styles.teamInitial} aria-hidden>
                      {member.name.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <h3>{member.name}</h3>
                    <p className={styles.teamRole}>{member.role}</p>
                    {member.bio ? <p className={styles.teamBio}>{member.bio}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </Section>
        ) : null}

        {testimonials ? (
          <Section id={testimonials.id} title={testimonials.title}>
            <div className={styles.quotes}>
              {testimonials.items.map((item) => (
                <blockquote key={item.author}>
                  <p>“{item.quote}”</p>
                  <footer>
                    {item.author}
                    {item.role ? <span> · {item.role}</span> : null}
                  </footer>
                </blockquote>
              ))}
            </div>
          </Section>
        ) : null}

        {faq ? (
          <Section id={faq.id} title={faq.title}>
            <div className={styles.faq}>
              {faq.items.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </Section>
        ) : null}

        {hours ? (
          <Section id={hours.id} title={hours.title}>
            <dl className={styles.hours}>
              {hours.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            {hours.note ? <p className={styles.note}>{hours.note}</p> : null}
          </Section>
        ) : null}

        {contact ? (
          <ContactSection block={contact} business={business} call={call} maps={maps} />
        ) : null}

        {cierre ? <CierreBlock block={cierre} business={business} leadFormAnchor={leadFormAnchor} /> : null}
      </main>

      <footer className={styles.footer}>
        <p>
          {business.name}
          {business.city ? ` · ${business.city}` : ''}
        </p>
        {call ? <a href={call}>Llamar</a> : null}
        {maps ? (
          <a href={maps} target="_blank" rel="noopener noreferrer">
            Maps
          </a>
        ) : null}
      </footer>

      <div className={styles.dock}>
        {call ? (
          <a href={call} className={styles.dockGhost}>
            Llamar
          </a>
        ) : null}
        <a href={reserveHref} className={styles.dockSolid}>
          Reservar ahora
        </a>
      </div>
    </div>
  )
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string
  title?: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={styles.section}>
      {title ? <h2>{title}</h2> : null}
      {subtitle ? <p className={styles.sectionLead}>{subtitle}</p> : null}
      {children}
    </section>
  )
}

function MenuBlock({
  items,
  grouped,
  onReserve,
}: {
  items: ServiceMenuItem[]
  grouped: boolean
  onReserve: (name: string) => void
}) {
  const groups = grouped ? groupServiceItems(items) : [{ category: null, items: [...items] }]
  return (
    <div className={styles.menuGroups}>
      {groups.map((group) => (
        <div key={group.category ?? 'menu'}>
          {group.category ? <h3 className={styles.menuCategory}>{group.category}</h3> : null}
          <div className={styles.menuGrid}>
            {group.items.map((item) => (
              <article key={item.name} className={styles.menuCard}>
                <div className={styles.menuHead}>
                  <h4>{item.name}</h4>
                  {item.priceLabel ? <span>{item.priceLabel}</span> : null}
                </div>
                {item.detail ? <p>{item.detail}</p> : null}
                <button type="button" className={styles.menuReserve} onClick={() => onReserve(item.name)}>
                  Reservar este
                </button>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ContactSection({
  block,
  business,
  call,
  maps,
}: {
  block: BlockOf<'contact'>
  business: LandingPageBusiness
  call: string | null
  maps: string | null
}) {
  const whatsapp = resolveCta(
    { label: 'WhatsApp', action: 'whatsapp', message: 'Quiero reservar una cita.' },
    business,
    null
  )

  return (
    <Section id={block.id} title={block.title} subtitle={block.note}>
      <dl className={styles.contact}>
        {block.showWhatsapp && whatsapp && business.whatsapp ? (
          <div>
            <dt>WhatsApp</dt>
            <dd>
              <a href={whatsapp.href} target="_blank" rel="noopener noreferrer">
                {business.whatsapp}
              </a>
            </dd>
          </div>
        ) : null}
        {block.showPhone && business.phone && call ? (
          <div>
            <dt>Teléfono</dt>
            <dd>
              <a href={call}>{business.phone}</a>
            </dd>
          </div>
        ) : null}
        {block.showEmail && business.email ? (
          <div>
            <dt>Correo</dt>
            <dd>
              <a href={`mailto:${business.email}`}>{business.email}</a>
            </dd>
          </div>
        ) : null}
        {block.showAddress && business.address ? (
          <div>
            <dt>Dirección</dt>
            <dd>
              {maps ? (
                <a href={maps} target="_blank" rel="noopener noreferrer">
                  {business.address}
                </a>
              ) : (
                business.address
              )}
            </dd>
          </div>
        ) : null}
        {block.showMap && maps ? (
          <div>
            <dt>Mapa</dt>
            <dd>
              <a href={maps} target="_blank" rel="noopener noreferrer">
                Abrir en Google Maps
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </Section>
  )
}

function CierreBlock({
  block,
  business,
  leadFormAnchor,
}: {
  block: BlockOf<'cta'>
  business: LandingPageBusiness
  leadFormAnchor: string
}) {
  const resolved = resolveCta(block.primaryCta, business, leadFormAnchor)
  if (!resolved) return null
  return (
    <section id={block.id} className={styles.section}>
      <div className={styles.cierre}>
        <h2>{block.headline}</h2>
        {block.subheadline ? <p>{block.subheadline}</p> : null}
        <a
          href={resolved.href}
          className={styles.ctaOnPrimary}
          {...(resolved.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {resolved.label}
        </a>
      </div>
    </section>
  )
}
