import type { PublicVendorCard } from './schema'
import type { VendorCategory } from './categories'

export const MERCADO_SEO = {
  title: 'Mercado Municipal Siguatepeque | Directorio de puestos',
  description:
    'Buscá comida, ropa, verduras y más en el Mercado Municipal de Siguatepeque, Comayagua. Directorio de puestos con WhatsApp y ubicación en el pasillo.',
  city: 'Siguatepeque',
  region: 'Comayagua',
  country: 'HN',
  addressLine: 'Mercado Municipal, centro de Siguatepeque, Comayagua, Honduras',
} as const

/**
 * Catálogo de arranque para pintar Home y perfiles hasta que el admin publique filas en `vendors`.
 * No son números de WhatsApp reales.
 */
export const MERCADO_HOME_PREVIEW_VENDORS: PublicVendorCard[] = [
  {
    slug: 'comedor-el-patio',
    name: 'Comedor El Patio',
    category: 'comida',
    description: 'Comida corrida, caldo de res y tortillas hechas al momento. Pasillo de comedores.',
    whatsapp: null,
    logoUrl: null,
    stallLocation: 'Pasillo 1, local 8',
    hoursNote: 'Lun–Sáb 6:00–15:00',
    featured: true,
  },
  {
    slug: 'verduras-dona-marta',
    name: 'Verduras Doña Marta',
    category: 'verduras',
    description: 'Hortaliza fresca del día: tomate, chile, cilantro y papa de la zona.',
    whatsapp: null,
    logoUrl: null,
    stallLocation: 'Pasillo de verduras, mesa 14',
    hoursNote: 'Lun–Sáb 5:30–14:00',
    featured: true,
  },
  {
    slug: 'frutas-don-chepe',
    name: 'Frutas Don Chepe',
    category: 'frutas',
    description: 'Banano, piña, sandía y fruta de temporada según cosecha.',
    whatsapp: null,
    logoUrl: null,
    stallLocation: 'Pasillo de frutas, mesa 3',
    hoursNote: 'Lun–Sáb 5:30–14:00',
    featured: true,
  },
  {
    slug: 'carniceria-la-esquina',
    name: 'Carnicería La Esquina',
    category: 'carnes',
    description: 'Res y cerdo para el almuerzo. Pedidos del día, temprano.',
    whatsapp: null,
    logoUrl: null,
    stallLocation: 'Ala de carnes, local 2',
    hoursNote: 'Lun–Sáb 6:00–13:00',
    featured: true,
  },
  {
    slug: 'ropa-pasillo-central',
    name: 'Ropa Pasillo Central',
    category: 'ropa',
    description: 'Ropa de uso diario, uniformes escolares y telas por yarda.',
    whatsapp: null,
    logoUrl: null,
    stallLocation: 'Pasillo central, local 21',
    hoursNote: 'Lun–Sáb 8:00–16:00',
    featured: true,
  },
  {
    slug: 'abarrotes-el-ahorro',
    name: 'Abarrotes El Ahorro',
    category: 'abarrotes',
    description: 'Granos, aceite, detergente y productos secos para la casa.',
    whatsapp: null,
    logoUrl: null,
    stallLocation: 'Pasillo 4, local 5',
    hoursNote: 'Lun–Sáb 7:00–17:00',
    featured: true,
  },
]

export function previewVendorsByCategory(category?: VendorCategory | null): PublicVendorCard[] {
  if (!category) return MERCADO_HOME_PREVIEW_VENDORS
  return MERCADO_HOME_PREVIEW_VENDORS.filter((vendor) => vendor.category === category)
}

export function findPreviewVendor(slug: string): PublicVendorCard | null {
  const normalized = slug.toLowerCase().trim()
  return MERCADO_HOME_PREVIEW_VENDORS.find((vendor) => vendor.slug === normalized) ?? null
}

export function mercadoLocalBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Mercado Municipal Siguatepeque',
    description: MERCADO_SEO.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Mercado Municipal',
      addressLocality: MERCADO_SEO.city,
      addressRegion: MERCADO_SEO.region,
      addressCountry: MERCADO_SEO.country,
    },
    url: '/mercado',
  }
}
