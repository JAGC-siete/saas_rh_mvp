import type { PublicVendorCard } from './schema'

/** Canal de reserva del directorio mientras el puesto no publica el número del locatario. */
export const MERCADO_DIRECTORY_WHATSAPP = '50432226773'

export function vendorWhatsAppDigits(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, '')
  if (digits.length === 8) return `504${digits}`
  return digits
}

export function vendorReservationMessage(
  vendor: Pick<PublicVendorCard, 'name' | 'stallLocation' | 'products'>
): string {
  const stall = vendor.stallLocation ? ` Quiero reservar para recoger en ${vendor.stallLocation}.` : ''
  const products = vendor.products.length > 0 ? ` Me interesa: ${vendor.products.join(', ')}.` : ''
  return `Hola, vi tu puesto ${vendor.name} en el Mercado Municipal San Pablo.${stall}${products}`
}

export function vendorWhatsAppHref(whatsapp: string, vendorName: string): string {
  const digits = vendorWhatsAppDigits(whatsapp)
  const text = encodeURIComponent(
    `Hola, vi tu puesto ${vendorName} en el Mercado Municipal San Pablo.`
  )
  return `https://wa.me/${digits}?text=${text}`
}

export function vendorReservationHref(
  vendor: Pick<PublicVendorCard, 'name' | 'stallLocation' | 'products' | 'whatsapp'>,
  directoryWhatsApp = MERCADO_DIRECTORY_WHATSAPP
): string {
  const digits = vendorWhatsAppDigits(vendor.whatsapp ?? directoryWhatsApp)
  return `https://wa.me/${digits}?text=${encodeURIComponent(vendorReservationMessage(vendor))}`
}
