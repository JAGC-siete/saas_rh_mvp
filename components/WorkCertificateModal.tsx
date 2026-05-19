import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import type { EmployeeShaped } from '../lib/types/employee-shaped'

interface WorkCertificateModalProps {
  isOpen: boolean
  onClose: () => void
  employee: EmployeeShaped | null
}

export default function WorkCertificateModal({
  isOpen,
  onClose,
  employee
}: WorkCertificateModalProps) {
  const [includeDeductions, setIncludeDeductions] = useState(true)
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !employee) return null

  const handleGenerate = async () => {
    if (!employee?.id) return

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/reports/export-work-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee.id,
          format,
          includeDeductions,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      // Obtener el blob del archivo
      const blob = await response.blob()
      
      // Crear un enlace temporal para descargar
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Nombre del archivo desde el header Content-Disposition o usar uno por defecto
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `constancia_laboral_${employee.employee_code || employee.id}_${new Date().toISOString().split('T')[0]}.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Cerrar modal después de descarga exitosa
      onClose()
    } catch (err) {
      console.error('Error generando constancia:', err)
      setError(err instanceof Error ? err.message : 'Error al generar la constancia')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full bg-gray-900 border border-white/20">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">
              Generar Constancia Laboral
            </h3>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              ✕
            </Button>
          </div>

          {employee && (
            <div className="space-y-6">
              {/* Información del empleado */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Empleado</h4>
                <p className="text-white font-medium">{employee.name}</p>
                <p className="text-sm text-gray-400">
                  {employee.employee_code && `Código: ${employee.employee_code} • `}
                  DNI: {employee.dni}
                </p>
                {employee.role && (
                  <p className="text-sm text-gray-400 mt-1">
                    Cargo: {employee.role}
                  </p>
                )}
              </div>

              {/* Opciones de formato */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Formato del Documento
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat('pdf')}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      format === 'pdf'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium">PDF</div>
                    <div className="text-xs mt-1 opacity-80">
                      Formato profesional
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('csv')}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      format === 'csv'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium">CSV</div>
                    <div className="text-xs mt-1 opacity-80">
                      Datos tabulares
                    </div>
                  </button>
                </div>
              </div>

              {/* Opción de deducciones */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDeductions}
                    onChange={(e) => setIncludeDeductions(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-brand-600 focus:ring-brand-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      Incluir Deducciones
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {includeDeductions
                        ? 'La constancia incluirá la tabla de deducciones (IHSS/RAP) con el salario neto calculado.'
                        : 'La constancia solo mostrará información básica del empleado sin desglose de deducciones.'}
                    </div>
                  </div>
                </label>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                  <div className="text-sm text-red-400">
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  disabled={generating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      📄 Generar {format.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

