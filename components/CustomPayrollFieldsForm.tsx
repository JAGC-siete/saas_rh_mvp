import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { getCustomFields, getPayrollConfig, buildPayrollMetadata } from '../lib/payroll-client-specific'
import { formatCurrency } from '../lib/utils/currency'

interface CustomPayrollFieldsFormProps {
  companyId: string
  runLineId: string
  currentMetadata?: any
  baseSalary: number
  onSave: (metadata: any) => Promise<void>
  onCancel: () => void
}

export default function CustomPayrollFieldsForm({
  companyId,
  runLineId,
  currentMetadata = {},
  baseSalary,
  onSave,
  onCancel
}: CustomPayrollFieldsFormProps) {
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const config = getPayrollConfig(companyId)
  const customFields = getCustomFields(companyId)

  useEffect(() => {
    // Initialize form with current metadata
    if (currentMetadata) {
      setFormData(currentMetadata)
    }
  }, [currentMetadata])

  const handleInputChange = (fieldName: string, value: string | number) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: typeof value === 'string' && value !== '' ? parseFloat(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Convert units to Lempiras where applicable
      const hourlyRate = (Number(baseSalary) || 0) / 30 / 8
      const converted: any = { ...formData }
      if (converted.horas_extras !== undefined && converted.horas_extras !== null) {
        const hours = Number(converted.horas_extras) || 0
        converted.horas_extras = Math.round(hours * hourlyRate * 100) / 100
      }
      if (converted.feriado_trabajado !== undefined && converted.feriado_trabajado !== null) {
        const days = Number(converted.feriado_trabajado) || 0
        converted.feriado_trabajado = Math.round(days * 8 * hourlyRate * 100) / 100
      }

      const metadata = buildPayrollMetadata(companyId, converted)
      await onSave(metadata)
    } catch (error) {
      console.error('Error saving custom fields:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!config || !customFields) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">No hay campos personalizados configurados para esta empresa</p>
        </CardContent>
      </Card>
    )
  }

  // Separate earnings and deductions
  const earningsFields = Object.keys(customFields).filter(key => 
    key.includes('horas_extras') || key.includes('feriado') || key.includes('transporte')
  )
  
  const deductionsFields = Object.keys(customFields).filter(key => 
    !key.includes('horas_extras') && 
    !key.includes('feriado') && 
    !key.includes('transporte') &&
    !key.includes('valor') &&
    !key.includes('descanso') &&
    !key.includes('doble') &&
    !key.includes('pausa')
  )

  // Calculate totals (convert hours/days to Lempiras for display)
  const hourlyRate = (Number(baseSalary) || 0) / 30 / 8
  const totalIngresos = earningsFields.reduce((sum, key) => {
    const val = Number(formData[key] || 0)
    if (key.includes('horas_extras')) return sum + val * hourlyRate
    if (key.includes('feriado')) return sum + val * 8 * hourlyRate
    return sum + val
  }, 0)
  const totalDeducciones = deductionsFields.reduce((sum, key) => sum + (formData[key] || 0), 0)

  return (
    <Card className="backdrop-blur-md bg-white/10 border border-white/20">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white text-xl font-bold">
          Campos Personalizados - PROHALCA
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Earnings Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
              Ingresos Adicionales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {earningsFields.map((fieldName) => (
                <div key={fieldName}>
                  <label className="block text-sm font-medium text-white mb-2">
                    {customFields[fieldName]}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData[fieldName] || ''}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                    className="w-full px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-white font-medium">Total Ingresos Adicionales:</span>
                <span className="text-green-300 font-bold">{formatCurrency(totalIngresos)}</span>
              </div>
            </div>
          </div>

          {/* Deductions Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-400 mr-2"></span>
              Deducciones Adicionales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deductionsFields.map((fieldName) => (
                <div key={fieldName}>
                  <label className="block text-sm font-medium text-white mb-2">
                    {customFields[fieldName]}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData[fieldName] || ''}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                    className="w-full px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-white font-medium">Total Deducciones Adicionales:</span>
                <span className="text-red-300 font-bold">{formatCurrency(totalDeducciones)}</span>
              </div>
            </div>
          </div>

          {/* Net Impact */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-white font-medium">Impacto Neto:</span>
              <span className={`font-bold ${(totalIngresos - totalDeducciones) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {formatCurrency(totalIngresos - totalDeducciones)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                'Guardar Campos Personalizados'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


