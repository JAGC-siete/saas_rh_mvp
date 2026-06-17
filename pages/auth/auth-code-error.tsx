import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../../components/landing/PublicPageShell'
import { Card, CardContent } from '../../components/ui/card'

export default function AuthCodeError() {
  return (
    <>
      <Head>
        <title>Error de autenticación</title>
      </Head>
      <PublicPageShell centered showFooter={false}>
        <div className="w-full max-w-md p-4">
          <Card variant="liquid">
            <CardContent className="p-6 text-center">
              <h1 className="text-xl font-semibold text-white mb-2">
                No se pudo completar el inicio de sesión
              </h1>
              <p className="text-white/70 mb-6">
                Intenta nuevamente o utiliza otro método de acceso.
              </p>
              <Link
                href="/login"
                className="text-brand-300 hover:text-white transition-colors font-medium"
              >
                Volver al login
              </Link>
            </CardContent>
          </Card>
        </div>
      </PublicPageShell>
    </>
  )
}
