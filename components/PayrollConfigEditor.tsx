import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { ConfirmationDialog } from './ui/confirmation-dialog'
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
  Info,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  Coins,
  CheckSquare,
  Square
} from 'lucide-react'

interface CustomField {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' // Solo earnings o deductions
  required: boolean
  default: any
}

interface PayrollConfig {
  // Configuración básica de payroll
  payment_frequency: 'monthly' | 'biweekly' // mensual o quincenal
  currency: 'HNL' | 'USD' // Lempiras o Dólares
  legal_deductions: {
    ihss: boolean
    rap: boolean
    isr: boolean
    infop: boolean
  }
  payment_cut_dates: {
    // Para quincenal
    biweekly_type?: 'standard' | 'custom' // standard: 1-15, 16-30 | custom: personalizado
    biweekly_first_start?: number // día inicio primera quincena (default: 1)
    biweekly_first_end?: number // día fin primera quincena (default: 15)
    biweekly_second_start?: number // día inicio segunda quincena (default: 16)
    biweekly_second_end?: number // día fin segunda quincena (default: 30)
    // Para mensual
    monthly_type?: 'standard' | 'custom' // standard: 1-30 | custom: personalizado
    monthly_start?: number // día inicio mes (default: 1)
    monthly_end?: number // día fin mes (default: 30)
  }
  // Campos personalizados (mantener compatibilidad)
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
    payment_frequency: 'biweekly',
    currency: 'HNL',
    legal_deductions: {
      ihss: true,
      rap: true,
      isr: true,
      infop: false
    },
    payment_cut_dates: {
      biweekly_first_start: 1,
      biweekly_first_end: 15,
      biweekly_second_start: 16,
      biweekly_second_end: 30,
      monthly_start: 1,
      monthly_end: 30
    },
    custom_fields: {},
    calculation_config: {},
    calculation_script: null
  })

  const [initialConfig, setInitialConfig] = useState<PayrollConfig | null>(null)

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
  const [expandedSections, setExpandedSections] = useState({
    earnings: false, // Retraída por defecto
    deductions: false, // Retraída por defecto
    paymentFrequency: false, // Retraída por defecto
    currency: false, // Retraída por defecto
    legalDeductions: false, // Retraída por defecto
    paymentCutDates: false // Retraída por defecto
  })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState('')

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
          const loadedConfig: PayrollConfig = {
            payment_frequency: data.config.payment_frequency || 'biweekly',
            currency: data.config.currency || 'HNL',
            legal_deductions: {
              ihss: data.config.legal_deductions?.ihss ?? true,
              rap: data.config.legal_deductions?.rap ?? true,
              isr: data.config.legal_deductions?.isr ?? true,
              infop: data.config.legal_deductions?.infop ?? false
            },
            payment_cut_dates: {
              biweekly_type: data.config.payment_cut_dates?.biweekly_type || 'standard',
              biweekly_first_start: data.config.payment_cut_dates?.biweekly_first_start ?? 1,
              biweekly_first_end: data.config.payment_cut_dates?.biweekly_first_end ?? 15,
              biweekly_second_start: data.config.payment_cut_dates?.biweekly_second_start ?? 16,
              biweekly_second_end: data.config.payment_cut_dates?.biweekly_second_end ?? 30,
              monthly_type: data.config.payment_cut_dates?.monthly_type || 'standard',
              monthly_start: data.config.payment_cut_dates?.monthly_start ?? 1,
              monthly_end: data.config.payment_cut_dates?.monthly_end ?? 30
            },
            custom_fields: data.config.custom_fields || {},
            calculation_config: data.config.calculation_config || {},
            calculation_script: data.config.calculation_script || null
          }
          setConfig(loadedConfig)
          setInitialConfig(loadedConfig) // Guardar como referencia inicial
          console.log('✅ PayrollConfigEditor: Config loaded successfully')
        } else {
          // No config exists yet, use defaults
          console.log('ℹ️ PayrollConfigEditor: No config found, using defaults')
          const defaultConfig: PayrollConfig = {
            payment_frequency: 'biweekly',
            currency: 'HNL',
            legal_deductions: {
              ihss: true,
              rap: true,
              isr: true,
              infop: false
            },
            payment_cut_dates: {
              biweekly_type: 'standard',
              biweekly_first_start: 1,
              biweekly_first_end: 15,
              biweekly_second_start: 16,
              biweekly_second_end: 30,
              monthly_type: 'standard',
              monthly_start: 1,
              monthly_end: 30
            },
            custom_fields: {},
            calculation_config: {},
            calculation_script: null
          }
          setConfig(defaultConfig)
          setInitialConfig(defaultConfig)
        }
      } else {
        // No config exists yet, use defaults
        const errorData = await response.json().catch(() => ({}))
        console.log('⚠️ PayrollConfigEditor: API returned non-OK status, using defaults:', errorData)
        const defaultConfig: PayrollConfig = {
          payment_frequency: 'biweekly',
          currency: 'HNL',
          legal_deductions: {
            ihss: true,
            rap: true,
            isr: true,
            infop: false
          },
          payment_cut_dates: {
            biweekly_type: 'standard',
            biweekly_first_start: 1,
            biweekly_first_end: 15,
            biweekly_second_start: 16,
            biweekly_second_end: 30,
            monthly_type: 'standard',
            monthly_start: 1,
            monthly_end: 30
          },
          custom_fields: {},
          calculation_config: {},
          calculation_script: null
        }
        setConfig(defaultConfig)
        setInitialConfig(defaultConfig)
      }
    } catch (err: any) {
      console.error('❌ PayrollConfigEditor: Error loading config:', err)
      setError('Error cargando configuración: ' + (err.message || 'Error desconocido'))
    } finally {
      setLoading(false)
      console.log('🏁 PayrollConfigEditor: Loading complete')
    }
  }

  const handleSaveClick = () => {
    // Validar fechas de corte según el tipo de pago
    if (config.payment_frequency === 'biweekly') {
      if (!config.payment_cut_dates.biweekly_first_start || !config.payment_cut_dates.biweekly_first_end ||
          !config.payment_cut_dates.biweekly_second_start || !config.payment_cut_dates.biweekly_second_end) {
        setError('Las fechas de corte para pago quincenal son requeridas')
        return
      }
    } else if (config.payment_frequency === 'monthly') {
      if (!config.payment_cut_dates.monthly_start || !config.payment_cut_dates.monthly_end) {
        setError('Las fechas de corte para pago mensual son requeridas')
        return
      }
    }

    // Obtener descripción de cambios y mostrar dialog de confirmación
    const { action, description } = getChangesDescription()
    setConfirmAction(action)
    setShowConfirmDialog(true)
  }

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false)
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/payroll/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId, // Include companyId for super_admin support
          payment_frequency: config.payment_frequency,
          currency: config.currency,
          legal_deductions: config.legal_deductions,
          payment_cut_dates: config.payment_cut_dates,
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

  // Función para detectar si hay cambios
  const hasChanges = (): boolean => {
    if (!initialConfig) return false
    
    // Comparar payment_frequency
    if (config.payment_frequency !== initialConfig.payment_frequency) return true
    
    // Comparar currency
    if (config.currency !== initialConfig.currency) return true
    
    // Comparar legal_deductions (deep comparison)
    const deductionsStr = JSON.stringify(config.legal_deductions)
    const initialDeductionsStr = JSON.stringify(initialConfig.legal_deductions)
    if (deductionsStr !== initialDeductionsStr) return true
    
    // Comparar payment_cut_dates (deep comparison)
    const cutDatesStr = JSON.stringify(config.payment_cut_dates)
    const initialCutDatesStr = JSON.stringify(initialConfig.payment_cut_dates)
    if (cutDatesStr !== initialCutDatesStr) return true
    
    // Comparar calculation_script
    if (config.calculation_script !== initialConfig.calculation_script) return true
    
    // Comparar calculation_config (deep comparison)
    const configStr = JSON.stringify(config.calculation_config)
    const initialStr = JSON.stringify(initialConfig.calculation_config)
    if (configStr !== initialStr) return true
    
    // Comparar custom_fields (deep comparison)
    const fieldsStr = JSON.stringify(config.custom_fields)
    const initialFieldsStr = JSON.stringify(initialConfig.custom_fields)
    if (fieldsStr !== initialFieldsStr) return true
    
    return false
  }

  // Función para detectar qué cambios se están haciendo y generar mensaje de confirmación
  const getChangesDescription = (): { action: string, description: string } => {
    if (!initialConfig) {
      return { action: 'guardar configuración', description: 'Está guardando la configuración inicial de payroll' }
    }

    const changes: string[] = []
    
    // Detectar cambios específicos
    if (config.payment_frequency !== initialConfig.payment_frequency) {
      const oldFreq = initialConfig.payment_frequency === 'biweekly' ? 'quincenal' : 'mensual'
      const newFreq = config.payment_frequency === 'biweekly' ? 'quincenal' : 'mensual'
      changes.push(`frecuencia de pago de ${oldFreq} a ${newFreq}`)
    }
    
    if (config.currency !== initialConfig.currency) {
      const oldCurr = initialConfig.currency === 'HNL' ? 'Lempiras' : 'Dólares'
      const newCurr = config.currency === 'HNL' ? 'Lempiras' : 'Dólares'
      changes.push(`moneda de ${oldCurr} a ${newCurr}`)
    }
    
    const deductionsStr = JSON.stringify(config.legal_deductions)
    const initialDeductionsStr = JSON.stringify(initialConfig.legal_deductions)
    if (deductionsStr !== initialDeductionsStr) {
      changes.push('deducciones legales')
    }
    
    const cutDatesStr = JSON.stringify(config.payment_cut_dates)
    const initialCutDatesStr = JSON.stringify(initialConfig.payment_cut_dates)
    if (cutDatesStr !== initialCutDatesStr) {
      changes.push('fechas de corte de pago')
    }
    
    if (config.calculation_script !== initialConfig.calculation_script) {
      changes.push('script de cálculo')
    }
    
    const configStr = JSON.stringify(config.calculation_config)
    const initialStr = JSON.stringify(initialConfig.calculation_config)
    if (configStr !== initialStr) {
      changes.push('configuración de cálculo')
    }
    
    const fieldsStr = JSON.stringify(config.custom_fields)
    const initialFieldsStr = JSON.stringify(initialConfig.custom_fields)
    if (fieldsStr !== initialFieldsStr) {
      const oldFieldsCount = Object.keys(initialConfig.custom_fields).length
      const newFieldsCount = Object.keys(config.custom_fields).length
      if (newFieldsCount > oldFieldsCount) {
        changes.push(`campos personalizados (agregado${newFieldsCount - oldFieldsCount > 1 ? 's' : ''} ${newFieldsCount - oldFieldsCount} campo${newFieldsCount - oldFieldsCount > 1 ? 's' : ''})`)
      } else if (newFieldsCount < oldFieldsCount) {
        changes.push(`campos personalizados (eliminado${oldFieldsCount - newFieldsCount > 1 ? 's' : ''} ${oldFieldsCount - newFieldsCount} campo${oldFieldsCount - newFieldsCount > 1 ? 's' : ''})`)
      } else {
        changes.push('campos personalizados')
      }
    }

    if (changes.length === 0) {
      return { action: 'guardar configuración', description: 'No se detectaron cambios' }
    }

    const actionText = changes.length === 1 
      ? `modificar ${changes[0]}`
      : `modificar ${changes.length} configuraciones`

    const descriptionText = changes.length === 1
      ? `Está modificando ${changes[0]}. Esta acción afectará los cálculos de nómina futuros.`
      : `Está modificando las siguientes configuraciones: ${changes.join(', ')}. Esta acción afectará los cálculos de nómina futuros.`

    return { action: actionText, description: descriptionText }
  }

  // Función para cancelar cambios y restaurar configuración inicial
  const handleCancel = () => {
    if (initialConfig) {
      setConfig(initialConfig)
      setError(null)
      setSuccess(false)
    }
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
            Configure la frecuencia de pago, moneda, deducciones de ley y fechas de corte para su empresa
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

          {/* Configuración Básica de Payroll */}
          <div className="space-y-6">
            {/* Tipo de Pago */}
            <div className="glass border border-white/20 rounded-lg p-4">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, paymentFrequency: !prev.paymentFrequency }))}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-blue-300" />
                  <label className="text-sm font-medium text-white">
                    Frecuencia de Pago
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.paymentFrequency ? (
                    <ChevronUp className="h-5 w-5 text-blue-300 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-blue-300 transition-transform duration-200" />
                  )}
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedSections.paymentFrequency ? 'max-h-[200px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}>
                <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-blue-400/50 transition-colors">
                  <input
                    type="radio"
                    name="payment_frequency"
                    value="biweekly"
                    checked={config.payment_frequency === 'biweekly'}
                    onChange={(e) => setConfig(prev => ({ ...prev, payment_frequency: e.target.value as 'biweekly' | 'monthly' }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-white">Quincenal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-blue-400/50 transition-colors">
                  <input
                    type="radio"
                    name="payment_frequency"
                    value="monthly"
                    checked={config.payment_frequency === 'monthly'}
                    onChange={(e) => setConfig(prev => ({ ...prev, payment_frequency: e.target.value as 'biweekly' | 'monthly' }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-white">Mensual</span>
                </label>
                </div>
              </div>
            </div>

            {/* Moneda */}
            <div className="glass border border-white/20 rounded-lg p-4">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, currency: !prev.currency }))}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Coins className="h-4 w-4 text-yellow-300" />
                  <label className="text-sm font-medium text-white">
                    Moneda
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.currency ? (
                    <ChevronUp className="h-5 w-5 text-yellow-300 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-yellow-300 transition-transform duration-200" />
                  )}
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedSections.currency ? 'max-h-[200px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}>
                <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-blue-400/50 transition-colors">
                  <input
                    type="radio"
                    name="currency"
                    value="HNL"
                    checked={config.currency === 'HNL'}
                    onChange={(e) => setConfig(prev => ({ ...prev, currency: e.target.value as 'HNL' | 'USD' }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <DollarSign className="h-4 w-4 text-green-300" />
                  <span className="text-white">Lempiras (HNL)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-blue-400/50 transition-colors">
                  <input
                    type="radio"
                    name="currency"
                    value="USD"
                    checked={config.currency === 'USD'}
                    onChange={(e) => setConfig(prev => ({ ...prev, currency: e.target.value as 'HNL' | 'USD' }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <DollarSign className="h-4 w-4 text-blue-300" />
                  <span className="text-white">Dólares (USD)</span>
                </label>
                </div>
              </div>
            </div>

            {/* Deducciones de Ley */}
            <div className="glass border border-white/20 rounded-lg p-4">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, legalDeductions: !prev.legalDeductions }))}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-4 w-4 text-purple-300" />
                  <label className="text-sm font-medium text-white">
                    Deducciones de Ley
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.legalDeductions ? (
                    <ChevronUp className="h-5 w-5 text-purple-300 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-purple-300 transition-transform duration-200" />
                  )}
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedSections.legalDeductions ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}>
                <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-purple-400/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.legal_deductions.ihss}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      legal_deductions: { ...prev.legal_deductions, ihss: e.target.checked }
                    }))}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-white">IHSS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-purple-400/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.legal_deductions.rap}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      legal_deductions: { ...prev.legal_deductions, rap: e.target.checked }
                    }))}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-white">RAP</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-purple-400/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.legal_deductions.isr}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      legal_deductions: { ...prev.legal_deductions, isr: e.target.checked }
                    }))}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-white">ISR</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-purple-400/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.legal_deductions.infop}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      legal_deductions: { ...prev.legal_deductions, infop: e.target.checked }
                    }))}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-white">INFOP</span>
                </label>
                </div>
              </div>
            </div>

            {/* Fechas de Corte */}
            <div className="glass border border-white/20 rounded-lg p-4">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, paymentCutDates: !prev.paymentCutDates }))}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-green-300" />
                  <label className="text-sm font-medium text-white">
                    Fechas de Corte de Pago
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.paymentCutDates ? (
                    <ChevronUp className="h-5 w-5 text-green-300 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-green-300 transition-transform duration-200" />
                  )}
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedSections.paymentCutDates ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}>
                {config.payment_frequency === 'biweekly' ? (
                <div className="space-y-4">
                  {/* Tipo de fechas quincenales */}
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer p-2 glass border border-white/20 rounded-lg hover:border-green-400/50 transition-colors">
                      <input
                        type="radio"
                        name="biweekly_type"
                        value="standard"
                        checked={(config.payment_cut_dates.biweekly_type || 'standard') === 'standard'}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            payment_cut_dates: {
                              ...prev.payment_cut_dates,
                              biweekly_type: 'standard',
                              biweekly_first_start: 1,
                              biweekly_first_end: 15,
                              biweekly_second_start: 16,
                              biweekly_second_end: 30
                            }
                          }))
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-white text-sm">Estándar (1-15, 16-30)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 glass border border-white/20 rounded-lg hover:border-green-400/50 transition-colors">
                      <input
                        type="radio"
                        name="biweekly_type"
                        value="custom"
                        checked={(config.payment_cut_dates.biweekly_type || 'standard') === 'custom'}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            payment_cut_dates: {
                              ...prev.payment_cut_dates,
                              biweekly_type: 'custom'
                            }
                          }))
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-white text-sm">Personalizado</span>
                    </label>
                  </div>
                  
                  {/* Campos de fechas quincenales */}
                  {(config.payment_cut_dates.biweekly_type || 'standard') === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-300 mb-2">Primera Quincena</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={config.payment_cut_dates.biweekly_first_start || 1}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_first_start: parseInt(e.target.value) || 1
                              }
                            }))}
                            className="w-20 input-glass text-white text-center"
                          />
                          <span className="text-white">al</span>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={config.payment_cut_dates.biweekly_first_end || 15}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_first_end: parseInt(e.target.value) || 15
                              }
                            }))}
                            className="w-20 input-glass text-white text-center"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-2">Segunda Quincena</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={config.payment_cut_dates.biweekly_second_start || 16}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_second_start: parseInt(e.target.value) || 16
                              }
                            }))}
                            className="w-20 input-glass text-white text-center"
                          />
                          <span className="text-white">al</span>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={config.payment_cut_dates.biweekly_second_end || 30}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_second_end: parseInt(e.target.value) || 30
                              }
                            }))}
                            className="w-20 input-glass text-white text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tipo de fechas mensuales */}
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer p-2 glass border border-white/20 rounded-lg hover:border-green-400/50 transition-colors">
                      <input
                        type="radio"
                        name="monthly_type"
                        value="standard"
                        checked={(config.payment_cut_dates.monthly_type || 'standard') === 'standard'}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            payment_cut_dates: {
                              ...prev.payment_cut_dates,
                              monthly_type: 'standard',
                              monthly_start: 1,
                              monthly_end: 30
                            }
                          }))
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-white text-sm">Estándar (1-30)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 glass border border-white/20 rounded-lg hover:border-green-400/50 transition-colors">
                      <input
                        type="radio"
                        name="monthly_type"
                        value="custom"
                        checked={(config.payment_cut_dates.monthly_type || 'standard') === 'custom'}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            payment_cut_dates: {
                              ...prev.payment_cut_dates,
                              monthly_type: 'custom'
                            }
                          }))
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-white text-sm">Personalizado</span>
                    </label>
                  </div>
                  
                  {/* Campos de fechas mensuales */}
                  {(config.payment_cut_dates.monthly_type || 'standard') === 'custom' && (
                    <div>
                      <label className="block text-xs text-gray-300 mb-2">Período Mensual</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={config.payment_cut_dates.monthly_start || 1}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            payment_cut_dates: {
                              ...prev.payment_cut_dates,
                              monthly_start: parseInt(e.target.value) || 1
                            }
                          }))}
                          className="w-20 input-glass text-white text-center"
                        />
                        <span className="text-white">al</span>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={config.payment_cut_dates.monthly_end || 30}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            payment_cut_dates: {
                              ...prev.payment_cut_dates,
                              monthly_end: parseInt(e.target.value) || 30
                            }
                          }))}
                          className="w-20 input-glass text-white text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
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
                <div className="glass border border-green-400/20 rounded-lg p-4">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, earnings: !prev.earnings }))}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-300" />
                        Ingresos (Suman al salario)
                      </h4>
                      <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300 border-green-400/30 px-2 py-0.5">
                        {Object.entries(config.custom_fields).filter(([_, f]) => f.category === 'earnings').length} campos
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedSections.earnings ? (
                        <ChevronUp className="h-5 w-5 text-green-300 transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-green-300 transition-transform duration-200" />
                      )}
                    </div>
                  </button>
                  <div className={`space-y-3 overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedSections.earnings ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}>
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
                <div className="glass border border-red-400/20 rounded-lg p-4">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, deductions: !prev.deductions }))}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-300" />
                        Deducciones (Restan al salario)
                      </h4>
                      <Badge variant="outline" className="text-xs bg-red-500/20 text-red-300 border-red-400/30 px-2 py-0.5">
                        {Object.entries(config.custom_fields).filter(([_, f]) => f.category === 'deductions').length} campos
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedSections.deductions ? (
                        <ChevronUp className="h-5 w-5 text-red-300 transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-red-300 transition-transform duration-200" />
                      )}
                    </div>
                  </button>
                  <div className={`space-y-3 overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedSections.deductions ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}>
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


      {/* Save Button - Solo mostrar si hay cambios */}
      {hasChanges() && (
        <Card variant="glass" className="p-4 border-yellow-400/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-300 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Tienes cambios sin guardar</span>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={saving}
                className="border-white/20 hover:bg-white/10 hover:border-white/30"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveClick}
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
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmSave}
        title="Confirmar Cambios en Configuración de Payroll"
        description={getChangesDescription().description}
        confirmText={confirmAction}
        confirmLabel="Confirmar Cambios"
        type="warning"
        loading={saving}
      />
    </div>
  )
}

