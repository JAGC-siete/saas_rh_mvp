import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { FileText, Download, Calendar, Users } from 'lucide-react'

export default function ReportsManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Reportes y Análisis</h2>
        <p className="text-gray-300">Genera reportes de asistencia, nómina y empleados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Reporte de Asistencia */}
        <Card variant="glass">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-400" />
              Reporte de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4 text-sm">
              Exporta registros de entrada y salida por fecha
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              disabled
            >
              <Download className="h-4 w-4 mr-2" />
              Generar Reporte
            </Button>
          </CardContent>
        </Card>

        {/* Reporte de Empleados */}
        <Card variant="glass">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-400" />
              Reporte de Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4 text-sm">
              Lista completa de empleados activos
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              disabled
            >
              <Download className="h-4 w-4 mr-2" />
              Generar Lista
            </Button>
          </CardContent>
        </Card>

        {/* Reporte de Nómina */}
        <Card variant="glass">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-400" />
              Reporte de Nómina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4 text-sm">
              Resumen de pagos y deducciones
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              disabled
            >
              <Download className="h-4 w-4 mr-2" />
              Generar Nómina
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Demo - Vista de Reportes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-4">
            En la versión completa, aquí podrás generar y descargar reportes detallados de:
          </p>
          <ul className="text-gray-300 space-y-2 mb-4">
            <li>• Asistencia mensual por empleado</li>
            <li>• Reportes de puntualidad y tardanzas</li>
            <li>• Análisis de patrones de asistencia</li>
            <li>• Exportación a Excel y PDF</li>
            <li>• Reportes personalizados por departamento</li>
          </ul>
          <div className="bg-brand-500/20 border border-brand-500/30 rounded-lg p-4">
            <p className="text-brand-200 text-sm">
              <strong>Funcionalidad completa disponible en la versión de producción</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
