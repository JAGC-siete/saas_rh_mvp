/**
 * Meta Pixel ID — mismo valor en _document (base + PageView), browser events y CAPI.
 * Override: META_PIXEL_ID o NEXT_PUBLIC_META_PIXEL_ID (Railway / .env).
 */
export const DEFAULT_META_PIXEL_ID = '1167705867436827'

export function resolveMetaPixelId(): string {
  return (
    process.env['META_PIXEL_ID']?.trim() ||
    process.env['NEXT_PUBLIC_META_PIXEL_ID']?.trim() ||
    DEFAULT_META_PIXEL_ID
  )
}
