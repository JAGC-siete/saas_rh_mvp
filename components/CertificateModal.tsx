import { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from './ui/button'
import type { Employee } from './employeeTypes'

export interface CertificateModalHandles {
  open: (_employee: Employee) => void
}

const CertificateModal = forwardRef<CertificateModalHandles>((_, ref) => {
  const [show, setShow] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [certificateLoading, setCertificateLoading] = useState(false)

  useImperativeHandle(ref, () => ({
    open: (employee: Employee) => {
      setSelectedEmployee(employee)
      setShow(true)
    }
  }))

  const handleClose = () => {
    setShow(false)
    setSelectedEmployee(null)
  }

  const generateWorkCertificate = async () => {
    if (!selectedEmployee) return
    try {
      setCertificateLoading(true)
      const format = (document.getElementById('certificateFormat') as HTMLSelectElement)?.value || 'pdf'
      const certificateType = (document.getElementById('certificateType') as HTMLSelectElement)?.value || 'general'
      const purpose = (document.getElementById('certificatePurpose') as HTMLInputElement)?.value || 'Constancia de trabajo'
      const additionalInfo = (document.getElementById('certificateAdditionalInfo') as HTMLTextAreaElement)?.value || ''

      const response = await fetch('/api/reports/export-work-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': format === 'pdf' ? 'application/pdf' : 'text/csv'
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          format,
          certificateType,
          purpose,
          additionalInfo
        })
      })

      if (!response.ok) {
        throw new Error('Error generando constancia de trabajo')
      }

      if (format === 'pdf') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `constancia_trabajo_${selectedEmployee.employee_code}_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `constancia_trabajo_${selectedEmployee.employee_code}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      handleClose()
    } catch (error) {
      console.error('Error generating work certificate:', error)
      alert('Error al generar la constancia de trabajo')
    } finally {
      setCertificateLoading(false)
    }
  }

  if (!show || !selectedEmployee) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Generar Constancia de Trabajo</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Empleado:</strong> {selectedEmployee.name}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Código:</strong> {selectedEmployee.employee_code}
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
              onClick={generateWorkCertificate}
              disabled={certificateLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {certificateLoading ? 'Generando...' : 'Generar Constancia'}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})

CertificateModal.displayName = 'CertificateModal'

export default CertificateModal
