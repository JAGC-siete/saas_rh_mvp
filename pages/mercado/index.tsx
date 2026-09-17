/**
 * Home del directorio público. Shell: isPublicTenantLandingRoute (/mercado).
 * No usa AuthContext ni chrome de marketing de Humano SISU.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import MercadoPublicShell from '../../components/mercado/MercadoPublicShell'
import VendorCard from '../../components/mercado/VendorCard'
import { Input } from '../../components/ui/input'
import {
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_BLURB,
  VENDOR_CATEGORY_LABEL,
  isVendorCategory,
  type VendorCategory,
} from '../../lib/mercado/categories'
import {
  MERCADO_SEO,
  mercadoLocalBusinessJsonLd,
  previewVendorsByCategory,
} from '../../lib/mercado/home'
import { mercadoHomePath } from '../../lib/mercado/paths'
import type { PublicVendorCard } from '../../lib/mercado/schema'

interface MercadoHomeProps {
  vendors: PublicVendorCard[]
  category: VendorCategory | null
  query: string
}

export default function MercadoHomePage({ vendors, category, query }: MercadoHomeProps) {
  const router = useRouter()
  const [search, setSearch] = useState(query)

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

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery: Record<string, string> = {}
    if (category) nextQuery.categoria = category
    if (search.trim()) nextQuery.q = search.trim()
    void router.push({ pathname: mercadoHomePath(), query: nextQuery })
  }

  const jsonLd = mercadoLocalBusinessJsonLd()

  return (
    <>
      <Head>
        <title>{MERCADO_SEO.title}</title>
        <meta name="description" content={MERCADO_SEO.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={mercadoHomePath()} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={MERCADO_SEO.title} />
        <meta property="og:description" content={MERCADO_SEO.description} />
        <meta property="og:url" content={mercadoHomePath()} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>
      <MercadoPublicShell>
        <section className="bg-amber-950 px-4 py-16 text-amber-50 sm:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-amber-200">
              Siguatepeque, Comayagua
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Mercado Municipal Siguatepeque
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-amber-100">
              Directorio de puestos: comida, verduras, ropa y más. Buscá y escribile al vendedor.
            </p>
            <form onSubmit={onSearchSubmit} className="mx-auto mt-10 max-w-2xl" role="search">
              <label htmlFor="mercado-search" className="sr-only">
                ¿Qué buscas hoy?
              </label>
              <Input
                id="mercado-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="¿Qué buscas hoy?"
                className="h-16 rounded-xl border-amber-800 bg-white px-5 text-lg text-stone-900 placeholder:text-stone-400"
              />
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-stone-900">Categorías</h2>
            {category && (
              <Link href={mercadoHomePath()} className="text-sm text-amber-900 underline">
                Ver todas
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {VENDOR_CATEGORIES.map((key) => {
              const active = category === key
              return (
                <Link
                  key={key}
                  href={{ pathname: mercadoHomePath(), query: { categoria: key } }}
                  className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                    active
                      ? 'border-amber-800 bg-amber-50'
                      : 'border-stone-200 bg-white hover:border-amber-700'
                  }`}
                >
                  <p className="font-semibold text-stone-900">{VENDOR_CATEGORY_LABEL[key]}</p>
                  <p className="mt-1 text-sm text-stone-500">{VENDOR_CATEGORY_BLURB[key]}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="mb-6 text-2xl font-semibold text-stone-900">
            {category ? VENDOR_CATEGORY_LABEL[category] : 'Puestos destacados'}
          </h2>
          {visible.length === 0 ? (
            <p className="rounded-xl border border-stone-200 bg-white px-4 py-10 text-center text-stone-500">
              No hay puestos que coincidan con esa búsqueda.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((vendor) => (
                <VendorCard key={vendor.slug} vendor={vendor} />
              ))}
            </div>
          )}
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
