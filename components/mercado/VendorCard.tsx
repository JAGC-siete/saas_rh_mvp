import Link from 'next/link'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { VENDOR_CATEGORY_LABEL, type VendorCategory } from '../../lib/mercado/categories'
import { mercadoVendorPath } from '../../lib/mercado/paths'
import type { PublicVendorCard } from '../../lib/mercado/schema'

export default function VendorCard({ vendor }: { vendor: PublicVendorCard }) {
  return (
    <Link href={mercadoVendorPath(vendor.slug)} className="block h-full">
      <Card className="h-full border-stone-200 bg-white transition-colors hover:border-amber-700">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <Badge className="w-fit border-amber-800/20 bg-amber-50 text-amber-900">
            {VENDOR_CATEGORY_LABEL[vendor.category as VendorCategory]}
          </Badge>
          <h3 className="text-lg font-semibold text-stone-900">{vendor.name}</h3>
          <p className="line-clamp-3 flex-1 text-sm text-stone-600">{vendor.description}</p>
          {vendor.stallLocation && (
            <p className="text-sm text-stone-500">{vendor.stallLocation}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
