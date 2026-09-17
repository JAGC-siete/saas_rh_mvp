import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import VendorWhatsAppButton from './VendorWhatsAppButton'
import { VENDOR_CATEGORY_LABEL, type VendorCategory } from '../../lib/mercado/categories'
import { mercadoVendorPath } from '../../lib/mercado/paths'
import { stallStatusLabel } from '../../lib/mercado/stall-status'
import type { PublicVendorCard } from '../../lib/mercado/schema'
import styles from './mercado.module.css'

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function VendorCard({ vendor }: { vendor: PublicVendorCard }) {
  const category = vendor.category as VendorCategory
  const status = stallStatusLabel({ category, hoursNote: vendor.hoursNote })
  const live = status.startsWith('Abierto') || status.startsWith('Recibiendo')

  return (
    <Card className={`${styles.vendorCard} group flex h-full flex-col border-stone-200 bg-white`}>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          {vendor.logoUrl ? (
            <img
              src={vendor.logoUrl}
              alt={vendor.name}
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-amber-400 ring-offset-2"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-900 ring-2 ring-amber-400 ring-offset-2"
            >
              {initials(vendor.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <Badge className="w-fit border-amber-800/20 bg-amber-50 text-amber-900">
                {VENDOR_CATEGORY_LABEL[category]}
              </Badge>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  live ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {status}
              </span>
            </div>
            <Link href={mercadoVendorPath(vendor.slug)} className="mt-2 block">
              <h3 className="text-xl font-semibold text-stone-900 group-hover:text-amber-800">{vendor.name}</h3>
            </Link>
          </div>
        </div>
        <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-stone-600">{vendor.description}</p>
        {vendor.stallLocation && (
          <p className="flex items-center gap-2 text-sm text-stone-500">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            {vendor.stallLocation}
          </p>
        )}
        <VendorWhatsAppButton vendor={vendor} />
      </CardContent>
    </Card>
  )
}
