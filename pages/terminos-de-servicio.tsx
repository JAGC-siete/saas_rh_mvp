import Head from 'next/head'
import Link from 'next/link'
import DemoFooter from '../components/DemoFooter'

export default function TerminosDeServicio() {
  return (
    <>
      <Head>
        <title>Términos de servicio - Humano SISU</title>
        <meta
          name="description"
          content="Términos de uso del sitio y del software Humano SISU (nómina y recursos humanos)."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://humanosisu.net/terminos-de-servicio" />
      </Head>

      <div className="min-h-screen bg-slate-900 text-white">
        <header className="border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link
              href="/"
              className="inline-flex items-center text-brand-400 hover:text-brand-300 transition-colors"
            >
              ← Volver al inicio
            </Link>
            <h1 className="text-3xl font-bold mt-4">Términos de servicio</h1>
            <p className="text-slate-400 mt-2">Última actualización: 15 de abril de 2026</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="prose prose-invert prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">1) Quién ofrece el servicio</h2>
              <p className="text-slate-300">
                <strong>Humano SISU</strong> es un software de gestión de recursos humanos y nómina orientado a empresas en{' '}
                <strong>Honduras</strong>. Contacto:{' '}
                <strong>jorgearturo@humanosisu.net</strong> | <strong>504 32226773</strong> (WhatsApp).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">2) Uso del sitio web</h2>
              <p className="text-slate-300 mb-4">
                Al navegar o enviar formularios aceptás usar el sitio de forma lícita. No está permitido intentar
                vulnerar la seguridad, sobrecargar los sistemas ni usar el servicio para fines ilícitos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">3) Cuenta, prueba y suscripción</h2>
              <p className="text-slate-300 mb-4">
                El acceso al producto puede incluir periodos de prueba o planes de pago según lo acordado al
                contratar. Las condiciones comerciales concretas (precio, facturación, renovación y baja) se
                confirman por escrito o por el flujo de contratación vigente en el momento de la contratación.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">4) Exactitud y cumplimiento normativo</h2>
              <p className="text-slate-300 mb-4">
                El software incorpora cálculos y flujos orientados a la normativa laboral y fiscal aplicable en
                Honduras según la configuración de tu empresa. La responsabilidad final sobre planillas,
                declaraciones y obligaciones ante autoridades sigue siendo de la empresa titular de los datos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">5) Disponibilidad y soporte</h2>
              <p className="text-slate-300">
                Nos esforzamos por mantener el servicio disponible y dar soporte en horario comercial. Pueden
                producirse interrupciones por mantenimiento o causas fuera de nuestro control razonable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">6) Limitación de responsabilidad</h2>
              <p className="text-slate-300">
                En la medida permitida por la ley aplicable, Humano SISU no será responsable por daños indirectos,
                lucro cesante o pérdidas derivadas del uso o la imposibilidad de uso del software, salvo dolo o
                culpa grave demostrable. Este texto es orientativo y no sustituye asesoría legal.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">7) Datos personales</h2>
              <p className="text-slate-300">
                El tratamiento de datos personales se describe en la{' '}
                <Link href="/politicadeprivacidad" className="text-brand-400 hover:text-brand-300 underline">
                  Política de privacidad
                </Link>
                .
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">8) Cambios</h2>
              <p className="text-slate-300">
                Podemos actualizar estos términos. Publicaremos la fecha de última actualización; el uso continuado
                del sitio tras cambios relevantes puede implicar su aceptación según la ley aplicable.
              </p>
            </section>
          </div>
        </main>

        <DemoFooter />
      </div>
    </>
  )
}
