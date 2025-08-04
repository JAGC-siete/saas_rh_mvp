import Head from 'next/head'
import AttendanceManager from '../../components/AttendanceManager'

export default function AttendanceRegisterPage() {
  return (
    <>
      <Head>
        <title>Registro de Asistencia - Sistema HR</title>
        <meta name="description" content="Registro de asistencia para empleados" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">HR</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Sistema de Recursos Humanos
                </h1>
              </div>
              <a 
                href="/" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Volver al inicio
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Registro de Asistencia
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Bienvenido al sistema de registro de asistencia. Ingresa los últimos 5 dígitos de tu DNI para registrar tu entrada o salida.
            </p>
          </div>

          {/* Attendance Manager */}
          <div className="max-w-4xl mx-auto">
            <AttendanceManager />
          </div>
        </div>
      </div>
    </>
  )
} 