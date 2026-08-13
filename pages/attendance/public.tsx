import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../../components/landing/PublicPageShell'
import AttendanceManager from '../../components/AttendanceManager'
import { Card, CardContent } from '../../components/ui/card'

export default function PublicAttendancePage() {
  return (
    <PublicPageShell showFooter={false}>
      <Head>
        <title>Registro de Asistencia - Sistema HR</title>
        <meta name="description" content="Registro de asistencia para empleados" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Registro de Asistencia
          </h2>
          <p className="text-brand-200/90 max-w-2xl mx-auto">
            Bienvenido al sistema de registro de asistencia. Ingresa los últimos 5 dígitos de tu DNI para registrar tu entrada o salida.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 text-brand-400 hover:text-brand-300 text-sm font-medium"
          >
            ← Volver al inicio
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card variant="liquid">
            <CardContent className="p-6">
              <AttendanceManager />
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicPageShell>
  )
}
