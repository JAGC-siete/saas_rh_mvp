/**
 * Home del directorio público. Shell: isPublicTenantLandingRoute (/mercadosanpablosigua).
 * No usa AuthContext ni chrome de marketing de Humano SISU.
 * No pisa pages/index.tsx.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { Search } from 'lucide-react'
import MercadoPublicShell from '../../components/mercado/MercadoPublicShell'
import { MercadoInscriptionBanner } from '../../components/mercado/InscriptionCta'
import VendorCard from '../../components/mercado/VendorCard'
import {
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_BLURB,
  VENDOR_CATEGORY_LABEL,
  isVendorCategory,
  type VendorCategory,
} from '../../lib/mercado/categories'
import {
  MERCADO_GEO,
  MERCADO_SEO,
  mercadoSearchHints,
  previewVendorsByCategory,
} from '../../lib/mercado/home'
import { mercadoShoppingCenterJsonLd, serializeJsonLd } from '../../lib/mercado/jsonld'
import {
  mercadoAssetUrl,
  mercadoCategoryTitle,
  mercadoHomeCanonical,
  mercadoHomeDescription,
  mercadoHomeTitle,
} from '../../lib/mercado/meta'
import { mercadoHomePath, mercadoVendorPath } from '../../lib/mercado/paths'
import type { PublicVendorCard } from '../../lib/mercado/schema'

interface MercadoHomeProps {
  vendors: PublicVendorCard[]
  category: VendorCategory | null
  query: string
}

export default function MercadoHomePage({ vendors, category, query }: MercadoHomeProps) {
  const router = useRouter()
  const [search, setSearch] = useState(query)
  const [hintsOpen, setHintsOpen] = useState(false)

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return vendors
    return vendors.filter((vendor) => {
      const haystack = [
        vendor.name,
        vendor.description,
        VENDOR_CATEGORY_LABEL[vendor.category],
        vendor.stallLocation ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [vendors, search])

  const hints = useMemo(() => mercadoSearchHints(search), [search])

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHintsOpen(false)
    const nextQuery: Record<string, string> = {}
    if (category) nextQuery.categoria = category
    if (search.trim()) nextQuery.q = search.trim()
    void router.push({ pathname: mercadoHomePath(), query: nextQuery })
  }

  const title = category ? mercadoCategoryTitle(category) : mercadoHomeTitle()
  const description = mercadoHomeDescription()
  const canonical = mercadoHomeCanonical()
  const ogImage = mercadoAssetUrl(MERCADO_SEO.heroImage)
  const jsonLd = mercadoShoppingCenterJsonLd(vendors)

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
        {ogImage && <meta property="og:image:alt" content={MERCADO_SEO.name} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      </Head>
      <MercadoPublicShell>
        <section
          className="relative overflow-hidden px-4 py-16 text-center sm:py-24"
          style={{
            backgroundColor: '#c2410c',
            backgroundImage: `linear-gradient(180deg, rgba(124,45,18,0.78), rgba(194,65,12,0.82)), url(${MERCADO_SEO.heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="relative mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#ffedd5' }}>
              Siguatepeque, Comayagua
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: '#fff' }}>
              {MERCADO_SEO.name}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg sm:text-xl" style={{ color: '#fff7ed' }}>
              {MERCADO_SEO.tagline}
            </p>
            <form
              onSubmit={onSearchSubmit}
              className="relative mx-auto mt-10 max-w-2xl"
              role="search"
            >
              <div className="flex items-center overflow-hidden rounded-full bg-white p-1 shadow-lg">
                <Search className="ml-4 h-6 w-6 shrink-0 text-stone-400" aria-hidden />
                <label htmlFor="mercado-search" className="sr-only">
                  ¿De qué tienes ganas hoy?
                </label>
                <input
                  id="mercado-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setHintsOpen(true)
                  }}
                  onFocus={() => setHintsOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setHintsOpen(false), 120)
                  }}
                  placeholder="¿De qué tienes ganas hoy? Caldo, tomate, carnita…"
                  className="h-14 min-w-0 flex-1 border-0 bg-transparent px-4 text-lg text-stone-800 shadow-none ring-0 placeholder:text-stone-400 focus:border-0 focus:outline-none focus:ring-0"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={hintsOpen && hints.length > 0}
                  aria-controls="mercado-search-hints"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full px-6 py-3 font-semibold text-white"
                  style={{ backgroundColor: '#d97706' }}
                >
                  Buscar
                </button>
              </div>
              {hintsOpen && hints.length > 0 && (
                <ul
                  id="mercado-search-hints"
                  role="listbox"
                  className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-amber-100 bg-white text-left shadow-xl"
                >
                  {hints.map((hint) => (
                    <li key={hint.label} role="option">
                      <Link
                        href={mercadoVendorPath(hint.slug)}
                        className="block px-5 py-3 text-sm text-stone-800 hover:bg-amber-50"
                      >
                        {hint.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-stone-800">Categorías</h2>
            {category && (
              <Link href={mercadoHomePath()} className="text-sm text-amber-800 underline">
                Ver todas
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {VENDOR_CATEGORIES.map((key) => {
              const active = category === key
              return (
                <Link
                  key={key}
                  href={{ pathname: mercadoHomePath(), query: { categoria: key } }}
                  className={`rounded-xl border bg-white px-5 py-5 text-left transition-colors ${
                    active
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-stone-100 hover:border-amber-200'
                  }`}
                >
                  <p className="font-bold text-stone-900">{VENDOR_CATEGORY_LABEL[key]}</p>
                  <p className="mt-1 text-sm text-stone-500">{VENDOR_CATEGORY_BLURB[key]}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="mb-6 text-2xl font-bold text-stone-800">
            {category ? VENDOR_CATEGORY_LABEL[category] : 'Puestos destacados'}
          </h2>
          {visible.length === 0 ? (
            <p className="rounded-xl border border-stone-200 bg-white px-4 py-10 text-center text-stone-500">
              No hay puestos que coincidan con esa búsqueda.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((vendor) => (
                <VendorCard key={vendor.slug} vendor={vendor} />
              ))}
            </div>
          )}
        </section>

        <MercadoInscriptionBanner />

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex flex-col items-start gap-8 rounded-2xl border border-amber-100 bg-amber-50 p-8 md:flex-row md:items-center">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-stone-800">¿Cómo llegar al mercado?</h2>
              <p className="mt-4 text-stone-700">{MERCADO_GEO.howToArrive}</p>
              <p className="mt-4 inline-block rounded-lg bg-white px-4 py-2 font-mono text-sm text-stone-600">
                {MERCADO_GEO.label}
              </p>
              <div className="mt-4">
                <a
                  href={MERCADO_GEO.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#d97706' }}
                >
                  Abrir en Google Maps
                </a>
              </div>
            </div>
            <a
              href={MERCADO_GEO.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-48 w-full items-center justify-center rounded-xl border border-amber-200 bg-white text-center text-sm text-stone-500 md:w-1/3"
            >
              Mapa: {MERCADO_GEO.landmark}
            </a>
          </div>
        </section>
      </MercadoPublicShell>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<MercadoHomeProps> = async (ctx) => {
  const rawCategory = typeof ctx.query.categoria === 'string' ? ctx.query.categoria : ''
  const category = isVendorCategory(rawCategory) ? rawCategory : null
  const query = typeof ctx.query.q === 'string' ? ctx.query.q : ''

  const vendors = previewVendorsByCategory(category)

  ctx.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')

  return {
    props: {
      vendors,
      category,
      query,
    },
  }
}
