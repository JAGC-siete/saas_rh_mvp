export function vendorWhatsAppDigits(whatsapp: string): string {
  return whatsapp.replace(/\D/g, '')
}

export function vendorWhatsAppHref(whatsapp: string, vendorName: string): string {
  const digits = vendorWhatsAppDigits(whatsapp)
  const text = encodeURIComponent(
    `Hola, vi tu puesto ${vendorName} en el Mercado Municipal San Pablo.`
  )
  return `https://wa.me/${digits}?text=${text}`
}
