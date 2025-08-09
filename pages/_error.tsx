import { NextPageContext } from 'next'
import { useEffect, useState } from 'react'

interface ErrorProps {
  statusCode: number
  hasGetInitialPropsRun: boolean
  err?: Error
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const title = statusCode === 404 
    ? 'Página no encontrada'
    : hasGetInitialPropsRun && err
    ? 'Un error ocurrió en el servidor'
    : 'Un error ocurrió en el cliente'

  const description = statusCode === 404
    ? 'Lo sentimos, no pudimos encontrar la página que buscas.'
    : 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-extrabold text-gray-900">{statusCode}</h1>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        </div>
        
        {mounted ? (
          <div className="mt-5 space-y-3">
            {statusCode !== 404 && (
              <button
                onClick={() => window.location.reload()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Recargar página
              </button>
            )}
            <a
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Volver al inicio
            </a>
            <a
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Iniciar sesión
            </a>
          </div>
        ) : (
          <div className="mt-5 text-sm text-gray-500">
            Cargando opciones...
          </div>
        )}
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode ?? 500 : 404
  return { statusCode, hasGetInitialPropsRun: true, err: err || undefined }
}

export default Error
