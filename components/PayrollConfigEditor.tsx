import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Calculator,
  FileText,
  Code,
  X
} from 'lucide-react'

interface CustomField {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' | 'calculation_helper'
  required: boolean
  default: any
}

interface PayrollConfig {
  calculation_type: 'standard' | 'formula_based' | 'custom'
  custom_fields: Record<string, CustomField>
  calculation_config: {
    earnings_formula?: string
    deductions_formula?: string
    custom_calculations?: Record<string, string>
  }
  calculation_script?: string | null
}

interface PayrollConfigEditorProps {
  companyId: string
  onSave?: () => void
}

export default function PayrollConfigEditor({ companyId, onSave }: PayrollConfigEditorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [config, setConfig] = useState<PayrollConfig>({
    calculation_type: 'standard',
    custom_fields: {},
    calculation_config: {},
    calculation_script: null
  })

  const [newFieldName, setNewFieldName] = useState('')
  const [newField, setNewField] = useState<CustomField>({
    label: '',
    type: 'number',
    category: 'earnings',
    required: false,
    default: 0
  })

  const [showAddField, setShowAddField] = useState(false)

  // Load current configuration
  useEffect(() => {
    loadConfig()
  }, [companyId])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/payroll/config')
      if (response.ok) {
        const data = await response.json()
        if (data.config) {
          setConfig({
            calculation_type: data.config.calculation_type || 'standard',
            custom_fields: data.config.custom_fields || {},
            calculation_config: data.config.calculation_config || {},
            calculation_script: data.config.calculation_script || null
          })
        }
      } else {
        // No config exists yet, use defaults
        setConfig({
          calculation_type: 'standard',
          custom_fields: {},
          calculation_config: {},
          calculation_script: null
        })
      }
    } catch (err: any) {
      console.error('Error loading config:', err)
      setError('Error cargando configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate configuration
      if (config.calculation_type === 'custom' && !config.calculation_script) {
        setError('El script de cálculo es requerido cuando el tipo es "custom"')
        setSaving(false)
        return
      }

      const response = await fetch('/api/payroll/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculation_type: config.calculation_type,
          custom_fields: config.custom_fields,
          calculation_config: config.calculation_config,
          calculation_script: config.calculation_script || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error guardando configuración')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onSave?.()
    } catch (err: any) {
      console.error('Error saving config:', err)
      setError(err.message || 'Error guardando configuración')
    } finally {
      setSaving(false)
    }
  }

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      setError('El nombre del campo es requerido')
      return
    }

    if (config.custom_fields[newFieldName]) {
      setError('Este campo ya existe')
      return
    }

    setConfig(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [newFieldName]: { ...newField }
      }
    }))

    // Reset form
    setNewFieldName('')
    setNewField({
      label: '',
      type: 'number',
      category: 'earnings',
      required: false,
      default: 0
    })
    setShowAddField(false)
    setError(null)
  }

  const handleRemoveField = (fieldName: string) => {
    const newFields = { ...config.custom_fields }
    delete newFields[fieldName]
    setConfig(prev => ({
      ...prev,
      custom_fields: newFields
    }))
  }

  const handleUpdateField = (fieldName: string, updates: Partial<CustomField>) => {
    setConfig(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [fieldName]: {
          ...prev.custom_fields[fieldName],
          ...updates
        }
      }
    }))
  }

  const handleUpdateFormula = (formulaType: 'earnings_formula' | 'deductions_formula', value: string) => {
    setConfig(prev => ({
      ...prev,
      calculation_config: {
        ...prev.calculation_config,
        [formulaType]: value
      }
    }))
  }

  const handleAddCustomCalculation = () => {
    const fieldName = prompt('Nombre del campo calculado:')
    if (!fieldName) return

    setConfig(prev => ({
      ...prev,
      calculation_config: {
        ...prev.calculation_config,
        custom_calculations: {
          ...(prev.calculation_config.custom_calculations || {}),
          [fieldName]: ''
        }
      }
    }))
  }

  const handleUpdateCustomCalculation = (fieldName: string, formula: string) => {
    setConfig(prev => ({
      ...prev,
      calculation_config: {
        ...prev.calculation_config,
        custom_calculations: {
          ...(prev.calculation_config.custom_calculations || {}),
          [fieldName]: formula
        }
      }
    }))
  }

  const handleRemoveCustomCalculation = (fieldName: string) => {
    const newCalculations = { ...config.calculation_config.custom_calculations }
    delete newCalculations[fieldName]
    setConfig(prev => ({
      ...prev,
      calculation_config: {
        ...prev.calculation_config,
        custom_calculations: newCalculations
      }
    }))
  }

  if (loading) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-gray-600">Cargando configuración...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Payroll por Empresa
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configure campos personalizados y fórmulas de cálculo específicas para su empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>Configuración guardada exitosamente</span>
            </div>
          )}

          {/* Calculation Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Tipo de Cálculo
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="calculation_type"
                  value="standard"
                  checked={config.calculation_type === 'standard'}
                  onChange={(e) => setConfig(prev => ({ ...prev, calculation_type: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Estándar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="calculation_type"
                  value="formula_based"
                  checked={config.calculation_type === 'formula_based'}
                  onChange={(e) => setConfig(prev => ({ ...prev, calculation_type: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Basado en Fórmulas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="calculation_type"
                  value="custom"
                  checked={config.calculation_type === 'custom'}
                  onChange={(e) => setConfig(prev => ({ ...prev, calculation_type: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Script Personalizado</span>
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {config.calculation_type === 'standard' && 'Sin cálculos personalizados'}
              {config.calculation_type === 'formula_based' && 'Use fórmulas matemáticas para calcular ingresos y deducciones'}
              {config.calculation_type === 'custom' && 'Use JavaScript/TypeScript para cálculos complejos'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Campos Personalizados
          </CardTitle>
          <CardDescription className="text-gray-600">
            Defina campos adicionales para almacenar en metadata de payroll
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Fields */}
          {Object.keys(config.custom_fields).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(config.custom_fields).map(([fieldName, field]) => (
                <div key={fieldName} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{fieldName}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{field.label}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(fieldName)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Etiqueta</label>
                      <Input
                        value={field.label}
                        onChange={(e) => handleUpdateField(fieldName, { label: e.target.value })}
                        className="text-sm"
                        placeholder="Descripción del campo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(fieldName, { type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="number">Número</option>
                        <option value="string">Texto</option>
                        <option value="boolean">Booleano</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Categoría</label>
                      <select
                        value={field.category}
                        onChange={(e) => handleUpdateField(fieldName, { category: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="earnings">Ingresos</option>
                        <option value="deductions">Deducciones</option>
                        <option value="calculation_helper">Ayudante de Cálculo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Valor por Defecto</label>
                      <Input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={field.default}
                        onChange={(e) => {
                          const value = field.type === 'number' 
                            ? parseFloat(e.target.value) || 0
                            : field.type === 'boolean'
                            ? e.target.value === 'true'
                            : e.target.value
                          handleUpdateField(fieldName, { default: value })
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay campos personalizados configurados
            </p>
          )}

          {/* Add New Field */}
          {showAddField ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Nombre del Campo (snake_case)
                  </label>
                  <Input
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="ej: horas_extras"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Etiqueta</label>
                    <Input
                      value={newField.label}
                      onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                      className="text-sm"
                      placeholder="Descripción"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                    <select
                      value={newField.type}
                      onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="number">Número</option>
                      <option value="string">Texto</option>
                      <option value="boolean">Booleano</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Categoría</label>
                    <select
                      value={newField.category}
                      onChange={(e) => setNewField(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="earnings">Ingresos</option>
                      <option value="deductions">Deducciones</option>
                      <option value="calculation_helper">Ayudante de Cálculo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Valor por Defecto</label>
                    <Input
                      type={newField.type === 'number' ? 'number' : 'text'}
                      value={newField.default}
                      onChange={(e) => {
                        const value = newField.type === 'number' 
                          ? parseFloat(e.target.value) || 0
                          : newField.type === 'boolean'
                          ? e.target.value === 'true'
                          : e.target.value
                        setNewField(prev => ({ ...prev, default: value }))
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddField}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Campo
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddField(false)
                      setNewFieldName('')
                      setNewField({
                        label: '',
                        type: 'number',
                        category: 'earnings',
                        required: false,
                        default: 0
                      })
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowAddField(true)}
              variant="outline"
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Campo Personalizado
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Calculation Formulas (only for formula_based) */}
      {config.calculation_type === 'formula_based' && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Fórmulas de Cálculo
            </CardTitle>
            <CardDescription className="text-gray-600">
              Configure fórmulas para calcular ingresos y deducciones adicionales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Earnings Formula */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Fórmula de Ingresos Adicionales
              </label>
              <Textarea
                value={config.calculation_config.earnings_formula || ''}
                onChange={(e) => handleUpdateFormula('earnings_formula', e.target.value)}
                placeholder="ej: horas_extras + feriado_trabajado + estipendio_transporte"
                className="font-mono text-sm"
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use nombres de campos separados por operadores: +, -, *, /, ()
              </p>
            </div>

            {/* Deductions Formula */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Fórmula de Deducciones Adicionales
              </label>
              <Textarea
                value={config.calculation_config.deductions_formula || ''}
                onChange={(e) => handleUpdateFormula('deductions_formula', e.target.value)}
                placeholder="ej: comedor + cooperativa_aportaciones + embargo_alimentos"
                className="font-mono text-sm"
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use nombres de campos separados por operadores: +, -, *, /, ()
              </p>
            </div>

            {/* Custom Calculations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">
                  Cálculos Personalizados
                </label>
                <Button
                  onClick={handleAddCustomCalculation}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
              {config.calculation_config.custom_calculations && 
               Object.keys(config.calculation_config.custom_calculations).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(config.calculation_config.custom_calculations).map(([fieldName, formula]) => (
                    <div key={fieldName} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">{fieldName}</div>
                        <Input
                          value={formula}
                          onChange={(e) => handleUpdateCustomCalculation(fieldName, e.target.value)}
                          placeholder="ej: coalesce(metadata.valor_hora_extra, baseSalary / 220 * 1.5)"
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCustomCalculation(fieldName)}
                        className="text-red-400 hover:text-red-300 mt-5"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  No hay cálculos personalizados
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Soporta: coalesce(), metadata.campo, baseSalary, operadores matemáticos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Script (only for custom type) */}
      {config.calculation_type === 'custom' && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Code className="h-5 w-5" />
              Script de Cálculo Personalizado
            </CardTitle>
            <CardDescription className="text-gray-600">
              Escriba código JavaScript/TypeScript para cálculos complejos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700">
                ⚠️ Solo para super_admins. El script debe retornar un objeto con:
                totalIngresosAdicionales, totalDeduccionesAdicionales, calculatedFields
              </p>
            </div>
            <Textarea
              value={config.calculation_script || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, calculation_script: e.target.value }))}
              placeholder={`function calculatePayroll(baseSalary, metadata) {
  // Su lógica aquí
  return {
    totalIngresosAdicionales: 0,
    totalDeduccionesAdicionales: 0,
    calculatedFields: {}
  }
}`}
              className="font-mono text-sm"
              rows={15}
            />
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={loadConfig}
          variant="outline"
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

