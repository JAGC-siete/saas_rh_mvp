import type { PublicVendorCard } from './schema'
import type { VendorCategory } from './categories'

export const MERCADO_SEO = {
  name: 'Mercado Municipal San Pablo',
  title: 'Mercado Municipal San Pablo | Verduras, Comida y Más en Siguatepeque',
  description:
    'Verduras frescas, comida corrida y más en el Mercado San Pablo, Siguatepeque. Buscá el puesto y escribile al vendedor.',
  city: 'Siguatepeque',
  region: 'Comayagua',
  country: 'HN',
  addressLine: 'A 100 metros de la Plaza la Amistad, Siguatepeque, Comayagua',
  tagline:
    'Todo lo fresco del Mercado San Pablo, directo a tu WhatsApp. Desde el caldo de res levantamuertos hasta la verdura recién cortada. ¿De qué tienes ganas hoy?',
  trustBanner: 'Apoyando el comercio local de Siguatepeque. Tradición que se reinventa para ti.',
  heroImage: '/mercado/pasillo-san-pablo.png',
} as const

/** 14° 35′ 52″ N, 87° 49′ 52″ O */
export const MERCADO_GEO = {
  label: '14° 35′ 52″ N, 87° 49′ 52″ O',
  latitude: 14.597778,
  longitude: -87.831111,
  landmark: 'Escenario al Aire Libre y Plaza la Amistad',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=14.597778%2C-87.831111',
  howToArrive:
    'El Mercado Municipal San Pablo está en el corazón comercial de Siguatepeque, a pasos del Escenario al Aire Libre y la Plaza la Amistad.',
} as const

/**
 * Catálogo de arranque para pintar Home y perfiles hasta que el admin publique filas en `vendors`.
 * WhatsApp queda null a propósito: no se inventan números.
 */
export const MERCADO_HOME_PREVIEW_VENDORS: PublicVendorCard[] = [
  {
    slug: 'comedor-el-patio',
    name: 'Comedor El Patio',
    category: 'comida',
    description:
      'Caldo de res hirviendo y tortillas que te queman las manos. Escríbele a Doña Carmen antes de que se acabe la olla.',
    whatsapp: null,
    logoUrl: '/mercado/dona-carmen.png',
    stallLocation: 'Pasillo 1, local 8',
    hoursNote: 'Lun–Sáb 6:00–15:00',
    featured: true,
  },
  {
    slug: 'verduras-dona-marta',
    name: 'Verduras Doña Marta',
    category: 'verduras',
    description:
      'Tomates rojitos, chiles vivos y el culantro para la sopa. Doña Marta te fía el tomate y te regala un ramito.',
    whatsapp: null,
    logoUrl: '/mercado/dona-marta.png',
    stallLocation: 'Pasillo de verduras, mesa 14',
    hoursNote: 'Lun–Sáb 5:30–14:00',
    featured: true,
  },
  {
    slug: 'frutas-don-chepe',
    name: 'Frutas Don Chepe',
    category: 'frutas',
    description:
      'Piña jugosa, banano madurito y sandía fría. Don Chepe te la corta ahí mismo, que se te haga agua la boca.',
    whatsapp: null,
    logoUrl: '/mercado/don-chepe.png',
    stallLocation: 'Pasillo de frutas, mesa 3',
    hoursNote: 'Lun–Sáb 5:30–14:00',
    featured: true,
  },
  {
    slug: 'carniceria-la-esquina',
    name: 'Carnicería La Esquina',
    category: 'carnes',
    description:
      'Cortes frescos para la carnita asada del domingo, directo del gancho. Pedí temprano que el lomo se va primero.',
    whatsapp: null,
    logoUrl: '/mercado/carniceria-la-esquina.png',
    stallLocation: 'Ala de carnes, local 2',
    hoursNote: 'Lun–Sáb 6:00–13:00',
    featured: true,
  },
  {
    slug: 'ropa-pasillo-central',
    name: 'Ropa Pasillo Central',
    category: 'ropa',
    description:
      'Uniformes que aguantan el recreo, telas por yarda y ropa de diario. Pasá, tocá la tela y preguntá el precio.',
    whatsapp: null,
    logoUrl: '/mercado/ropa-pasillo-central.png',
    stallLocation: 'Pasillo central, local 21',
    hoursNote: 'Lun–Sáb 8:00–16:00',
    featured: true,
  },
  {
    slug: 'abarrotes-el-ahorro',
    name: 'Abarrotes El Ahorro',
    category: 'abarrotes',
    description:
      'Frijol, arroz, aceite y el detergente del mes. Lo que te falta para la cocina, en un solo puesto.',
    whatsapp: null,
    logoUrl: '/mercado/abarrotes-el-ahorro.png',
    stallLocation: 'Pasillo 4, local 5',
    hoursNote: 'Lun–Sáb 7:00–17:00',
    featured: true,
  },
]

export const MERCADO_SEARCH_HINTS = [
  {
    needles: ['sop', 'sopa', 'mondongo', 'lety'],
    label: 'Sopa de mondongo donde Doña Lety (Quedan 3 platos)',
    slug: 'comedor-el-patio',
  },
  {
    needles: ['cald', 'caldo', 'res', 'carmen', 'tortilla'],
    label: 'Caldo de res hirviendo en El Patio — Doña Carmen',
    slug: 'comedor-el-patio',
  },
  {
    needles: ['tom', 'tomate', 'culantro', 'marta', 'chile', 'verdura'],
    label: 'Tomates rojitos de Doña Marta (recién cortados)',
    slug: 'verduras-dona-marta',
  },
  {
    needles: ['piña', 'pina', 'banano', 'sandia', 'sandía', 'fruta', 'chepe'],
    label: 'Piña y sandía fría con Don Chepe',
    slug: 'frutas-don-chepe',
  },
  {
    needles: ['carne', 'carnita', 'asada', 'lomo', 'cerdo'],
    label: 'Carnita asada del domingo, directo del gancho',
    slug: 'carniceria-la-esquina',
  },
] as const

export function mercadoSearchHints(query: string) {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return []
  return MERCADO_SEARCH_HINTS.filter((hint) =>
    hint.needles.some((token) => token.startsWith(needle) || needle.startsWith(token) || token.includes(needle))
  ).slice(0, 4)
}

export function previewVendorsByCategory(category?: VendorCategory | null): PublicVendorCard[] {
  if (!category) return MERCADO_HOME_PREVIEW_VENDORS
  return MERCADO_HOME_PREVIEW_VENDORS.filter((vendor) => vendor.category === category)
}

export function findPreviewVendor(slug: string): PublicVendorCard | null {
  const normalized = slug.toLowerCase().trim()
  return MERCADO_HOME_PREVIEW_VENDORS.find((vendor) => vendor.slug === normalized) ?? null
}
