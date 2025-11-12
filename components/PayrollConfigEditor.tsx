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
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Hash,
  Type,
  ToggleLeft,
  Info
} from 'lucide-react'

interface CustomField {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' // Solo earnings o deductions
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
  console.log('🚀 PayrollConfigEditor: Component mounted/rendered', { companyId })
  
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
    category: 'earnings', // Solo earnings o deductions
    required: false,
    default: 0
  })

  const [showAddField, setShowAddField] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load current configuration
  useEffect(() => {
    loadConfig()
  }, [companyId])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    
    console.log('🔄 PayrollConfigEditor: Loading config for companyId:', companyId)
    
    try {
      // Send companyId in query for super_admin support
      const url = companyId ? `/api/payroll/config?company_id=${companyId}` : '/api/payroll/config'
      const response = await fetch(url)
      console.log('📡 PayrollConfigEditor: API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ PayrollConfigEditor: API response data:', data)
        
        if (data.config) {
          setConfig({
            calculation_type: data.config.calculation_type || 'standard',
            custom_fields: data.config.custom_fields || {},
            calculation_config: data.config.calculation_config || {},
            calculation_script: data.config.calculation_script || null
          })
          console.log('✅ PayrollConfigEditor: Config loaded successfully')
        } else {
          // No config exists yet, use defaults
          console.log('ℹ️ PayrollConfigEditor: No config found, using defaults')
          setConfig({
            calculation_type: 'standard',
            custom_fields: {},
            calculation_config: {},
            calculation_script: null
          })
        }
      } else {
        // No config exists yet, use defaults
        const errorData = await response.json().catch(() => ({}))
        console.log('⚠️ PayrollConfigEditor: API returned non-OK status, using defaults:', errorData)
        setConfig({
          calculation_type: 'standard',
          custom_fields: {},
          calculation_config: {},
          calculation_script: null
        })
      }
    } catch (err: any) {
      console.error('❌ PayrollConfigEditor: Error loading config:', err)
      setError('Error cargando configuración: ' + (err.message || 'Error desconocido'))
    } finally {
      setLoading(false)
      console.log('🏁 PayrollConfigEditor: Loading complete')
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
          company_id: companyId, // Include companyId for super_admin support
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
      
      // Reload config to ensure it's fresh
      await loadConfig()
      
      onSave?.()
      
      // Trigger a custom event to notify other components to reload
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payrollConfigUpdated', { detail: { companyId } }))
      }
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
      category: 'earnings', // Solo earnings o deductions
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
    console.log('⏳ PayrollConfigEditor: Rendering loading state')
    return (
      <Card variant="glass" className="p-6">
        <CardContent className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-white mb-2" />
          <p className="text-white">Cargando configuración...</p>
          <p className="text-xs text-gray-300 mt-2">Company ID: {companyId}</p>
        </CardContent>
      </Card>
    )
  }
  
  console.log('🎨 PayrollConfigEditor: Rendering main content', { config, error, companyId })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="glass" className="p-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Payroll por Empresa
          </CardTitle>
          <CardDescription className="text-gray-300">
            Configure campos personalizados y fórmulas de cálculo específicas para su empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/50 rounded-lg flex items-center gap-2 text-red-300">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded-lg flex items-center gap-2 text-green-300">
              <CheckCircle className="h-4 w-4" />
              <span>Configuración guardada exitosamente</span>
            </div>
          )}

          {/* Calculation Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
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
                  className="w-4 h-4 text-brand-400"
                />
                <span className="text-white">Estándar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="calculation_type"
                  value="formula_based"
                  checked={config.calculation_type === 'formula_based'}
                  onChange={(e) => setConfig(prev => ({ ...prev, calculation_type: e.target.value as any }))}
                  className="w-4 h-4 text-brand-400"
                />
                <span className="text-white">Basado en Fórmulas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="calculation_type"
                  value="custom"
                  checked={config.calculation_type === 'custom'}
                  onChange={(e) => setConfig(prev => ({ ...prev, calculation_type: e.target.value as any }))}
                  className="w-4 h-4 text-brand-400"
                />
                <span className="text-white">Script Personalizado</span>
              </label>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              {config.calculation_type === 'standard' && 'Sin cálculos personalizados'}
              {config.calculation_type === 'formula_based' && 'Use fórmulas matemáticas para calcular ingresos y deducciones'}
              {config.calculation_type === 'custom' && 'Use JavaScript/TypeScript para cálculos complejos'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card variant="glass" className="p-6">
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Campos Personalizados
              </CardTitle>
              <CardDescription className="text-gray-300 mt-1">
                Defina campos adicionales que se sumarán o restarán automáticamente según su categoría
              </CardDescription>
            </div>
            {/* Statistics */}
            {Object.keys(config.custom_fields).length > 0 && (
              <div className="flex gap-3">
                <div className="text-center px-3 py-2 glass rounded-lg border border-green-400/20">
                  <div className="text-2xl font-bold text-green-300">
                    {Object.entries(config.custom_fields).filter(([_, f]) => f.category === 'earnings').length}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Ingresos</div>
                </div>
                <div className="text-center px-3 py-2 glass rounded-lg border border-red-400/20">
                  <div className="text-2xl font-bold text-red-300">
                    {Object.entries(config.custom_fields).filter(([_, f]) => f.category === 'deductions').length}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Deducciones</div>
                </div>
                <div className="text-center px-3 py-2 glass rounded-lg border border-white/20">
                  <div className="text-2xl font-bold text-white">
                    {Object.keys(config.custom_fields).length}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Total</div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          {Object.keys(config.custom_fields).length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar campos por nombre o etiqueta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-glass text-white placeholder:text-white/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          
          {/* Existing Fields - Grouped by Category */}
          {Object.keys(config.custom_fields).length > 0 ? (
            <div className="space-y-6">
              {/* Earnings Section */}
              {Object.entries(config.custom_fields).filter(([_, field]) => field.category === 'earnings').length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    Ingresos (Suman al salario)
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(config.custom_fields)
                      .filter(([fieldName, field]) => {
                        const matchesCategory = field.category === 'earnings'
                        const matchesSearch = !searchQuery || 
                          fieldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          field.label.toLowerCase().includes(searchQuery.toLowerCase())
                        return matchesCategory && matchesSearch
                      })
                      .map(([fieldName, field]) => (
                <div key={fieldName} className="p-5 glass border border-white/20 rounded-lg glass-list-item">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {field.type === 'number' && <Hash className="h-4 w-4 text-blue-300" />}
                          {field.type === 'string' && <Type className="h-4 w-4 text-purple-300" />}
                          {field.type === 'boolean' && <ToggleLeft className="h-4 w-4 text-yellow-300" />}
                          <span className="font-semibold text-white text-base">{fieldName}</span>
                        </div>
                        <Badge variant="outline" className={`text-xs px-2 py-0.5 flex items-center gap-1 ${
                          field.category === 'earnings' 
                            ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                            : 'bg-red-500/20 text-red-300 border-red-400/30'
                        }`}>
                          {field.category === 'earnings' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {field.category === 'earnings' ? 'Ingreso' : 'Deducción'}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/20 px-2 py-0.5">
                          {field.type === 'number' ? 'Número' : field.type === 'string' ? 'Texto' : 'Booleano'}
                        </Badge>
                        {field.required && (
                          <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-300 border-orange-400/30 px-2 py-0.5">
                            Requerido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-300">{field.label || 'Sin descripción'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(fieldName)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-white mb-1">Etiqueta</label>
                      <Input
                        value={field.label}
                        onChange={(e) => handleUpdateField(fieldName, { label: e.target.value })}
                        className="text-sm input-glass text-white placeholder:text-white/70"
                        placeholder="Descripción del campo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white mb-1">Tipo</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(fieldName, { type: e.target.value as any })}
                        className="w-full px-3 py-2 input-glass text-white text-sm"
                      >
                        <option value="number">Número</option>
                        <option value="string">Texto</option>
                        <option value="boolean">Booleano</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white mb-1">Categoría</label>
                      <select
                        value={field.category}
                        onChange={(e) => handleUpdateField(fieldName, { category: e.target.value as 'earnings' | 'deductions' })}
                        className="w-full px-3 py-2 input-glass text-white text-sm"
                      >
                        <option value="earnings">Ingresos (Suman al salario)</option>
                        <option value="deductions">Deducciones (Restan al salario)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white mb-1">Valor por Defecto</label>
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
                        className="text-sm input-glass text-white placeholder:text-white/70"
                      />
                    </div>
                  </div>
                </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Deductions Section */}
              {Object.entries(config.custom_fields).filter(([_, field]) => field.category === 'deductions').length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    Deducciones (Restan al salario)
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(config.custom_fields)
                      .filter(([fieldName, field]) => {
                        const matchesCategory = field.category === 'deductions'
                        const matchesSearch = !searchQuery || 
                          fieldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          field.label.toLowerCase().includes(searchQuery.toLowerCase())
                        return matchesCategory && matchesSearch
                      })
                      .map(([fieldName, field]) => (
                        <div key={fieldName} className="p-5 glass border border-white/20 rounded-lg glass-list-item">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  {field.type === 'number' && <Hash className="h-4 w-4 text-blue-300" />}
                                  {field.type === 'string' && <Type className="h-4 w-4 text-purple-300" />}
                                  {field.type === 'boolean' && <ToggleLeft className="h-4 w-4 text-yellow-300" />}
                                  <span className="font-semibold text-white text-base">{fieldName}</span>
                                </div>
                                <Badge variant="outline" className={`text-xs px-2 py-0.5 flex items-center gap-1 ${
                                  field.category === 'earnings' 
                                    ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                                    : 'bg-red-500/20 text-red-300 border-red-400/30'
                                }`}>
                                  {field.category === 'earnings' ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {field.category === 'earnings' ? 'Ingreso' : 'Deducción'}
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/20 px-2 py-0.5">
                                  {field.type === 'number' ? 'Número' : field.type === 'string' ? 'Texto' : 'Booleano'}
                                </Badge>
                                {field.required && (
                                  <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-300 border-orange-400/30 px-2 py-0.5">
                                    Requerido
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-300">{field.label || 'Sin descripción'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveField(fieldName)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="block text-xs text-white mb-1">Etiqueta</label>
                              <Input
                                value={field.label}
                                onChange={(e) => handleUpdateField(fieldName, { label: e.target.value })}
                                className="text-sm input-glass text-white placeholder:text-white/70"
                                placeholder="Descripción del campo"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-white mb-1">Tipo</label>
                              <select
                                value={field.type}
                                onChange={(e) => handleUpdateField(fieldName, { type: e.target.value as any })}
                                className="w-full px-3 py-2 input-glass text-white text-sm"
                              >
                                <option value="number">Número</option>
                                <option value="string">Texto</option>
                                <option value="boolean">Booleano</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-white mb-1">Categoría</label>
                              <select
                                value={field.category}
                                onChange={(e) => handleUpdateField(fieldName, { category: e.target.value as 'earnings' | 'deductions' })}
                                className="w-full px-3 py-2 input-glass text-white text-sm"
                              >
                                <option value="earnings">Ingresos (Suman al salario)</option>
                                <option value="deductions">Deducciones (Restan al salario)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-white mb-1">Valor por Defecto</label>
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
                                className="text-sm input-glass text-white placeholder:text-white/70"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 glass border border-white/10 rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4 opacity-50" />
              <p className="text-sm text-gray-300 font-medium mb-1">No hay campos personalizados configurados</p>
              <p className="text-xs text-gray-400 mb-4">Agrega campos personalizados que se sumarán o restarán automáticamente al salario</p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span>Ingresos suman</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-400" />
                  <span>Deducciones restan</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Empty State for Search */}
          {Object.keys(config.custom_fields).length > 0 && searchQuery && 
            Object.entries(config.custom_fields).filter(([fieldName, field]) => {
              const matchesSearch = fieldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                field.label.toLowerCase().includes(searchQuery.toLowerCase())
              return matchesSearch
            }).length === 0 && (
              <div className="text-center py-8 glass border border-white/10 rounded-lg">
                <Search className="h-8 w-8 mx-auto text-gray-400 mb-3 opacity-50" />
                <p className="text-sm text-gray-300 font-medium">No se encontraron campos</p>
                <p className="text-xs text-gray-400 mt-1">Intenta con otro término de búsqueda</p>
              </div>
            )
          }

          {/* Add New Field */}
          {showAddField ? (
            <div className="p-5 glass border border-white/20 rounded-lg border-dashed">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-5 w-5 text-brand-400" />
                  <h4 className="font-semibold text-white">Nuevo Campo Personalizado</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Nombre del Campo (snake_case) *
                  </label>
                  <Input
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="ej: horas_extras"
                    className="input-glass text-white placeholder:text-white/70"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Etiqueta</label>
                    <Input
                      value={newField.label}
                      onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                      className="input-glass text-white placeholder:text-white/70"
                      placeholder="Descripción del campo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Tipo</label>
                    <select
                      value={newField.type}
                      onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 input-glass text-white text-sm"
                    >
                      <option value="number">Número</option>
                      <option value="string">Texto</option>
                      <option value="boolean">Booleano</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Categoría</label>
                    <select
                      value={newField.category}
                      onChange={(e) => setNewField(prev => ({ ...prev, category: e.target.value as 'earnings' | 'deductions' }))}
                      className="w-full px-3 py-2 input-glass text-white text-sm"
                    >
                      <option value="earnings">Ingresos (Suman al salario)</option>
                      <option value="deductions">Deducciones (Restan al salario)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Valor por Defecto</label>
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
                      className="input-glass text-white placeholder:text-white/70"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleAddField}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
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
                    className="border-white/20 hover:bg-white/10 hover:border-white/30"
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
              className="w-full border-dashed border-white/20 hover:border-white/30 hover:bg-white/5 py-3"
            >
              <Plus className="h-5 w-5 mr-2" />
              Agregar Campo Personalizado
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Calculation Formulas (only for formula_based) */}
      {config.calculation_type === 'formula_based' && (
        <Card variant="glass" className="p-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Fórmulas de Cálculo
            </CardTitle>
            <CardDescription className="text-gray-300">
              Configure fórmulas para calcular ingresos y deducciones adicionales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Earnings Formula */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Fórmula de Ingresos Adicionales
              </label>
              <Textarea
                value={config.calculation_config.earnings_formula || ''}
                onChange={(e) => handleUpdateFormula('earnings_formula', e.target.value)}
                placeholder="ej: horas_extras + feriado_trabajado + estipendio_transporte"
                className="font-mono text-sm input-glass text-white placeholder:text-white/70"
                rows={2}
              />
              <p className="text-xs text-gray-300 mt-1">
                Use nombres de campos separados por operadores: +, -, *, /, ()
              </p>
            </div>

            {/* Deductions Formula */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Fórmula de Deducciones Adicionales
              </label>
              <Textarea
                value={config.calculation_config.deductions_formula || ''}
                onChange={(e) => handleUpdateFormula('deductions_formula', e.target.value)}
                placeholder="ej: comedor + cooperativa_aportaciones + embargo_alimentos"
                className="font-mono text-sm input-glass text-white placeholder:text-white/70"
                rows={2}
              />
              <p className="text-xs text-gray-300 mt-1">
                Use nombres de campos separados por operadores: +, -, *, /, ()
              </p>
            </div>

            {/* Custom Calculations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-white">
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
                <div className="space-y-3">
                  {Object.entries(config.calculation_config.custom_calculations).map(([fieldName, formula]) => (
                    <div key={fieldName} className="p-3 glass border border-white/10 rounded-lg glass-list-item">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <Code className="h-4 w-4 text-brand-400" />
                            {fieldName}
                          </div>
                          <Input
                            value={formula}
                            onChange={(e) => handleUpdateCustomCalculation(fieldName, e.target.value)}
                            placeholder="ej: coalesce(metadata.valor_hora_extra, baseSalary / 220 * 1.5)"
                            className="font-mono text-sm input-glass text-white placeholder:text-white/70"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCustomCalculation(fieldName)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 mt-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 glass border border-white/10 rounded-lg">
                  <Code className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-300">No hay cálculos personalizados</p>
                  <p className="text-xs text-gray-400 mt-1">Agrega cálculos personalizados para fórmulas avanzadas</p>
                </div>
              )}
              <p className="text-xs text-gray-300 mt-2">
                Soporta: coalesce(), metadata.campo, baseSalary, operadores matemáticos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Script (only for custom type) */}
      {config.calculation_type === 'custom' && (
        <Card variant="glass" className="p-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Code className="h-5 w-5" />
              Script de Cálculo Personalizado
            </CardTitle>
            <CardDescription className="text-gray-300">
              Escriba código JavaScript/TypeScript para cálculos complejos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 p-3 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
              <p className="text-xs text-yellow-300">
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
              className="font-mono text-sm input-glass text-white placeholder:text-white/70"
              rows={15}
            />
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <Card variant="glass" className="p-4">
        <div className="flex justify-end gap-3">
          <Button
            onClick={loadConfig}
            variant="outline"
            disabled={saving}
            className="border-white/20 hover:bg-white/10 hover:border-white/30"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium"
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
      </Card>
    </div>
  )
}

