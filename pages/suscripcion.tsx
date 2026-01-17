import Head from 'next/head'
import dynamic from 'next/dynamic'
import MainHeader from '../components/MainHeader'
import MailListSubscription from '../components/MailListSubscription'
import DemoFooter from '../components/DemoFooter'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

export default function SuscripcionPage() {
  return (
    <div className="min-h-screen bg-app pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>Suscripción de Correo | Humano SISU</title>
        <link rel="icon" href="/logo-humano-sisu.png" />
        <meta
          name="description"
          content="Una subscripción de correo para personas que trabajan y/o estudian"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://humano-sisu.com/suscripcion" />
      </Head>

      {/* Header */}
      <MainHeader enableScrollEffect={true} fixed={true} />

      {/* Main Content - Matching MailListSection style */}
      <section id="mail-list" className="py-12 sm:py-16 md:py-20 bg-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-2">
            Una subscripción de correo para personas que trabajan y/o estudian
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Ideas de cambio para cambiar el entorno inmediato, reducir el ruido y tomar control del espacio propio desempeño sin esperar mejores pastores, politicos o presidentes. Exclusivo para personas que estudian y/o trabajan
          </p>
          <div className="max-w-md mx-auto">
            <MailListSubscription source="suscripcion-page" />
          </div>
        </div>
      </section>

      {/* Shared Cloud Background */}
      <CloudBackground />

      <DemoFooter />
    </div>
  )
}

