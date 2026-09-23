import type { ReactNode } from 'react'
import MercadoV2Footer from './MercadoV2Footer'
import { mercadoV2HomePath } from '../../lib/mercado/paths'
import { MERCADO_V2_SEO } from '../../lib/mercado/v2'
import styles from './mercado.module.css'

function homeAnchor(hash: string) {
  return `${mercadoV2HomePath()}#${hash}`
}

const NAV = [
  { href: homeAnchor('encontraras'), label: 'Qué encontrarás' },
  { href: homeAnchor('horarios'), label: 'Horarios' },
  { href: homeAnchor('visita'), label: 'Cómo llegar' },
] as const

export default function MercadoV2Shell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.stickyChrome}>
        <div className={`${styles.trust} ${styles.trustOpen}`} role="status">
          Lun–Sáb 5:00 AM – 4:00 PM · Domingo 6:00 AM – 12:00 PM
        </div>

        <header className={styles.header}>
          <div className={styles.headerRow}>
            <a href={mercadoV2HomePath()} className={styles.brand}>
              {MERCADO_V2_SEO.name}
            </a>

            <nav className={`${styles.headerNav} ${styles.headerNavVisit}`} aria-label="Secciones de la visita">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} className={styles.headerNavLink}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
      </div>

      <main>{children}</main>
      <MercadoV2Footer />
    </div>
  )
}
