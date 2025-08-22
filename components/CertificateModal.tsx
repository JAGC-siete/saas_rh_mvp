import { useState } from 'react'
import { Button } from './ui/button'
import { Employee } from '../lib/types/employee'

interface CertificateModalProps {
  employee: Employee | null
  onClose: () => void
  onGenerate: (
    employee: Employee,
    format: string,
    certificateType: string,
    purpose: string,
    additionalInfo: string
  ) => Promise<void>
}

export default function CertificateModal({
  employee,
  onClose,
  onGenerate,
}: CertificateModalProps) {
  const [certificateLoading, setCertificateLoading] = useState(false)

  if (!employee) return null

  const handleGenerate = async () => {
    setCertificateLoading(true)
    try {
      const format = (document.getElementById('certificateFormat') as HTMLSelectElement)?.value || 'pdf'
      const certificateType = (document.getElementById('certificateType') as HTMLSelectElement)?.value || 'general'
      const purpose = (document.getElementById('certificatePurpose') as HTMLInputElement)?.value || 'Constancia de trabajo'
      const additionalInfo = (document.getElementById('certificateAdditionalInfo') as HTMLTextAreaElement)?.value || ''
      await onGenerate(employee, format, certificateType, purpose, additionalInfo)
    } finally {
      setCertificateLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Generar Constancia de Trabajo</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Cerrar
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Empleado:</strong> {employee.name}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Código:</strong> {employee.employee_code}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Formato
            </label>
            <select
              id="certificateFormat"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="pdf"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Constancia
            </label>
            <select
              id="certificateType"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="general"
            >
              <option value="general">General</option>
              <option value="salario">Salario</option>
              <option value="antiguedad">Antigüedad</option>
              <option value="buena_conducta">Buena Conducta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propósito
            </label>
            <input
              type="text"
              id="certificatePurpose"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Constancia de trabajo"
              defaultValue="Constancia de trabajo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Información Adicional (opcional)
            </label>
            <textarea
              id="certificateAdditionalInfo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Información adicional que desee incluir..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGenerate}
              disabled={certificateLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {certificateLoading ? 'Generando...' : 'Generar Constancia'}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
