import Head from 'next/head'
import Link from 'next/link'
import { CheckCircleIcon, ClockIcon, CurrencyDollarIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { Card, CardContent } from '../components/ui/card'

export default function GraciasPage() {
  return (
    <div className="min-h-screen bg-app">
      <Head>
        <title>¡Gracias! - HUMANO SISU</title>
        <meta
          name="description"
          content="Tu solicitud ha sido recibida. Te contactaremos pronto."
        />
      </Head>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 mb-8">
            <CheckCircleIcon className="h-12 w-12 text-green-400" />
          </div>

          {/* Main Message */}
          <h1 className="text-4xl font-bold text-white mb-6">
            ¡Solicitud recibida! 🎉
          </h1>
          
          <p className="text-xl text-brand-300 mb-12">
            Hemos registrado tu interés en automatizar tu RH. Te contactaremos pronto.
          </p>

          {/* Next Steps */}
          <Card variant="glass" className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Próximos pasos:
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <PhoneIcon className="h-5 w-5 text-brand-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold mb-1">
                      Contacto en 2 horas
                    </h3>
                    <p className="text-brand-300">
                      Te llamaremos o escribiremos por WhatsApp para confirmar detalles
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-brand-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold mb-1">
                      Datos bancarios
                    </h3>
                    <p className="text-brand-300">
                      Te enviaremos la información para realizar el pago
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <ClockIcon className="h-5 w-5 text-brand-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold mb-1">
                      Activación en 24 horas
                    </h3>
                    <p className="text-brand-300">
                      Una vez confirmado el pago, tu sistema estará listo
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="glass p-6 rounded-lg mb-8">
            <h3 className="text-white font-semibold mb-3">
              ¿Tienes preguntas?
            </h3>
            <p className="text-brand-300 mb-4">
              Escríbenos directamente por WhatsApp
            </p>
            <a
              href="https://wa.me/50499999999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <PhoneIcon className="h-5 w-5 mr-2" />
              Contactar por WhatsApp
            </a>
          </div>

          {/* Back to Home */}
          <Link
            href="/landing"
            className="inline-flex items-center text-brand-300 hover:text-white transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
