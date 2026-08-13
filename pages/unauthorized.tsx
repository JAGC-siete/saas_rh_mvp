import Head from 'next/head'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import PublicPageShell from '../components/landing/PublicPageShell'
import { Card, CardContent } from '../components/ui/card'

export default function Unauthorized() {
  return (
    <PublicPageShell centered showFooter={false}>
      <Head>
        <title>Acceso No Autorizado - Sistema HR</title>
        <meta name="description" content="No tienes permisos para acceder a esta página" />
      </Head>

      <Card variant="liquid" className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mx-auto h-20 w-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <Shield className="h-10 w-10 text-red-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Acceso No Autorizado
          </h1>

          <p className="text-slate-300 mb-8">
            No tienes permisos suficientes para acceder a esta página.
            Contacta al administrador si crees que esto es un error.
          </p>

          <Link href="/">
            <Button className="flex items-center gap-2 mx-auto">
              <ArrowLeft className="h-4 w-4" />
              Volver al Inicio
            </Button>
          </Link>
        </CardContent>
      </Card>
    </PublicPageShell>
  )
}
