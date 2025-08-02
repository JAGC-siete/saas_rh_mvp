export default function Custom404() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mt-4">Página no encontrada</p>
        <a href="/" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Volver al inicio
        </a>
      </div>
    </div>
  )
} 