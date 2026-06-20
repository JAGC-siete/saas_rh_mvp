import Link from 'next/link'
import TrackedWhatsAppLink from '../components/TrackedWhatsAppLink'
import PublicPageShell from '../components/landing/PublicPageShell'
import PublicPageHead from '../components/SEO/PublicPageHead'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { CheckCircle, Clock, MessageCircle, ArrowRight } from 'lucide-react'

export default function GraciasPage() {
  return (
    <PublicPageShell centered showFooter={false}>
      <PublicPageHead
        title={getPageTitle('gracias')}
        description={getPageDescription('gracias')}
        canonicalPath="/gracias"
        noindex
      />
      <div className="w-full max-w-2xl space-y-8 p-4">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <CheckCircle className="h-16 w-16 text-green-400" />
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            ¡Listo! Tu sistema está en camino
          </h1>

          <p className="text-xl text-brand-200 mb-8">
            Hemos recibido tu solicitud y comprobante de pago.
          </p>
        </div>

        <Card variant="liquid">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              ¿Qué sigue ahora?
            </CardTitle>
            <CardDescription className="text-brand-200/90">
              Tu proceso de activación paso a paso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start space-x-4 text-left">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Verificamos tu pago</h3>
                <p className="text-brand-200 text-sm">
                  Nuestro equipo confirmará tu comprobante en las próximas 2-4 horas
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 text-left">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Configuramos tu sistema</h3>
                <p className="text-brand-200 text-sm">
                  Preparamos tu dashboard personalizado con tus empleados y departamentos
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 text-left">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Te enviamos tus credenciales</h3>
                <p className="text-brand-200 text-sm">
                  En máximo 24 horas recibirás tu usuario y contraseña por email y WhatsApp
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 font-medium text-center">
                ⏰ Tiempo estimado: 24 horas máximo
              </p>
              <p className="text-brand-200 text-sm text-center mt-1">
                La mayoría de sistemas se activan en 4-8 horas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="liquid">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-white font-bold">
              ¿Preguntas mientras esperas?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-brand-200">
            <p>Email: jorgearturo@humanosisu.net</p>
            <p>WhatsApp: (+504)32226773</p>
            <p>Llamadas: +504 3214-8010</p>
            <p>⏰ Horario: Lunes a Viernes, 8:00 AM - 6:00 PM</p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="glass-modern text-brand-200 hover:text-white px-6 py-3 rounded-lg font-medium transition-colors border border-brand-600/30 hover:border-brand-500 inline-flex items-center justify-center"
          >
            Volver a inicio
          </Link>

          <TrackedWhatsAppLink
            href="https://wa.me/50432226773?text=Hola, acabo de activar mi sistema HUMANO SISU"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-shiny bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
            trackingContext="gracias_post_pago_whatsapp"
          >
            Escribir por WhatsApp
            <ArrowRight className="w-4 h-4" />
          </TrackedWhatsAppLink>
        </div>

        <div className="text-center">
          <p className="text-brand-200 text-sm mb-4">
            Te unes a más de 150+ empresas que ya automatizaron su RH
          </p>
          <div className="flex justify-center space-x-8 opacity-60">
            <div className="text-xs text-brand-300">⭐⭐⭐⭐⭐ 4.9/5</div>
            <div className="text-xs text-brand-300">24h promedio</div>
            <div className="text-xs text-brand-300">99% uptime</div>
          </div>
        </div>
      </div>
    </PublicPageShell>
  )
}
