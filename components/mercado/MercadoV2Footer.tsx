import { MERCADO_GEO, MERCADO_SEO } from '../../lib/mercado/home'
import { MERCADO_HOURS_ROWS } from '../../lib/mercado/market-hours'
import { MERCADO_V2_AREAS, MERCADO_V2_COPY } from '../../lib/mercado/v2'
import { mercadoInscriptionPath, mercadoV2HomePath } from '../../lib/mercado/paths'
import { PRIVACY_PUBLIC_PATH, TERMS_PUBLIC_PATH } from '../../lib/marketing/legal-paths'
import styles from './mercado.module.css'

export default function MercadoV2Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <section>
          <h2 className={styles.footerHeading}>Horario del mercado</h2>
          <table className={styles.hoursTable}>
            <caption className="sr-only">Horario oficial del Mercado Municipal San Pablo</caption>
            <tbody>
              {MERCADO_HOURS_ROWS.map((row) => (
                <tr key={row.days}>
                  <th scope="row">{row.days}</th>
                  <td>{row.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.footerMuted}>
            {MERCADO_SEO.addressLine}.{' '}
            <a href={MERCADO_GEO.mapsUrl} target="_blank" rel="noopener noreferrer">
              Ver en Maps
            </a>
          </p>
        </section>

        <section>
          <h2 className={styles.footerHeading}>Áreas del recinto</h2>
          <ul className={styles.footerCats}>
            {MERCADO_V2_AREAS.map((area) => (
              <li key={area.id}>
                <a href={`${mercadoV2HomePath()}#${area.id}`}>{area.title}</a>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={styles.footerHeading}>El recinto</h2>
          <ul className={styles.footerList}>
            <li>
              <a href={`${mercadoV2HomePath()}#encontraras`}>Lo que encontrarás</a>
            </li>
            <li>
              <a href={`${mercadoV2HomePath()}#horarios`}>Horarios</a>
            </li>
            <li>
              <a href={`${mercadoV2HomePath()}#beneficios`}>Por qué venir</a>
            </li>
            <li>
              <a href={`${mercadoV2HomePath()}#visita`}>Cómo llegar</a>
            </li>
          </ul>
        </section>
      </div>

      <div className={styles.footerTrust}>
        <p>
          Página institucional del Mercado Municipal San Pablo. La compra se hace en el recinto, en
          cada área del mercado.
        </p>
        <p className={styles.footerLegal}>
          <a href={PRIVACY_PUBLIC_PATH}>Política de privacidad</a>
          <span aria-hidden> · </span>
          <a href={TERMS_PUBLIC_PATH}>Términos de servicio</a>
          <span aria-hidden> · </span>
          <a href={mercadoInscriptionPath()} className={styles.locatariosLink}>
            {MERCADO_V2_COPY.locatariosPortal}
          </a>
        </p>
        <p className={styles.footerMuted}>
          {MERCADO_SEO.name}, {MERCADO_SEO.city}, {MERCADO_SEO.region}, Honduras.
        </p>
      </div>
    </footer>
  )
}
