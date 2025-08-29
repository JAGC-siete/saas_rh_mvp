// Payroll Line Editor Component
// Handles inline editing of payroll lines with adjustment tracking

import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { PayrollLine, EditField } from '../types/payroll'

interface PayrollLineEditorProps {
  line: PayrollLine
  onEdit: (runLineId: string, field: EditField, newValue: number, reason?: string) => Promise<void>
  isEditing: boolean
}

const EDITABLE_FIELDS: { key: EditField; label: string; type: 'number' | 'currency' }[] = [
  { key: 'days_worked', label: 'Días Trabajados', type: 'number' },
  { key: 'total_earnings', label: 'Salario Bruto', type: 'currency' },
  { key: 'IHSS', label: 'IHSS', type: 'currency' },
  { key: 'RAP', label: 'RAP', type: 'currency' },
  { key: 'ISR', label: 'ISR', type: 'currency' },
  { key: 'total', label: 'Salario Neto', type: 'currency' }
]

export const PayrollLineEditor: React.FC<PayrollLineEditorProps> = ({
  line,
  onEdit,
  isEditing
}) => {
  const [editingField, setEditingField] = useState<EditField | null>(null)
  const [newValue, setNewValue] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEditClick = (field: EditField) => {
    const currentValue = line[field] || 0
    setNewValue(currentValue.toString())
    setReason('')
    setEditingField(field)
  }

  const handleSave = async () => {
    if (!editingField || !newValue.trim()) return

    const numericValue = parseFloat(newValue)
    if (isNaN(numericValue)) {
      alert('Por favor ingrese un valor numérico válido')
      return
    }

    setIsSubmitting(true)
    try {
      await onEdit(line.line_id, editingField, numericValue, reason.trim() || undefined)
      setEditingField(null)
      setNewValue('')
      setReason('')
    } catch (error) {
      console.error('Error saving edit:', error)
      // Error is handled by the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setEditingField(null)
    setNewValue('')
    setReason('')
  }

  const formatValue = (value: number, type: 'number' | 'currency') => {
    if (type === 'currency') {
      return new Intl.NumberFormat('es-HN', {
        style: 'currency',
        currency: 'HNL',
        minimumFractionDigits: 2
      }).format(value)
    }
    return value.toString()
  }

  const getFieldValue = (field: EditField) => {
    return line[field] || 0
  }

  const isFieldEdited = (field: EditField) => {
    // This would need to be implemented based on your data structure
    // For now, we'll assume all fields are editable
    return true
  }

  return (
    <>
      {/* Inline display with edit buttons */}
      <div className="space-y-2">
        {EDITABLE_FIELDS.map(({ key, label, type }) => (
          <div key={key} className="flex items-center justify-between p-2 border rounded">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">{label}</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">
                  {formatValue(getFieldValue(key), type)}
                </span>
                {isFieldEdited(key) && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    📝 Editado
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditClick(key)}
              disabled={!isEditing}
              className="ml-2"
            >
              ✏️
            </Button>
          </div>
        ))}
      </div>

      {/* Edit Modal - Simple implementation without Dialog */}
      {editingField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              Editar {EDITABLE_FIELDS.find(f => f.key === editingField)?.label}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="newValue" className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Valor
                </label>
                <Input
                  id="newValue"
                  type="number"
                  step="0.01"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Ingrese el nuevo valor"
                />
              </div>
              
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del Ajuste (Opcional)
                </label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explique el motivo del ajuste..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
