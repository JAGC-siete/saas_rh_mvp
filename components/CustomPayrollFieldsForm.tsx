import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { buildPayrollMetadata } from '../lib/payroll-client-specific'
import { formatCurrency } from '../lib/utils/currency'
import { HONDURAS_LABOR_FACTOR } from '../lib/payroll/constants'

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
  const [config, setConfig] = useState<any>(null)
  const [customFields, setCustomFields] = useState<Record<string, string> | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/api/payroll/config')
        if (response.ok) {
          const data = await response.json()
          if (data.config) {
            setConfig(data.config)
            // Convert custom_fields from DB format to simple format
            const fields: Record<string, string> = {}
            if (data.config.custom_fields) {
              for (const [fieldName, fieldDef] of Object.entries(data.config.custom_fields)) {
                const def = fieldDef as any
                fields[fieldName] = typeof def === 'string' ? def : (def.label || fieldName)
              }
            }
            setCustomFields(fields)
          }
        }
      } catch (error) {
        console.error('Error loading payroll config:', error)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [companyId])

  useEffect(() => {
    // Initialize form with current metadata
    if (currentMetadata && Object.keys(currentMetadata).length > 0) {
      setFormData(currentMetadata)
    } else {
      // Initialize with empty values for all custom fields
      const initialData: any = {}
      if (customFields) {
        Object.keys(customFields).forEach(key => {
          initialData[key] = currentMetadata?.[key] ?? ''
        })
      }
      setFormData(initialData)
    }
  }, [currentMetadata, customFields])

  const handleInputChange = (fieldName: string, value: string | number) => {
    // Allow string values while user is typing (for decimal inputs like "0.")
    // Convert to number only when it's a valid complete number
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Convert string values to numbers for all fields
      const converted: any = {}
      for (const key in formData) {
        const value = formData[key]
        if (value === '' || value === null || value === undefined) {
          converted[key] = 0
        } else {
          converted[key] = typeof value === 'string' ? parseFloat(value) || 0 : value
        }
      }

      // Convert units to Lempiras where applicable (baseSalary = mensual, tarifa = base/240)
      const hourlyRate = (Number(baseSalary) || 0) / HONDURAS_LABOR_FACTOR
      if (converted.horas_extras !== undefined && converted.horas_extras !== null) {
        const hours = Number(converted.horas_extras) || 0
        converted.horas_extras = Math.round(hours * hourlyRate * 100) / 100
      }
      if (converted.feriado_trabajado !== undefined && converted.feriado_trabajado !== null) {
        const days = Number(converted.feriado_trabajado) || 0
        converted.feriado_trabajado = Math.round(days * 8 * hourlyRate * 100) / 100
      }

      // buildPayrollMetadata will be called on the server side
      // For now, just pass the converted data as metadata
      await onSave(converted)
    } catch (error) {
      console.error('Error saving custom fields:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">Cargando configuración...</p>
        </CardContent>
      </Card>
    )
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

  // Separate earnings and deductions based on category from config
  const earningsFields = Object.keys(customFields).filter(key => {
    if (!config?.custom_fields?.[key]) return false
    const fieldDef = config.custom_fields[key]
    return typeof fieldDef === 'object' && fieldDef.category === 'earnings'
  })
  
  const deductionsFields = Object.keys(customFields).filter(key => {
    if (!config?.custom_fields?.[key]) return false
    const fieldDef = config.custom_fields[key]
    return typeof fieldDef === 'object' && fieldDef.category === 'deductions'
  })

  // Calculate totals (convert hours/days to Lempiras for display; baseSalary = mensual)
  const hourlyRate = (Number(baseSalary) || 0) / HONDURAS_LABOR_FACTOR
  const totalIngresos = earningsFields.reduce((sum, key) => {
    const val = typeof formData[key] === 'string' ? parseFloat(formData[key]) || 0 : (formData[key] || 0)
    if (key.includes('horas_extras')) return sum + val * hourlyRate
    if (key.includes('feriado')) return sum + val * 8 * hourlyRate
    return sum + val
  }, 0)
  const totalDeducciones = deductionsFields.reduce((sum, key) => {
    const val = typeof formData[key] === 'string' ? parseFloat(formData[key]) || 0 : (formData[key] || 0)
    return sum + val
  }, 0)

  return (
    <Card className="backdrop-blur-md bg-white/10 border border-white/20">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white text-xl font-bold">
          Campos Personalizados - {config?.companyName || 'Sin Configurar'}
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
                    value={formData[fieldName] !== undefined && formData[fieldName] !== null ? formData[fieldName] : ''}
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
                    value={formData[fieldName] !== undefined && formData[fieldName] !== null ? formData[fieldName] : ''}
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


