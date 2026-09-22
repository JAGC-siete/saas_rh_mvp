/**
 * JSON-LD LocalBusiness para /p/[slug].
 * Se omite en páginas noindex (maquetas webycitas): no inflar el grafo con leads.
 */

import type { LandingTemplateKey, PublicLandingPage } from '../../types/landing'
import { landingPublicUrl } from './paths'
import { SEO_BASE_URL } from '../seo/assets'

const SCHEMA_TYPE: Record<LandingTemplateKey, string> = {
  papeleria: 'Store',
  barberia: 'HairSalon',
  salon_belleza: 'BeautySalon',
  spa: 'DaySpa',
  comercial: 'FurnitureStore',
  ferreteria: 'HardwareStore',
  mercadito: 'GroceryStore',
  supermercado: 'GroceryStore',
  clinica: 'MedicalClinic',
}

export function landingSchemaType(templateType: LandingTemplateKey): string {
  return SCHEMA_TYPE[templateType]
}

function digitsOnly(value: string | undefined): string {
  return (value || '').replace(/\D/g, '')
}

export function landingSchemaTelephone(phone?: string): string | undefined {
  const raw = digitsOnly(phone)
  if (raw.length < 8) return undefined
  return `+${raw.length === 8 ? `504${raw}` : raw}`
}

function absoluteAssetUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl) return undefined
  if (pathOrUrl.startsWith('https://')) return pathOrUrl
  if (pathOrUrl.startsWith('/')) return `${SEO_BASE_URL}${pathOrUrl}`
  return undefined
}

function firstImage(page: PublicLandingPage): string | undefined {
  if (page.content.meta.ogImageUrl) return absoluteAssetUrl(page.content.meta.ogImageUrl)
  for (const block of page.content.blocks) {
    if (block.kind === 'hero' && block.imageUrl) return absoluteAssetUrl(block.imageUrl)
    if (block.kind === 'gallery' && block.images[0]) return absoluteAssetUrl(block.images[0].url)
    if (block.kind === 'areas') {
      const photo = block.items.find((item) => item.imageUrl)
      if (photo?.imageUrl) return absoluteAssetUrl(photo.imageUrl)
    }
  }
  return undefined
}

export function landingLocalBusinessJsonLd(page: PublicLandingPage): Record<string, unknown> | null {
  if (page.content.meta.noindex) return null

  const { business, meta } = page.content
  const telephone = landingSchemaTelephone(business.phone || business.whatsapp)
  const image = firstImage(page)
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': landingSchemaType(page.templateType),
    name: business.name,
    url: landingPublicUrl(page.slug),
    description: meta.seoDescription,
  }

  if (telephone) jsonLd.telephone = telephone
  if (business.email) jsonLd.email = business.email
  if (image) jsonLd.image = image
  if (business.address || business.city) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      ...(business.address ? { streetAddress: business.address } : {}),
      ...(business.city ? { addressLocality: business.city } : {}),
      addressCountry: 'HN',
    }
  }

  const areas = page.content.blocks.find((block) => block.kind === 'areas')
  if (areas && areas.kind === 'areas') {
    jsonLd.containsPlace = areas.items.map((item) => ({
      '@type': 'Place',
      name: item.title,
      description: item.description,
    }))
  }

  return jsonLd
}
