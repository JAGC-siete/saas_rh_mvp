import { VENTAS_BRAND } from './brand-styles'

/** PDF palette — mirrors institutional email blocks. */
export const VENTAS_PDF_THEME = {
  ...VENTAS_BRAND,
  textLight: '#94a3b8',
  white: '#ffffff',
} as const

/** Unified PDF type scale (Helvetica family only). */
export const PDF_TYPE = {
  brand: 20,
  ref: 8.5,
  section: 9,
  label: 7,
  value: 9,
  body: 8,
  price: 20,
  savings: 8,
  footnote: 6.5,
  bankMono: 8,
} as const
