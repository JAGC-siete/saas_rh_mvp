import Head from 'next/head'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function Unauthorized() {
  return (
    <>
      <Head>
        <title>Acceso No Autorizado - Sistema HR</title>
        <meta name="description" content="No tienes permisos para acceder a esta página" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="h-10 w-10 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Acceso No Autorizado
          </h1>
          
          <p className="text-gray-600 mb-8">
            No tienes permisos suficientes para acceder a esta página. 
            Contacta al administrador si crees que esto es un error.
          </p>
          
          <Link href="/">
            <Button className="flex items-center gap-2 mx-auto">
              <ArrowLeft className="h-4 w-4" />
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}
