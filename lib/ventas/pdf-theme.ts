import { LIQUID } from '../brand/liquid-tokens'
import { VENTAS_BRAND } from './brand-styles'

/** PDF palette — mirrors liquid / ventas email blocks. */
export const VENTAS_PDF_THEME = {
  ...VENTAS_BRAND,
  textLight: LIQUID.textMuted,
  white: '#ffffff',
  headerBg: LIQUID.brand900,
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
