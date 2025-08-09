import { useEffect, useState } from 'react'

export default function Custom500() {
  const [mounted, setMounted] = useState(false)

  // Factor VI: Solo ejecutar lógica del cliente después del montaje
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-extrabold text-gray-900">500</h1>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Error interno del servidor
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Lo sentimos, algo salió mal en nuestros servidores. Por favor, inténtalo de nuevo más tarde.
          </p>
        </div>
        
        {/* Solo mostrar enlaces dinámicos después del montaje */}
        {mounted ? (
          <div className="mt-5 space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Recargar página
            </button>
            <a
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Volver al inicio
            </a>
          </div>
        ) : (
          /* Contenido estático para prerendering */
          <div className="mt-5 text-sm text-gray-500">
            Cargando opciones...
          </div>
        )}
      </div>
    </div>
  )
}
