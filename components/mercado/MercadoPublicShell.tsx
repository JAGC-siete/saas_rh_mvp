import Link from 'next/link'
import { useRouter } from 'next/router'
import { Nunito } from 'next/font/google'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { MercadoInscriptionHeaderLink } from './InscriptionCta'
import MercadoFooter from './MercadoFooter'
import MercadoHowItWorks from './MercadoHowItWorks'
import { marketOpenStatus } from '../../lib/mercado/market-hours'
import { mercadoHomePath, mercadoInscriptionPath } from '../../lib/mercado/paths'
import { MERCADO_SEO } from '../../lib/mercado/home'
import styles from './mercado.module.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-mercado',
})

function homeAnchor(hash: string) {
  return `${mercadoHomePath()}#${hash}`
}

export default function MercadoPublicShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const showInscriptionLink = router.pathname !== mercadoInscriptionPath()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(() => marketOpenStatus())

  useEffect(() => {
    setStatus(marketOpenStatus())
    const id = window.setInterval(() => setStatus(marketOpenStatus()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (typeof router.query.q === 'string') setQuery(router.query.q)
  }, [router.query.q])

  const nav = useMemo(
    () => [
      { href: homeAnchor('categorias'), label: 'Categorías' },
      { href: homeAnchor('puestos'), label: 'Puestos' },
      { href: homeAnchor('ubicacion'), label: 'Ubicación' },
    ],
    []
  )

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (query.trim()) next.q = query.trim()
    void router.push({ pathname: mercadoHomePath(), query: next, hash: 'puestos' })
  }

  return (
    <div className={`${nunito.variable} ${styles.shell}`}>
      <div className={styles.stickyChrome}>
        <div
          className={`${styles.trust} ${status.open ? styles.trustOpen : styles.trustClosed}`}
          role="status"
          aria-live="polite"
        >
          <span
            className={`${styles.statusDot} ${status.open ? styles.statusDotOpen : styles.statusDotClosed}`}
            aria-hidden
          />
          {status.label}
        </div>

        <header className={styles.header}>
          <div className={styles.headerRow}>
            <Link href={mercadoHomePath()} className={styles.brand}>
              {MERCADO_SEO.name}
            </Link>

            <nav className={styles.headerNav} aria-label="Secciones del directorio">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className={styles.headerNavLink}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className={styles.headerActions}>
              <MercadoHowItWorks />
              {showInscriptionLink ? <MercadoInscriptionHeaderLink /> : null}
            </div>
          </div>

          <form
            onSubmit={onSearchSubmit}
            className={styles.headerSearch}
            role="search"
            aria-label="Buscar en el mercado"
          >
            <Search className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
            <label htmlFor="mercado-header-search" className="sr-only">
              Buscar puestos o productos
            </label>
            <input
              id="mercado-header-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tomate, caldo, carnita…"
              className={styles.headerSearchInput}
              autoComplete="off"
            />
            <button type="submit" className={styles.headerSearchSubmit}>
              Buscar
            </button>
          </form>
        </header>
      </div>

      <main>{children}</main>
      <MercadoFooter />
    </div>
  )
}
