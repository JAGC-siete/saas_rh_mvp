import Link from 'next/link'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { Card, CardContent } from '../components/ui/card'
import { useLandingPreferences } from '../components/landing/LandingPreferencesProvider'
import { getLegalCopy } from '../lib/i18n/landings/legal'
import { generateBreadcrumbListSchema, generateWebPageSchema } from '../lib/seo/schema'
import { PRIVACY_PUBLIC_PATH, TERMS_PUBLIC_PATH } from '../lib/marketing/legal-paths'

export default function TerminosDeServicio() {
  const { locale, href } = useLandingPreferences()
  const copy = getLegalCopy(locale).terms

  const webPageSchema = generateWebPageSchema({
    url: href(TERMS_PUBLIC_PATH),
    title: copy.metaTitle,
    description: copy.metaDescription,
    inLanguage: locale === 'en' ? 'en' : 'es-HN',
  })
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: copy.breadcrumbHome, url: href('/') },
    { name: copy.breadcrumbLabel, url: href(TERMS_PUBLIC_PATH) },
  ])

  return (
    <PublicPageShell>
      <PublicPageHead title={copy.metaTitle} description={copy.metaDescription} canonicalPath={TERMS_PUBLIC_PATH} />
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
                      <strong>Humano SISU</strong> es un software de gestión de recursos humanos y nómina orientado a
                      empresas en <strong>El Salvador, Guatemala y Honduras</strong>. Contacto:{' '}
                      <strong>humanosisu@humanosisu.net</strong> | <strong>504 32226773</strong> (WhatsApp).
                    </>
                  )}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[1]}</h2>
                <p className="text-slate-300 mb-4">
                  Al navegar o enviar formularios aceptás usar el sitio de forma lícita. No está permitido intentar
                  vulnerar la seguridad, sobrecargar los sistemas ni usar el servicio para fines ilícitos.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[2]}</h2>
                <p className="text-slate-300 mb-4">
                  El acceso al producto puede incluir periodos de prueba o planes de pago según lo acordado al
                  contratar. Las condiciones comerciales concretas (precio, facturación, renovación y baja) se
                  confirman por escrito o por el flujo de contratación vigente en el momento de la contratación.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[3]}</h2>
                <p className="text-slate-300 mb-4">
                  El software incorpora cálculos y flujos orientados a la normativa laboral y fiscal aplicable en la
                  normativa del país configurado en tu empresa (El Salvador, Guatemala u Honduras). La responsabilidad
                  final sobre planillas, declaraciones y obligaciones ante autoridades sigue siendo de la empresa
                  titular de los datos.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[4]}</h2>
                <p className="text-slate-300">
                  Nos esforzamos por mantener el servicio disponible y dar soporte en horario comercial. Pueden
                  producirse interrupciones por mantenimiento o causas fuera de nuestro control razonable.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[5]}</h2>
                <p className="text-slate-300">
                  En la medida permitida por la ley aplicable, Humano SISU no será responsable por daños indirectos,
                  lucro cesante o pérdidas derivadas del uso o la imposibilidad de uso del software, salvo dolo o culpa
                  grave demostrable. Este texto es orientativo y no sustituye asesoría legal.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[6]}</h2>
                <p className="text-slate-300">
                  El tratamiento de datos personales se describe en la{' '}
                  <Link href={href(PRIVACY_PUBLIC_PATH)} className="text-brand-400 hover:text-brand-300 underline">
                    {locale === 'en' ? 'Privacy Policy' : 'Política de privacidad'}
                  </Link>
                  .
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4">{copy.headings[7]}</h2>
                <p className="text-slate-300">
                  Podemos actualizar estos términos. Publicaremos la fecha de última actualización; el uso continuado
                  del sitio tras cambios relevantes puede implicar su aceptación según la ley aplicable.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  )
}
