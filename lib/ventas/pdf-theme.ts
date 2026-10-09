import { LIQUID } from '../brand/liquid-tokens'
import { VENTAS_BRAND } from './brand-styles'

/** PDF palette — mirrors liquid / ventas email blocks. */
export const VENTAS_PDF_THEME = {
  ...VENTAS_BRAND,
  textLight: LIQUID.textMuted,
  white: '#ffffff',
  headerBg: LIQUID.brand900,
  headerKicker: LIQUID.textAccent,
  headerMeta: LIQUID.textSoft,
} as const

/** Unified PDF type scale (Helvetica family only). */
export const PDF_TYPE = {
  brand: 11,
  title: 18,
  ref: 8.5,
  section: 10.5,
  label: 7,
  value: 9,
  body: 8,
  price: 22,
  savings: 8,
  footnote: 6.5,
  bankMono: 8,
} as const
