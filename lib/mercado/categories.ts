export const VENDOR_CATEGORIES = [
  'comida',
  'verduras',
  'frutas',
  'carnes',
  'granos',
  'abarrotes',
  'ropa',
  'calzado',
  'artesanias',
  'servicios',
  'otros',
] as const

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number]

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  comida: 'Comida',
  verduras: 'Verduras',
  frutas: 'Frutas',
  carnes: 'Carnes',
  granos: 'Granos',
  abarrotes: 'Abarrotes',
  ropa: 'Ropa',
  calzado: 'Calzado',
  artesanias: 'Artesanías',
  servicios: 'Servicios',
  otros: 'Otros',
}

export const VENDOR_CATEGORY_BLURB: Record<VendorCategory, string> = {
  comida: 'Comedores, antojitos y comida corrida',
  verduras: 'Hortalizas frescas del día',
  frutas: 'Fruta de temporada',
  carnes: 'Carnicerías y pollerías',
  granos: 'Maíz, frijol, arroz y semilla',
  abarrotes: 'Abarrotes y productos secos',
  ropa: 'Ropa y textiles',
  calzado: 'Zapatos y reparación',
  artesanias: 'Hecho a mano',
  servicios: 'Servicios dentro del mercado',
  otros: 'Otros puestos',
}

export function isVendorCategory(value: unknown): value is VendorCategory {
  return typeof value === 'string' && (VENDOR_CATEGORIES as readonly string[]).includes(value)
}
