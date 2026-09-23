/**
 * Motor de visita física: mismo cromado y secciones que /mercadosanpablosiguav2.
 * Lo dispara un hero.layout === 'visit'. La búsqueda filtra áreas en el cliente.
 */

import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { mapsHref, resolveCta } from '../../lib/landings/cta'
import {
  retailAreasMatching,
  retailSearchHints,
  type RetailVisitArea,
} from '../../lib/landings/retail-visit'
import { PRIVACY_PUBLIC_PATH, TERMS_PUBLIC_PATH } from '../../lib/marketing/legal-paths'
import type { LandingBlock, LandingPageBusiness, PublicLandingPage } from '../../types/landing'
import styles from '../mercado/mercado.module.css'

interface RetailVisitRendererProps {
  page: PublicLandingPage
}

type BlockOf<K extends LandingBlock['kind']> = Extract<LandingBlock, { kind: K }>

export default function RetailVisitRenderer({ page }: RetailVisitRendererProps) {
  const { theme, business, blocks } = page.content
  const visible = blocks.filter((block) => block.visible)
  const hero = visible.find((block): block is BlockOf<'hero'> => block.kind === 'hero')
  const visit = visible.find((block): block is BlockOf<'visit'> => block.kind === 'visit')
  const hours = visible.find((block): block is BlockOf<'hours'> => block.kind === 'hours')
  const benefits = visible.find((block): block is BlockOf<'benefits'> => block.kind === 'benefits')
  const areasBlock = visible.find((block): block is BlockOf<'areas'> => block.kind === 'areas')

  const [query, setQuery] = useState('')
  const areas = areasBlock?.items ?? []
  const matched = useMemo(() => retailAreasMatching(areas, query), [areas, query])
  const hints = useMemo(() => (query ? retailSearchHints(areas, query) : []), [areas, query])

  const maps = mapsHref(business)
  const primary = hero ? resolveCta(hero.primaryCta, business, null) : null
  const secondary = hero?.secondaryCta ? resolveCta(hero.secondaryCta, business, null) : null
  const trustStrip = hours
    ? hours.rows.map((row) => `${row.label} ${row.value}`).join(' · ')
    : business.tagline || business.city || ''

  const themeVars = {
    ['--mercado-cacao']: theme.primary,
    ['--mercado-chile']: theme.accent,
    ['--mercado-papel']: theme.surface,
    ['--mercado-cream']: '#fffaf3',
  } as CSSProperties

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setQuery(String(data.get('q') || ''))
  }

  return (
    <div className={styles.shell} style={themeVars}>
      <div className={styles.stickyChrome}>
        {trustStrip ? (
          <div className={`${styles.trust} ${styles.trustOpen}`} role="status">
            {trustStrip}
          </div>
        ) : null}

        <header className={styles.header}>
          <div className={styles.headerRow}>
            <a href="#hero" className={styles.brand}>
              {business.name}
            </a>
            <nav className={`${styles.headerNav} ${styles.headerNavVisit}`} aria-label="Secciones de la visita">
              <a href="#encontraras" className={styles.headerNavLink}>
                Qué encontrarás
              </a>
              <a href="#horarios" className={styles.headerNavLink}>
                Horarios
              </a>
              <a href="#visita" className={styles.headerNavLink}>
                Cómo llegar
              </a>
            </nav>
          </div>
        </header>
      </div>

      <main>
        {hero ? (
          <section
            id="hero"
            className={`${styles.hero} ${styles.heroVisit}`}
            style={hero.imageUrl ? { backgroundImage: `url(${hero.imageUrl})` } : undefined}
          >
            <div className={styles.heroInner}>
              {hero.badge ? <p className={styles.heroEyebrow}>{hero.badge}</p> : null}
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
                  <a href={secondary.href} className={styles.ctaGhost}>
                    {secondary.label}
                  </a>
                ) : null}
              </div>
              {hero.searchPlaceholder ? (
                <form onSubmit={onSearch} className={styles.searchForm} role="search">
                  <label htmlFor={`retail-search-${page.slug}`} className="sr-only">
                    Buscar un área del local
                  </label>
                  <div className={styles.searchBar}>
                    <input
                      id={`retail-search-${page.slug}`}
                      name="q"
                      defaultValue={query}
                      placeholder={hero.searchPlaceholder}
                      autoComplete="off"
                      className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-base text-stone-900 outline-none placeholder:text-stone-400"
                    />
                    <button type="submit" className={styles.searchSubmit}>
                      {hero.searchSubmitLabel || 'Buscar área'}
                    </button>
                  </div>
                </form>
              ) : null}
              {hero.searchHint || hints.length > 0 ? (
                <p className="mt-3 text-xs" style={{ color: '#fed7aa' }}>
                  {hints.length > 0 ? hints.map((hint) => hint.label).join(' · ') : hero.searchHint}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {areasBlock ? (
          <AreasSection block={areasBlock} areas={matched} />
        ) : null}

        {hours ? (
          <section id="horarios" className={`${styles.v2Section} mx-auto max-w-6xl px-4 pt-10`}>
            <div className={styles.panelLocal}>
              <h2 className={styles.sectionTitle}>{hours.title}</h2>
              <table className={`${styles.hoursTable} mt-4 max-w-md`}>
                <caption className="sr-only">Horario de atención</caption>
                <tbody>
                  {hours.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hours.note ? (
                <p className="mt-3 text-sm" style={{ color: 'var(--mercado-muted)' }}>
                  {hours.note}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {benefits ? (
          <section id="beneficios" className={`${styles.v2Section} mx-auto max-w-6xl px-4 pt-12`}>
            <h2 className={styles.sectionTitle}>{benefits.title}</h2>
            <div className={`${styles.benefitGrid} mt-6`}>
              {benefits.items.map((item) => (
                <article key={item.mark} className={styles.benefitCard}>
                  <span className={styles.benefitIcon} aria-hidden>
                    {item.mark}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {visit ? (
          <section id="visita" className={`${styles.v2Section} mx-auto max-w-6xl px-4 py-12`}>
            <div className={`${styles.panelLocal} flex flex-col items-start gap-8 md:flex-row md:items-center`}>
              <div className="flex-1">
                <h2 className={styles.sectionTitle}>{visit.title}</h2>
                <p className="mt-4" style={{ color: 'var(--mercado-ink)' }}>
                  {visit.body}
                </p>
                {visit.geoLabel ? (
                  <p
                    className="mt-4 inline-block rounded-lg px-4 py-2 font-mono text-sm"
                    style={{ background: '#fff', color: 'var(--mercado-muted)' }}
                  >
                    {visit.geoLabel}
                  </p>
                ) : null}
                {business.address ? (
                  <p className="mt-3 text-sm" style={{ color: 'var(--mercado-muted)' }}>
                    {business.address}
                    {business.city ? `, ${business.city}` : ''}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  {maps ? (
                    <a href={maps} target="_blank" rel="noopener noreferrer" className={styles.ctaSolid}>
                      {visit.mapsCtaLabel}
                    </a>
                  ) : null}
                  <a href="#horarios" className={styles.ctaSolid}>
                    {visit.hoursCtaLabel}
                  </a>
                </div>
              </div>
              {maps ? (
                <a
                  href={maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-48 w-full items-center justify-center rounded-xl border text-center text-sm md:w-1/3"
                  style={{
                    borderColor: 'var(--mercado-line)',
                    background: '#fff',
                    color: 'var(--mercado-muted)',
                  }}
                >
                  {visit.mapPlaceholder || `Mapa: ${business.city || business.name}`}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>

      <RetailVisitFooter business={business} hours={hours} areas={areas} />
    </div>
  )
}

function AreasSection({
  block,
  areas,
}: {
  block: BlockOf<'areas'>
  areas: RetailVisitArea[]
}) {
  return (
    <section id="encontraras" className={`${styles.v2Section} mx-auto max-w-6xl px-4 pt-12`}>
      <h2 className={styles.sectionTitle}>{block.title}</h2>
      {block.subtitle ? (
        <p className="mt-3 max-w-3xl" style={{ color: 'var(--mercado-muted)' }}>
          {block.subtitle}
        </p>
      ) : null}
      {areas.length === 0 ? (
        <p
          className="mt-8 rounded-xl border px-4 py-10 text-center"
          style={{ borderColor: 'var(--mercado-line)', color: 'var(--mercado-muted)' }}
        >
          {block.emptyMessage || 'No hay un área que coincida con esa búsqueda.'}
        </p>
      ) : (
        <div className={`${styles.areaGrid} mt-8`}>
          {areas.map((area) => (
            <article key={area.id} id={area.id} className={`${styles.areaCard} ${styles.v2Section}`}>
              {area.imageUrl ? (
                <img
                  src={area.imageUrl}
                  alt={area.imageAlt || area.title}
                  className={styles.areaPhoto}
                  width={800}
                  height={480}
                />
              ) : null}
              <div className={styles.areaBody}>
                <p className={styles.areaAisle}>{area.aisle}</p>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
                <a href="#visita" className={styles.areaCta}>
                  {area.ctaLabel}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function RetailVisitFooter({
  business,
  hours,
  areas,
}: {
  business: LandingPageBusiness
  hours: BlockOf<'hours'> | undefined
  areas: RetailVisitArea[]
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <section>
          <h2 className={styles.footerHeading}>{hours?.title || 'Horario'}</h2>
          {hours ? (
            <table className={styles.hoursTable}>
              <caption className="sr-only">Horario de atención</caption>
              <tbody>
                {hours.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {business.address || business.city ? (
            <p className={styles.footerMuted}>
              {[business.address, business.city].filter(Boolean).join(', ')}.
              {mapsHref(business) ? (
                <>
                  {' '}
                  <a href={mapsHref(business)!} target="_blank" rel="noopener noreferrer">
                    Ver en Maps
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </section>

        {areas.length > 0 ? (
          <section>
            <h2 className={styles.footerHeading}>Áreas del local</h2>
            <ul className={styles.footerCats}>
              {areas.map((area) => (
                <li key={area.id}>
                  <a href={`#${area.id}`}>{area.title}</a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className={styles.footerHeading}>La visita</h2>
          <ul className={styles.footerList}>
            <li>
              <a href="#encontraras">Lo que encontrarás</a>
            </li>
            <li>
              <a href="#horarios">Horarios</a>
            </li>
            <li>
              <a href="#visita">Cómo llegar</a>
            </li>
          </ul>
        </section>
      </div>

      <div className={styles.footerTrust}>
        <p>
          Página del local. La compra se hace en el recinto, en cada área del negocio.
        </p>
        <p className={styles.footerLegal}>
          <a href={PRIVACY_PUBLIC_PATH}>Política de privacidad</a>
          <span aria-hidden> · </span>
          <a href={TERMS_PUBLIC_PATH}>Términos de servicio</a>
        </p>
        <p className={styles.footerMuted}>
          {business.name}
          {business.city ? `, ${business.city}` : ''}, Honduras.
        </p>
      </div>
    </footer>
  )
}
