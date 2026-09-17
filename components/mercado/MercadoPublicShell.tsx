import Link from 'next/link'
import type { ReactNode } from 'react'
import { mercadoHomePath } from '../../lib/mercado/paths'
import { MERCADO_SEO } from '../../lib/mercado/home'

export default function MercadoPublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href={mercadoHomePath()} className="font-semibold tracking-tight text-stone-900">
            {MERCADO_SEO.name}
          </Link>
          <p className="hidden text-sm text-stone-500 sm:block">{MERCADO_SEO.addressLine}</p>
        </div>
      </header>
      <div className="bg-green-700 px-4 py-2 text-center text-sm font-medium text-white">
        {MERCADO_SEO.trustBanner}
      </div>
      <main>{children}</main>
      <footer className="mt-16 border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-stone-500">
          <p>{MERCADO_SEO.name}, {MERCADO_SEO.city}, {MERCADO_SEO.region}, Honduras.</p>
          <p className="mt-1">Horario típico: de madrugada a media tarde, de lunes a sábado.</p>
        </div>
      </footer>
    </div>
  )
}
