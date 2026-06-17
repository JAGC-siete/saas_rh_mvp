import Head from 'next/head'
import PublicPageShell from '../components/landing/PublicPageShell'
import MailListSubscription from '../components/MailListSubscription'

export default function SuscripcionPage() {
  return (
    <PublicPageShell showSpotlight>
      <Head>
        <title>Suscripción de Correo | Humano SISU</title>
        <link rel="icon" href="/logo-humano-sisu.png" />
        <meta
          name="description"
          content="Liderazgo, Productividad y Cultura Laboral para PyMEs"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://humanosisu.net/suscripcion" />
      </Head>

      <section id="mail-list" className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-2">
            Liderazgo, Productividad y Cultura Laboral para PyMEs
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Únete a nuestra lista de correos y recibe estrategias prácticas para optimizar el tiempo de tu equipo, mejorar el clima laboral y modernizar la gestión de tu empresa. Ideas accionables para líderes que quieren crecer con orden y transparencia.
          </p>
          <div className="max-w-md mx-auto">
            <MailListSubscription source="suscripcion-page" />
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
