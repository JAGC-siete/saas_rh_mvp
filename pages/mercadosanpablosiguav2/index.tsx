/**
 * Landing institucional v2: visita física al Mercado San Pablo.
 * Sin directorio de puestos, sin WhatsApp de locatario, sin inscripción en el cuerpo.
 * Shell: isPublicTenantLandingRoute (/mercadosanpablosiguav2).
 */

import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import MercadoV2Shell from '../../components/mercado/MercadoV2Shell'
import styles from '../../components/mercado/mercado.module.css'
import { MERCADO_GEO, MERCADO_SEO } from '../../lib/mercado/home'
import { MERCADO_HOURS_ROWS } from '../../lib/mercado/market-hours'
import { mercadoAssetUrl } from '../../lib/mercado/meta'
import { mercadoStaticSrc } from '../../lib/mercado/assets'
import { mercadoV2HomePath } from '../../lib/mercado/paths'
import {
  MERCADO_V2_AREAS,
  MERCADO_V2_BENEFITS,
  MERCADO_V2_COPY,
  MERCADO_V2_SEO,
  mercadoV2AreasMatching,
  mercadoV2HomeCanonical,
  mercadoV2SearchHints,
  serializeMercadoV2JsonLd,
} from '../../lib/mercado/v2'

type Props = { q: string; publicTenantLanding: true }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const raw = ctx.query.q
  const q = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] ?? '' : ''
  return { props: { q, publicTenantLanding: true } }
}

