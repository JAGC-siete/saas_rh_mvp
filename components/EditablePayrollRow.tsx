import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Icon } from './Icon'

interface PayrollLine {
  line_id: string
  name: string
  base_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  total_earnings: number
  IHSS: number
  RAP: number
  ISR: number
  total_deducciones: number
  total: number
}

interface PayrollLineUpdate {
  days_worked?: number
  total_earnings?: number
  IHSS?: number
  RAP?: number
  ISR?: number
  total_deducciones?: number
  total?: number
}

interface EditablePayrollRowProps {
  employee: PayrollLine
  onSave: (lineId: string, updates: PayrollLineUpdate) => Promise<void>
  onCancel: () => void
}

export default function EditablePayrollRow({ 
  employee, 
  onSave, 
  onCancel 
}: EditablePayrollRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editedValues, setEditedValues] = useState<PayrollLineUpdate>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleEdit = () => {
    setIsEditing(true)
    setEditedValues({
      days_worked: employee.days_worked,
      total_earnings: employee.total_earnings,
      IHSS: employee.IHSS,
      RAP: employee.RAP,
      ISR: employee.ISR
    })
    setErrors({})
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedValues({})
    setErrors({})
    onCancel()
  }

  const handleSave = async () => {
    setLoading(true)
    setErrors({})

    try {
      // Validar campos
      const newErrors: Record<string, string> = {}
      
      if (editedValues.days_worked !== undefined && editedValues.days_worked < 0) {
        newErrors.days_worked = 'Los días trabajados no pueden ser negativos'
      }
      
      if (editedValues.total_earnings !== undefined && editedValues.total_earnings < 0) {
        newErrors.total_earnings = 'El salario bruto no puede ser negativo'
      }
      
      if (editedValues.IHSS !== undefined && editedValues.IHSS < 0) {
        newErrors.IHSS = 'IHSS no puede ser negativo'
      }
      
      if (editedValues.RAP !== undefined && editedValues.RAP < 0) {
        newErrors.RAP = 'RAP no puede ser negativo'
      }
      
      if (editedValues.ISR !== undefined && editedValues.ISR < 0) {
        newErrors.ISR = 'ISR no puede ser negativo'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        setLoading(false)
        return
      }

      // Calcular totales
      const totalDeducciones = (editedValues.IHSS || employee.IHSS) + 
                              (editedValues.RAP || employee.RAP) + 
                              (editedValues.ISR || employee.ISR)
      
      const totalNeto = (editedValues.total_earnings || employee.total_earnings) - totalDeducciones

      const updates: PayrollLineUpdate = {
        ...editedValues,
        total: totalNeto
      }

      await onSave(employee.line_id, updates)
      setIsEditing(false)
      setEditedValues({})
    } catch (error) {
      console.error('Error guardando cambios:', error)
      setErrors({ general: 'Error guardando los cambios' })
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: keyof PayrollLineUpdate, value: string) => {
    const numValue = parseFloat(value) || 0
    setEditedValues(prev => ({ ...prev, [field]: numValue }))
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (isEditing) {
    return (
      <>
        {/* Fila normal con datos actuales */}
        <tr className="border-t border-white/10">
          <td className="py-2 pr-4">{employee.name}</td>
          <td className="py-2 pr-4">L {employee.base_salary?.toFixed(2) || '0.00'}</td>
          <td className="py-2 pr-4">{employee.days_worked || 0}</td>
          <td className="py-2 pr-4">{employee.days_absent || 0}</td>
          <td className="py-2 pr-4">{employee.late_days || 0}</td>
          <td className="py-2 pr-4">L {employee.total_earnings?.toFixed(2) || '0.00'}</td>
          <td className="py-2 pr-4">L {employee.IHSS?.toFixed(2) || '0.00'}</td>
          <td className="py-2 pr-4">L {employee.RAP?.toFixed(2) || '0.00'}</td>
          <td className="py-2 pr-4">L {employee.ISR?.toFixed(2) || '0.00'}</td>
          <td className="py-2 pr-4">L {employee.total_deducciones?.toFixed(2) || '0.00'}</td>
          <td className="py-2 pr-4 font-semibold">L {employee.total?.toFixed(2) || '0.00'}</td>
          <td className="py-2 pr-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              <Icon name="close" className="h-4 w-4" />
            </Button>
          </td>
        </tr>
        
        {/* Fila de edición */}
        <tr className="bg-blue-50/10 border-t border-blue-200/20">
          <td colSpan={11} className="py-4 px-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-white">Editando: {employee.name}</h4>
              
              {errors.general && (
                <div className="text-red-400 text-sm">{errors.general}</div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Días Trabajados */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Días Trabajados</label>
                  <Input
                    type="number"
                    value={editedValues.days_worked || ''}
                    onChange={(e) => handleFieldChange('days_worked', e.target.value)}
                    className={errors.days_worked ? 'border-red-500' : ''}
                    min="0"
                    step="0.5"
                  />
                  {errors.days_worked && (
                    <p className="text-red-400 text-xs mt-1">{errors.days_worked}</p>
                  )}
                </div>

                {/* Salario Bruto */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Salario Bruto</label>
                  <Input
                    type="number"
                    value={editedValues.total_earnings || ''}
                    onChange={(e) => handleFieldChange('total_earnings', e.target.value)}
                    className={errors.total_earnings ? 'border-red-500' : ''}
                    min="0"
                    step="0.01"
                  />
                  {errors.total_earnings && (
                    <p className="text-red-400 text-xs mt-1">{errors.total_earnings}</p>
                  )}
                </div>

                {/* IHSS */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">IHSS</label>
                  <Input
                    type="number"
                    value={editedValues.IHSS || ''}
                    onChange={(e) => handleFieldChange('IHSS', e.target.value)}
                    className={errors.IHSS ? 'border-red-500' : ''}
                    min="0"
                    step="0.01"
                  />
                  {errors.IHSS && (
                    <p className="text-red-400 text-xs mt-1">{errors.IHSS}</p>
                  )}
                </div>

                {/* RAP */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">RAP</label>
                  <Input
                    type="number"
                    value={editedValues.RAP || ''}
                    onChange={(e) => handleFieldChange('RAP', e.target.value)}
                    className={errors.RAP ? 'border-red-500' : ''}
                    min="0"
                    step="0.01"
                  />
                  {errors.RAP && (
                    <p className="text-red-400 text-xs mt-1">{errors.RAP}</p>
                  )}
                </div>

                {/* ISR */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">ISR</label>
                  <Input
                    type="number"
                    value={editedValues.ISR || ''}
                    onChange={(e) => handleFieldChange('ISR', e.target.value)}
                    className={errors.ISR ? 'border-red-500' : ''}
                    min="0"
                    step="0.01"
                  />
                  {errors.ISR && (
                    <p className="text-red-400 text-xs mt-1">{errors.ISR}</p>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Icon name="check" className="h-4 w-4" />
                  )}
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </td>
        </tr>
      </>
    )
  }

  return (
    <tr className="border-t border-white/10">
      <td className="py-2 pr-4">{employee.name}</td>
      <td className="py-2 pr-4">L {employee.base_salary?.toFixed(2) || '0.00'}</td>
      <td className="py-2 pr-4">{employee.days_worked || 0}</td>
      <td className="py-2 pr-4">{employee.days_absent || 0}</td>
      <td className="py-2 pr-4">{employee.late_days || 0}</td>
      <td className="py-2 pr-4">L {employee.total_earnings?.toFixed(2) || '0.00'}</td>
      <td className="py-2 pr-4">L {employee.IHSS?.toFixed(2) || '0.00'}</td>
      <td className="py-2 pr-4">L {employee.RAP?.toFixed(2) || '0.00'}</td>
      <td className="py-2 pr-4">L {employee.ISR?.toFixed(2) || '0.00'}</td>
      <td className="py-2 pr-4">L {employee.total_deducciones?.toFixed(2) || '0.00'}</td>
      <td className="py-2 pr-4 font-semibold">L {employee.total?.toFixed(2) || '0.00'}</td>
      <td className="py-2 pr-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEdit}
          className="flex items-center gap-1"
        >
          <Icon name="edit" className="h-4 w-4" />
          Editar
        </Button>
      </td>
    </tr>
  )
}
