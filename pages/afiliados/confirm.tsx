import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import MainHeader from '../../components/MainHeader'

export default function AffiliateConfirmPage() {
  const router = useRouter()
  const { success } = router.query

  return (
    <div className="min-h-screen bg-app text-white flex flex-col pt-24 relative">
      <Head>
        <title>Confirmación de Solicitud - Humano SISU</title>
        <meta name="description" content="Confirmación de solicitud de afiliación." />
      </Head>

      <MainHeader enableScrollEffect={false} fixed={true} />

      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="glass-strong max-w-2xl mx-auto">
          <CardContent className="pt-6">
            {success === 'true' ? (
              <div className="text-center space-y-6">
                <div className="text-6xl mb-4">✅</div>
                <h1 className="text-3xl font-bold text-green-400">
                  ¡Solicitud Enviada Exitosamente!
                </h1>
                <div className="space-y-4 text-gray-300">
                  <p className="text-lg">
                    Tu solicitud de afiliación ha sido enviada correctamente.
                  </p>
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 space-y-3">
                    <p className="font-semibold text-white">Próximos pasos:</p>
                    <ul className="list-disc list-inside space-y-2 text-left">
                      <li>Revisaremos tu solicitud y la información proporcionada</li>
                      <li>Te contactaremos pronto con una respuesta</li>
                      <li>Si tu solicitud es aprobada, recibirás un email con tus credenciales de acceso</li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-400">
                    Mientras tanto, puedes revisar más información sobre nuestro programa de afiliados.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/afiliados">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Volver al Programa
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                      Ir al Inicio
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="text-6xl mb-4">⚠️</div>
                <h1 className="text-3xl font-bold">
                  Error al Procesar Solicitud
                </h1>
                <p className="text-gray-400">
                  Hubo un problema al procesar tu solicitud. Por favor intenta nuevamente.
                </p>
                <Link href="/afiliados">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Volver al Programa
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-slate-400 mb-4">
              &copy; {new Date().getFullYear()} Humano SISU. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}