export default function MercadoV2HomePage({ q }: Props) {
  const areas = q ? mercadoV2AreasMatching(q) : MERCADO_V2_AREAS
  const hints = q ? mercadoV2SearchHints(q) : []
  const title = MERCADO_V2_SEO.title
  const description = MERCADO_V2_SEO.description
  const canonical = mercadoV2HomeCanonical()
  const ogImage = mercadoAssetUrl(MERCADO_V2_SEO.heroImage)
  const jsonLd = serializeMercadoV2JsonLd()

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_HN" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        {ogImage && <meta property="og:image:alt" content={MERCADO_V2_SEO.name} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </Head>
      <MercadoV2Shell>
        <section
          className={`${styles.hero} ${styles.heroVisit}`}
          style={{
            backgroundImage: `url(${mercadoStaticSrc(MERCADO_V2_SEO.heroImage)})`,
          }}
        >
          <div className={styles.heroInner}>
            <p className={styles.heroEyebrow}>Siguatepeque, Comayagua</p>
            <h1 className={styles.heroTitle}>{MERCADO_V2_COPY.h1}</h1>
            <p className={styles.heroLead}>{MERCADO_V2_SEO.heroLead}</p>
            <div className={styles.heroCtas}>
              <a href={`${mercadoV2HomePath()}#visita`} className={styles.ctaSolid}>
                {MERCADO_V2_COPY.mapsCta}
              </a>
              <a href={`${mercadoV2HomePath()}#horarios`} className={styles.ctaGhost}>
                {MERCADO_V2_COPY.hoursCta}
              </a>
            </div>
            <form action={mercadoV2HomePath()} method="get" className={styles.searchForm} role="search">
              <label htmlFor="mercado-v2-search" className="sr-only">
                Buscar un área o pasillo del mercado
              </label>
              <div className={styles.searchBar}>
                <input
                  id="mercado-v2-search"
                  name="q"
                  defaultValue={q}
                  placeholder={MERCADO_V2_COPY.searchPlaceholder}
                  autoComplete="off"
                  className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-base text-stone-900 outline-none placeholder:text-stone-400"
                />
                <button type="submit" className={styles.searchSubmit}>
                  Buscar área
                </button>
              </div>
            </form>
            <p className="mt-3 text-xs" style={{ color: '#fed7aa' }}>
              {hints.length > 0 ? hints.map((hint) => hint.label).join(' · ') : MERCADO_V2_COPY.searchHint}
            </p>
          </div>
        </section>

        <section id="visita" className={`${styles.v2Section} mx-auto max-w-6xl px-4 pt-12`}>
          <div className={`${styles.panelLocal} flex flex-col items-start gap-8 md:flex-row md:items-center`}>
            <div className="flex-1">
              <h2 className={styles.sectionTitle}>{MERCADO_V2_COPY.visitTitle}</h2>
              <p className="mt-4" style={{ color: 'var(--mercado-ink)' }}>
                {MERCADO_V2_COPY.visitBody}
              </p>
              <p
                className="mt-4 inline-block rounded-lg px-4 py-2 font-mono text-sm"
                style={{ background: '#fff', color: 'var(--mercado-muted)' }}
              >
                {MERCADO_GEO.label}
              </p>
              <p className="mt-3 text-sm" style={{ color: 'var(--mercado-muted)' }}>
                {MERCADO_SEO.addressLine}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={MERCADO_GEO.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.ctaSolid}
                >
                  {MERCADO_V2_COPY.mapsCta}
                </a>
                <a href={`${mercadoV2HomePath()}#horarios`} className={styles.ctaSolid}>
                  {MERCADO_V2_COPY.visitCta}
                </a>
              </div>
            </div>
            <a
              href={MERCADO_GEO.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-48 w-full items-center justify-center rounded-xl border text-center text-sm md:w-1/3"
              style={{
                borderColor: 'var(--mercado-line)',
                background: '#fff',
                color: 'var(--mercado-muted)',
              }}
            >
              Mapa: {MERCADO_GEO.landmark}
            </a>
          </div>
        </section>

        <section id="horarios" className={`${styles.v2Section} mx-auto max-w-6xl px-4 pt-10`}>
          <div className={styles.panelLocal}>
            <h2 className={styles.sectionTitle}>{MERCADO_V2_COPY.hoursTitle}</h2>
            <table className={`${styles.hoursTable} mt-4 max-w-md`}>
              <caption className="sr-only">Horario oficial del Mercado Municipal San Pablo</caption>
              <tbody>
                {MERCADO_HOURS_ROWS.map((row) => (
                  <tr key={row.days}>
                    <th scope="row">{row.days}</th>
                    <td>{row.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="beneficios" className={`${styles.v2Section} mx-auto max-w-6xl px-4 pt-12`}>
          <h2 className={styles.sectionTitle}>{MERCADO_V2_COPY.benefitsTitle}</h2>
          <div className={`${styles.benefitGrid} mt-6`}>
            {MERCADO_V2_BENEFITS.map((benefit) => (
              <article key={benefit.title} className={styles.benefitCard}>
                <span className={styles.benefitIcon} aria-hidden>
                  {benefit.mark}
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="encontraras" className={`${styles.v2Section} mx-auto max-w-6xl px-4 py-12`}>
          <h2 className={styles.sectionTitle}>{MERCADO_V2_COPY.findTitle}</h2>
          <p className="mt-3 max-w-3xl" style={{ color: 'var(--mercado-muted)' }}>
            {MERCADO_V2_COPY.findBody}
          </p>
          {areas.length === 0 ? (
            <p
              className="mt-8 rounded-xl border px-4 py-10 text-center"
              style={{ borderColor: 'var(--mercado-line)', color: 'var(--mercado-muted)' }}
            >
              No hay un área que coincida con esa búsqueda. Probá con sopa, tomate, carne o ropa.
            </p>
          ) : (
            <div className={`${styles.areaGrid} mt-8`}>
              {areas.map((area) => (
                <article key={area.id} id={area.id} className={`${styles.areaCard} ${styles.v2Section}`}>
                  <img
                    src={mercadoStaticSrc(area.image)}
                    alt={area.imageAlt}
                    className={styles.areaPhoto}
                    width={800}
                    height={480}
                  />
                  <div className={styles.areaBody}>
                    <p className={styles.areaAisle}>{area.aisle}</p>
                    <h3>{area.title}</h3>
                    <p>{area.description}</p>
                    <a href={`${mercadoV2HomePath()}#visita`} className={styles.areaCta}>
                      {area.cta}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </MercadoV2Shell>
    </>
  )
}
