import Head from 'next/head'
import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <>
      <Head>
        <title>Error de autenticación</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">No se pudo completar el inicio de sesión</h1>
          <p className="text-gray-600 mb-6">Intenta nuevamente o utiliza otro método de acceso.</p>
          <Link href="/login" className="text-blue-600 hover:underline">Volver al login</Link>
        </div>
      </div>
    </>
  )
}
