import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'

interface PayrollLine {
  id: string
  name: string
  department: string
  days_worked: number
  total_earnings: number
  IHSS: number
  RAP: number
  ISR: number
  total_deducciones: number
  total: number
  line_id?: string
}

interface EditablePayrollRowProps {
  employee: PayrollLine
  onSave: (lineId: string, updates: Partial<PayrollLine>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function EditablePayrollRow({ 
  employee, 
  onSave, 
  onCancel, 
  loading = false 
}: EditablePayrollRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValues, setEditedValues] = useState<Partial<PayrollLine>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Inicializar valores editados cuando se activa la edición
  useEffect(() => {
    if (isEditing) {
      setEditedValues({
        days_worked: employee.days_worked,
        total_earnings: employee.total_earnings,
        IHSS: employee.IHSS,
        RAP: employee.RAP,
        ISR: employee.ISR
      })
      setErrors({})
    }
  }, [isEditing, employee])

  // Calcular totales automáticamente
  const calculateTotals = (values: Partial<PayrollLine>) => {
    const ihss = values.IHSS || employee.IHSS
    const rap = values.RAP || employee.RAP
    const isr = values.ISR || employee.ISR
    const totalDeducciones = ihss + rap + isr
    const grossSalary = values.total_earnings || employee.total_earnings
    const netSalary = grossSalary - totalDeducciones

    return {
      total_deducciones: Math.round(totalDeducciones * 100) / 100,
      total: Math.round(netSalary * 100) / 100
    }
  }

  const handleFieldChange = (field: keyof PayrollLine, value: string) => {
    const numValue = parseFloat(value) || 0
    
    // Validaciones
    const newErrors = { ...errors }
    if (numValue < 0) {
      newErrors[field] = 'El valor no puede ser negativo'
    } else if (field === 'days_worked' && (numValue > 31 || numValue < 0)) {
      newErrors[field] = 'Los días trabajados deben estar entre 0 y 31'
    } else {
      delete newErrors[field]
    }
    
    setErrors(newErrors)
    
    const newValues = {
      ...editedValues,
      [field]: numValue,
      ...calculateTotals({ ...editedValues, [field]: numValue })
    }
    
    setEditedValues(newValues)
  }

  const handleSave = async () => {
    if (Object.keys(errors).length > 0) {
      return
    }

    try {
      await onSave(employee.line_id || employee.id, editedValues)
      setIsEditing(false)
    } catch (error) {
      console.error('Error guardando cambios:', error)
    }
  }

  const handleCancel = () => {
    setEditedValues({})
    setErrors({})
    setIsEditing(false)
    onCancel()
  }

  if (!isEditing) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
        disabled={loading}
        className="flex items-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Editar
      </Button>
    )
  }

  return (
    <Card className="mt-2 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Editando: {employee.name}
            </h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading || Object.keys(errors).length > 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Días Trabajados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días Trabajados
              </label>
              <Input
                type="number"
                min="0"
                max="31"
                step="0.5"
                value={editedValues.days_worked || ''}
                onChange={(e) => handleFieldChange('days_worked', e.target.value)}
                className={errors.days_worked ? 'border-red-500' : ''}
              />
              {errors.days_worked && (
                <p className="text-red-500 text-xs mt-1">{errors.days_worked}</p>
              )}
            </div>

            {/* Salario Bruto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salario Bruto (L)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editedValues.total_earnings || ''}
                onChange={(e) => handleFieldChange('total_earnings', e.target.value)}
                className={errors.total_earnings ? 'border-red-500' : ''}
              />
              {errors.total_earnings && (
                <p className="text-red-500 text-xs mt-1">{errors.total_earnings}</p>
              )}
            </div>

            {/* IHSS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IHSS (L)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editedValues.IHSS || ''}
                onChange={(e) => handleFieldChange('IHSS', e.target.value)}
                className={errors.IHSS ? 'border-red-500' : ''}
              />
              {errors.IHSS && (
                <p className="text-red-500 text-xs mt-1">{errors.IHSS}</p>
              )}
            </div>

            {/* RAP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RAP (L)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editedValues.RAP || ''}
                onChange={(e) => handleFieldChange('RAP', e.target.value)}
                className={errors.RAP ? 'border-red-500' : ''}
              />
              {errors.RAP && (
                <p className="text-red-500 text-xs mt-1">{errors.RAP}</p>
              )}
            </div>

            {/* ISR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISR (L)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editedValues.ISR || ''}
                onChange={(e) => handleFieldChange('ISR', e.target.value)}
                className={errors.ISR ? 'border-red-500' : ''}
              />
              {errors.ISR && (
                <p className="text-red-500 text-xs mt-1">{errors.ISR}</p>
              )}
            </div>

            {/* Totales Calculados */}
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Deducciones (L)
                </label>
                <Input
                  value={editedValues.total_deducciones?.toFixed(2) || '0.00'}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salario Neto (L)
                </label>
                <Input
                  value={editedValues.total?.toFixed(2) || '0.00'}
                  disabled
                  className="bg-gray-100 font-semibold"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
