import Link from 'next/link'
import WhatsAppGlyph from './WhatsAppGlyph'
import { mercadoVendorPath } from '../../lib/mercado/paths'
import { vendorWhatsAppHref } from '../../lib/mercado/whatsapp'
import type { PublicVendorCard } from '../../lib/mercado/schema'
import styles from './mercado.module.css'

const cardClass =
  `${styles.waPulse} flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-base font-bold text-white shadow-md hover:bg-green-600`

const heroClass =
  'flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 text-lg font-bold text-white shadow-md hover:bg-green-600'

export default function VendorWhatsAppButton({
  vendor,
  size = 'card',
}: {
  vendor: PublicVendorCard
  size?: 'card' | 'hero'
}) {
  const className = size === 'hero' ? heroClass : cardClass
  const label = vendor.whatsapp ? 'Escribile por WhatsApp' : 'Escribile al vendedor'

  if (vendor.whatsapp) {
    return (
      <a
        href={vendorWhatsAppHref(vendor.whatsapp, vendor.name)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <WhatsAppGlyph className="h-6 w-6" />
        {label}
      </a>
    )
  }

  return (
    <Link href={mercadoVendorPath(vendor.slug)} className={className}>
      <WhatsAppGlyph className="h-6 w-6" />
      {label}
    </Link>
  )
}
