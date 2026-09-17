/**
 * Perfil público de un puesto. SSR para SEO.
 * Shell: isPublicTenantLandingRoute (/mercado/[slug]).
 */

import Head from 'next/head'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import MercadoPublicShell from '../../components/mercado/MercadoPublicShell'
import { Badge } from '../../components/ui/badge'
import { VENDOR_CATEGORY_LABEL, type VendorCategory } from '../../lib/mercado/categories'
import { MERCADO_SEO, findPreviewVendor } from '../../lib/mercado/home'
import { mercadoVendorJsonLd, serializeJsonLd } from '../../lib/mercado/jsonld'
import {
  mercadoAssetUrl,
  mercadoVendorCanonical,
  mercadoVendorDescription,
  mercadoVendorTitle,
} from '../../lib/mercado/meta'
import { mercadoHomePath } from '../../lib/mercado/paths'
import type { PublicVendorCard } from '../../lib/mercado/schema'
import VendorWhatsAppButton from '../../components/mercado/VendorWhatsAppButton'

interface VendorProfileProps {
  vendor: PublicVendorCard
}

export default function MercadoVendorProfilePage({ vendor }: VendorProfileProps) {
  const categoryLabel = VENDOR_CATEGORY_LABEL[vendor.category as VendorCategory]
  const title = mercadoVendorTitle(vendor)
  const description = mercadoVendorDescription(vendor)
  const canonical = mercadoVendorCanonical(vendor.slug)
  const ogImage = mercadoAssetUrl(vendor.logoUrl)
  const jsonLd = mercadoVendorJsonLd(vendor)

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
        {ogImage && <meta property="og:image:alt" content={vendor.name} />}
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
        <article className="mx-auto max-w-3xl px-4 py-12">
          <Link href={mercadoHomePath()} className="text-sm text-amber-900 underline">
            Volver al directorio
          </Link>
          <div className="mt-6 flex items-start gap-5">
            {vendor.logoUrl && (
              <img
                src={vendor.logoUrl}
                alt={vendor.name}
                width={112}
                height={112}
                className="h-28 w-28 shrink-0 rounded-full object-cover ring-2 ring-amber-400 ring-offset-2"
              />
            )}
            <div>
              <Badge className="border-amber-800/20 bg-amber-50 text-amber-900">{categoryLabel}</Badge>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">{vendor.name}</h1>
              <p className="mt-4 text-lg text-stone-600">{vendor.description}</p>
            </div>
          </div>

          <div className="mt-8">
            {vendor.whatsapp ? (
              <VendorWhatsAppButton vendor={vendor} size="hero" />
            ) : (
              <p className="rounded-xl border border-stone-200 bg-white px-4 py-4 text-stone-600">
                Preguntá en el puesto. El WhatsApp se publica cuando el administrador lo carga.
              </p>
            )}
          </div>

          <h2 className="mt-10 text-xl font-semibold text-stone-900">Ubicación y horario</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <dt className="text-sm font-medium text-stone-500">Ubicación en el mercado</dt>
              <dd className="mt-1 text-stone-900">{vendor.stallLocation ?? MERCADO_SEO.addressLine}</dd>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <dt className="text-sm font-medium text-stone-500">Horario</dt>
              <dd className="mt-1 text-stone-900">{vendor.hoursNote ?? 'Horario del mercado'}</dd>
            </div>
          </dl>
        </article>
      </MercadoPublicShell>
    </>
  )
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const getServerSideProps: GetServerSideProps<VendorProfileProps> = async (ctx) => {
  const raw = ctx.params?.slug
  const slug = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase().trim() ?? ''

  if (!slug || !SLUG_PATTERN.test(slug) || slug.length > 63) {
    return { notFound: true }
  }

  const vendor = findPreviewVendor(slug)
  if (!vendor) {
    return { notFound: true }
  }

  ctx.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
  return { props: { vendor } }
}
