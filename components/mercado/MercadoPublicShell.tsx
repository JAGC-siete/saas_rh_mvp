import Link from 'next/link'
import type { ReactNode } from 'react'
import { useRouter } from 'next/router'
import { Nunito } from 'next/font/google'
import { MercadoInscriptionHeaderLink } from './InscriptionCta'
import { mercadoHomePath, mercadoInscriptionPath } from '../../lib/mercado/paths'
import { MERCADO_SEO } from '../../lib/mercado/home'
import styles from './mercado.module.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-mercado',
})

export default function MercadoPublicShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const showInscriptionLink = router.pathname !== mercadoInscriptionPath()

  return (
    <div className={`${nunito.variable} ${styles.shell}`}>
      <header className={styles.header}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href={mercadoHomePath()} className={styles.brand}>
            {MERCADO_SEO.name}
          </Link>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm sm:block" style={{ color: 'var(--mercado-muted)' }}>
              {MERCADO_SEO.addressLine}
            </p>
            {showInscriptionLink && <MercadoInscriptionHeaderLink />}
          </div>
        </div>
      </header>
      <div className={styles.trust}>{MERCADO_SEO.trustBanner}</div>
      <main>{children}</main>
      <footer
        className="mt-16 border-t"
        style={{ borderColor: 'var(--mercado-line)', background: 'var(--mercado-cream)' }}
      >
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm" style={{ color: 'var(--mercado-muted)' }}>
          <p>
            {MERCADO_SEO.name}, {MERCADO_SEO.city}, {MERCADO_SEO.region}, Honduras.
          </p>
          <p className="mt-1">Horario típico: de madrugada a media tarde, de lunes a sábado.</p>
        </div>
      </footer>
    </div>
  )
}
