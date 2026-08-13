import Link from 'next/link'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { Card, CardContent } from '../components/ui/card'
import { useLandingPreferences } from '../components/landing/LandingPreferencesProvider'
import { getLegalCopy } from '../lib/i18n/landings/legal'
import { generateBreadcrumbListSchema, generateWebPageSchema } from '../lib/seo/schema'
import { PRIVACY_PUBLIC_PATH } from '../lib/marketing/legal-paths'

export default function PoliticaPrivacidad() {
  const { locale, href } = useLandingPreferences()
  const copy = getLegalCopy(locale).privacy

  const webPageSchema = generateWebPageSchema({
    url: href(PRIVACY_PUBLIC_PATH),
    title: copy.metaTitle,
    description: copy.metaDescription,
    inLanguage: locale === 'en' ? 'en' : 'es-HN',
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: copy.breadcrumbHome, url: href('/') },
    { name: copy.breadcrumbLabel, url: href(PRIVACY_PUBLIC_PATH) },
  ])

  return (
    <PublicPageShell>
      <PublicPageHead title={copy.metaTitle} description={copy.metaDescription} canonicalPath={PRIVACY_PUBLIC_PATH} />
      <SchemaMarkup schema={[webPageSchema, breadcrumbSchema]} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={href('/')}
          className="inline-flex items-center text-brand-400 hover:text-brand-300 transition-colors"
        >
          {copy.backHome}
        </Link>

        <Card variant="liquid" className="mt-6">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-white">{copy.title}</h1>
            <p className={`text-slate-400 mt-2 ${copy.authorityBanner ? 'mb-4' : 'mb-8'}`}>{copy.lastUpdated}</p>

            {copy.authorityBanner ? (
              <p
                className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                role="note"
              >
                {copy.authorityBanner}
              </p>
            ) : null}

            <div className="prose prose-invert prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[0]}</h2>
                <p className="text-slate-300">
                  {locale === 'en' ? (
                    copy.intro
                  ) : (
                    <>
                      <strong>Humano SISU</strong> (&quot;nosotros&quot;), con operación en{' '}
                      <strong>El Salvador, Guatemala y Honduras</strong>.
                      <br />
                      Contacto: <strong>humanosisu@humanosisu.net</strong> | <strong>504 32226773</strong>
                    </>
                  )}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[1]}</h2>
                <p className="text-slate-300 mb-4">Cuando completás formularios o nos escribís:</p>
                <ul className="text-slate-300 space-y-2">
                  <li>
                    • <strong>Identificación y contacto:</strong> nombre, email, teléfono, empresa, cargo.
                  </li>
                  <li>
                    • <strong>Mensajes y metadatos técnicos mínimos</strong> (IP, fecha/hora) para seguridad.
                  </li>
                </ul>
                <p className="text-slate-300 mt-4">
                  No pedimos datos sensibles. Si los incluyes voluntariamente, los borraremos salvo que sean
                  necesarios para atender tu solicitud.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[2]}</h2>
                <p className="text-slate-300">
                  Usamos tus datos <strong>solo para contactarte</strong> y dar seguimiento a tu solicitud: demos,
                  activación del sistema, soporte o envío puntual de la información que pediste.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[3]}</h2>
                <ul className="text-slate-300 space-y-2">
                  <li>
                    • <strong>Consentimiento</strong> (cuando marcás el checkbox/enviás el formulario).
                  </li>
                  <li>
                    • <strong>Interés legítimo</strong> en responder consultas y mantener la seguridad del servicio.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[4]}</h2>
                <p className="text-slate-300">
                  Guardamos tus datos <strong>hasta 12 meses</strong> desde el último contacto o{' '}
                  <strong>hasta que retires tu consentimiento</strong>, lo que ocurra primero. Podemos conservar
                  datos mínimos por más tiempo si una obligación legal lo exige (por ejemplo, registros de seguridad).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[5]}</h2>
                <p className="text-slate-300 mb-4">
                  No vendemos tus datos. Podemos usar proveedores para operar el servicio (p. ej., hosting, correo,
                  mensajería). Actúan como <strong>encargados de tratamiento</strong> y solo procesan datos según
                  nuestras instrucciones:
                </p>
                <ul className="text-slate-300 space-y-2">
                  <li>
                    • <strong>Infraestructura/hosting</strong> (p. ej., <strong>Supabase</strong>,{' '}
                    <strong>Railway</strong> u otros equivalentes).
                  </li>
                  <li>
                    • <strong>Correo transaccional</strong> (p. ej., <strong>Nodemailer/Resend</strong> u otro).
                  </li>
                  <li>
                    • <strong>Mensajería</strong> (p. ej., <strong>WhatsApp/WhatsApp Business API</strong> o
                    integraciones equivalentes).
                  </li>
                </ul>
                <p className="text-slate-300 mt-4">
                  Estos proveedores pueden estar ubicados fuera de tu país. En ese caso, adoptamos garantías
                  adecuadas (cláusulas contractuales tipo u otras medidas reconocidas por la normativa aplicable).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[6]}</h2>
                <p className="text-slate-300">
                  Usamos <strong>solo cookies técnicas</strong> necesarias para que el sitio funcione. No realizamos
                  publicidad conductual ni perfilado. Si más adelante incorporamos analítica, lo informaremos y
                  pediremos consentimiento.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[7]}</h2>
                <p className="text-slate-300 mb-4">
                  Podés ejercer <strong>acceso, rectificación, supresión, oposición, limitación y portabilidad</strong>
                  , además de <strong>retirar tu consentimiento</strong> en cualquier momento, escribiendo a{' '}
                  <strong>humanosisu@humanosisu.net</strong> con el asunto &quot;Derechos de datos – [tu nombre]&quot;.
                </p>
                <p className="text-slate-300">
                  También podés reclamar ante la autoridad de control competente conforme a las{' '}
                  <strong>leyes aplicables de protección de datos de El Salvador, Guatemala y/o Honduras</strong>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[8]}</h2>
                <p className="text-slate-300">
                  Aplicamos medidas técnicas y organizativas razonables (cifrado en tránsito, controles de acceso y
                  registro de eventos) para proteger tus datos.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[9]}</h2>
                <p className="text-slate-300">
                  Podemos actualizar esta política para reflejar mejoras o cambios legales. Publicaremos la fecha de
                  última actualización y, si el cambio es sustancial, te lo notificaremos por un medio razonable.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  )
}
