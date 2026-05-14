import React, { useState, useEffect, useMemo } from 'react'
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
  Square,
  Clock
} from 'lucide-react'

import { parseOrdinaryHoursOverrideInput } from '../lib/payroll/ordinary-hours-override'
import { cn } from '../lib/utils'

const ORDINARY_HOURS_PRESETS = [7, 7.5, 8, 8.5, 9] as const

interface CustomFieldParameter {
  key: string
  label: string
  type: 'number' | 'string'
  default: number | string
}

interface CustomField {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' | 'calculation_helper'
  required: boolean
  default: any
  formula?: string
  parameters?: CustomFieldParameter[]
  track_plazos?: boolean
}

interface PayrollConfig {
  // Configuración básica de payroll
  payment_frequency: 'monthly' | 'biweekly' | 'weekly' // mensual, quincenal o semanal
  currency: 'HNL' | 'USD' // Lempiras o Dólares
  calculation_mode?: 'daily' | 'hourly' // Por día (asistencia) o por hora exacta
  semanal_proration?: 'proportional' | 'fixed' // Semanal: proporcional a días o monto fijo (mensual/4)
  incomplete_record_default_hours?: number | null // Horas por defecto si falta check_out (solo hourly)
  /** Tope diario de horas ordinarias antes de HE; null = usar labor_laws.legal_daily_hours en el RPC. */
  ordinary_hours_override?: number | null
  legal_deductions: {
    ihss: boolean
    rap: boolean
    isr: boolean
    infop: boolean
  }
  payment_cut_dates: {
    // Para quincenal
    biweekly_type?: 'standard' | 'custom' // standard: 1-15, 16-30 | custom: personalizado
    // Para semanal (estándar: semanas 1-7, 8-14, 15-21, 22-fin)
    weekly_type?: 'standard' | 'custom'
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
    calculation_mode: 'daily',
    incomplete_record_default_hours: null,
    ordinary_hours_override: null,
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
  const [hasChangesState, setHasChangesState] = useState(false)

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
    calculationMode: false, // Método de cálculo (Por Día / Por Hora Exacta)
    currency: false, // Retraída por defecto
    legalDeductions: false, // Retraída por defecto
    paymentCutDates: false, // Retraída por defecto
    ordinaryDailyCap: false // Tope horas ordinarias / día (previo a extras)
  })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState('')
  const [periodPreview, setPeriodPreview] = useState<Array<{ label: string; fechaInicio: string; fechaFin: string }>>([])
  const [periodPreviewLoading, setPeriodPreviewLoading] = useState(false)
  /** Texto libre del tope diario; se valida al blur y al guardar (evita cierres al escribir "7."). */
  const [ordinaryHoursDraft, setOrdinaryHoursDraft] = useState('')

  // Load current configuration
  useEffect(() => {
    loadConfig()
  }, [companyId])

  // Vista previa de próximos periodos (con debounce)
  useEffect(() => {
    if (!companyId || !expandedSections.paymentCutDates) return
    const t = setTimeout(async () => {
      setPeriodPreviewLoading(true)
      try {
        const pf = config.payment_frequency === 'monthly' ? 'mensual' : config.payment_frequency === 'weekly' ? 'semanal' : 'quincenal'
        const res = await fetch('/api/payroll/upcoming-periods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_frequency: pf,
            payment_cut_dates: config.payment_cut_dates,
            count: 3
          })
        })
        if (res.ok) {
          const { periods } = await res.json()
          setPeriodPreview(periods || [])
        } else {
          setPeriodPreview([])
        }
      } catch {
        setPeriodPreview([])
      } finally {
        setPeriodPreviewLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [companyId, expandedSections.paymentCutDates, config.payment_frequency, config.payment_cut_dates])

  // Función para detectar si hay cambios (debe estar antes de useMemo)
  const hasChanges = (): boolean => {
    if (!initialConfig) return false
    
    // Comparar payment_frequency
    if (config.payment_frequency !== initialConfig.payment_frequency) return true
    
    // Comparar currency
    if (config.currency !== initialConfig.currency) return true
    
    // Comparar calculation_mode
    if ((config.calculation_mode ?? 'daily') !== (initialConfig.calculation_mode ?? 'daily')) return true
    if ((config.incomplete_record_default_hours ?? null) !== (initialConfig.incomplete_record_default_hours ?? null)) return true
    const tOrd = ordinaryHoursDraft.trim().replace(',', '.')
    if (tOrd === '') {
      if ((initialConfig.ordinary_hours_override ?? null) !== null) return true
    } else {
      const nOrd = parseOrdinaryHoursOverrideInput(tOrd)
      if (nOrd === null) return true
      if ((initialConfig.ordinary_hours_override ?? null) !== nOrd) return true
    }
    if ((config.semanal_proration ?? 'proportional') !== (initialConfig.semanal_proration ?? 'proportional')) return true
    
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

  // Calcular si hay cambios usando useMemo para mejor rendimiento
  const hasChangesResult = useMemo(() => {
    return hasChanges()
  }, [config, initialConfig, ordinaryHoursDraft])

  // Actualizar estado cuando cambie el resultado
  useEffect(() => {
    setHasChangesState(hasChangesResult)
  }, [hasChangesResult])

  // Helper function para construir PayrollConfig desde la respuesta de la API
  const buildPayrollConfigFromApiResponse = (apiConfig: any): PayrollConfig => {
    return {
      payment_frequency: apiConfig.payment_frequency || 'biweekly',
      currency: apiConfig.currency || 'HNL',
      calculation_mode: apiConfig.calculation_mode || 'daily',
      incomplete_record_default_hours: apiConfig.incomplete_record_default_hours ?? null,
      ordinary_hours_override:
        apiConfig.ordinary_hours_override != null && apiConfig.ordinary_hours_override !== ''
          ? Number(apiConfig.ordinary_hours_override)
          : null,
      legal_deductions: {
        ihss: apiConfig.legal_deductions?.ihss ?? true,
        rap: apiConfig.legal_deductions?.rap ?? true,
        isr: apiConfig.legal_deductions?.isr ?? true,
        infop: apiConfig.legal_deductions?.infop ?? false
      },
      semanal_proration: apiConfig.semanal_proration ?? 'proportional',
      payment_cut_dates: {
        biweekly_type: apiConfig.payment_cut_dates?.biweekly_type || 'standard',
        biweekly_first_start: apiConfig.payment_cut_dates?.biweekly_first_start ?? 1,
        biweekly_first_end: apiConfig.payment_cut_dates?.biweekly_first_end ?? 15,
        biweekly_second_start: apiConfig.payment_cut_dates?.biweekly_second_start ?? 16,
        biweekly_second_end: apiConfig.payment_cut_dates?.biweekly_second_end ?? 30,
        monthly_type: apiConfig.payment_cut_dates?.monthly_type || 'standard',
        monthly_start: apiConfig.payment_cut_dates?.monthly_start ?? 1,
        monthly_end: apiConfig.payment_cut_dates?.monthly_end ?? 30,
        weekly_type: apiConfig.payment_cut_dates?.weekly_type || 'standard'
      },
      custom_fields: apiConfig.custom_fields || {},
      calculation_config: apiConfig.calculation_config || {},
      calculation_script: apiConfig.calculation_script || null
    }
  }

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
          const loadedConfig = buildPayrollConfigFromApiResponse(data.config)
          setConfig(loadedConfig)
          setInitialConfig(loadedConfig) // Guardar como referencia inicial
          setOrdinaryHoursDraft(
            loadedConfig.ordinary_hours_override == null
              ? ''
              : String(loadedConfig.ordinary_hours_override)
          )
          console.log('✅ PayrollConfigEditor: Config loaded successfully')
        } else {
          // No config exists yet, use defaults
          console.log('ℹ️ PayrollConfigEditor: No config found, using defaults')
          const defaultConfig: PayrollConfig = {
            payment_frequency: 'biweekly',
            currency: 'HNL',
            calculation_mode: 'daily',
            incomplete_record_default_hours: null,
            ordinary_hours_override: null,
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
          setOrdinaryHoursDraft('')
        }
      } else {
        // No config exists yet, use defaults
        const errorData = await response.json().catch(() => ({}))
        console.log('⚠️ PayrollConfigEditor: API returned non-OK status, using defaults:', errorData)
        const defaultConfig: PayrollConfig = {
          payment_frequency: 'biweekly',
          currency: 'HNL',
          calculation_mode: 'daily',
          incomplete_record_default_hours: null,
          ordinary_hours_override: null,
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
        setOrdinaryHoursDraft('')
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
    } else if (config.payment_frequency === 'weekly') {
      // Semanal: no requiere fechas de corte (usa estándar 1-7, 8-14, 15-21, 22-fin)
    }

    const tOrd = ordinaryHoursDraft.trim().replace(',', '.')
    if (tOrd !== '') {
      if (parseOrdinaryHoursOverrideInput(tOrd) === null) {
        setError(
          'Tope de horas ordinarias: use un número entre 1 y 16 (incrementos de 0,5), o vacío para usar la ley del país.'
        )
        return
      }
    }
    const parsedOrdinary = tOrd === '' ? null : parseOrdinaryHoursOverrideInput(tOrd)!
    const nextConfig: PayrollConfig = { ...config, ordinary_hours_override: parsedOrdinary }
    setConfig(nextConfig)
    setOrdinaryHoursDraft(parsedOrdinary === null ? '' : String(parsedOrdinary))

    // Obtener descripción de cambios y mostrar dialog de confirmación
    const { action } = getChangesDescription(nextConfig)
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
          calculation_mode: config.calculation_mode ?? 'daily',
          incomplete_record_default_hours: config.incomplete_record_default_hours ?? null,
          ordinary_hours_override: config.ordinary_hours_override ?? null,
          legal_deductions: config.legal_deductions,
          payment_cut_dates: config.payment_cut_dates,
          semanal_proration: config.semanal_proration ?? 'proportional',
          custom_fields: config.custom_fields,
          calculation_config: config.calculation_config,
          calculation_script: config.calculation_script || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error guardando configuración')
      }

      // Usar la respuesta del POST directamente para actualizar config e initialConfig
      // Esto evita el desfase de hacer un GET adicional y garantiza consistencia inmediata
      if (data.config) {
        const savedConfig = buildPayrollConfigFromApiResponse(data.config)
        setConfig(savedConfig)
        setInitialConfig(savedConfig) // Actualizar inmediatamente sin necesidad de loadConfig()
        setOrdinaryHoursDraft(
          savedConfig.ordinary_hours_override == null ? '' : String(savedConfig.ordinary_hours_override)
        )
        console.log('✅ PayrollConfigEditor: Config saved and updated from POST response')
      } else {
        // Fallback: si por alguna razón no viene config, hacer loadConfig
        console.warn('⚠️ PayrollConfigEditor: POST response missing config, falling back to loadConfig')
        await loadConfig()
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      
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

    if (newField.formula && newField.parameters?.length) {
      const paramKeys = newField.parameters.map(p => p.key).filter(Boolean)
      const formulaVars = (newField.formula.match(/\b([a-z_][a-z0-9_]*)\b/gi) ?? []).filter(
        v => !['baseSalary', 'base_salary'].includes(v)
      )
      const missing = formulaVars.filter(v => !paramKeys.includes(v))
      if (missing.length > 0) {
        setError(`La fórmula usa variables no definidas en parámetros: ${missing.join(', ')}`)
        return
      }
    }

    setConfig(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [newFieldName]: {
          ...newField,
          formula: newField.formula || undefined,
          parameters: (newField.parameters ?? []).filter(p => p.key.trim()).length > 0 ? newField.parameters : undefined,
          track_plazos: newField.track_plazos || undefined
        }
      }
    }))

    // Reset form
    setNewFieldName('')
    setNewField({
      label: '',
      type: 'number',
      category: 'earnings',
      required: false,
      default: 0,
      formula: undefined,
      parameters: undefined,
      track_plazos: undefined
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

  // Función para detectar qué cambios se están haciendo y generar mensaje de confirmación
  const getChangesDescription = (snapshot?: PayrollConfig): { action: string; description: string } => {
    const cfg = snapshot ?? config
    if (!initialConfig) {
      return { action: 'guardar configuración', description: 'Está guardando la configuración inicial de payroll' }
    }

    const changes: string[] = []
    
    // Detectar cambios específicos
    if (cfg.payment_frequency !== initialConfig.payment_frequency) {
      const freqLabel = (f: string) => f === 'biweekly' ? 'quincenal' : f === 'weekly' ? 'semanal' : 'mensual'
      changes.push(`frecuencia de pago de ${freqLabel(initialConfig.payment_frequency)} a ${freqLabel(cfg.payment_frequency)}`)
    }
    
    if (cfg.currency !== initialConfig.currency) {
      const oldCurr = initialConfig.currency === 'HNL' ? 'Lempiras' : 'Dólares'
      const newCurr = cfg.currency === 'HNL' ? 'Lempiras' : 'Dólares'
      changes.push(`moneda de ${oldCurr} a ${newCurr}`)
    }
    
    if ((cfg.calculation_mode ?? 'daily') !== (initialConfig.calculation_mode ?? 'daily')) {
      const oldMode = (initialConfig.calculation_mode ?? 'daily') === 'daily' ? 'Por Día' : 'Por Hora Exacta'
      const newMode = (cfg.calculation_mode ?? 'daily') === 'daily' ? 'Por Día' : 'Por Hora Exacta'
      changes.push(`método de cálculo de ${oldMode} a ${newMode}`)
    }
    if ((cfg.incomplete_record_default_hours ?? null) !== (initialConfig.incomplete_record_default_hours ?? null)) {
      changes.push('horas por defecto para marcas incompletas')
    }
    if ((cfg.ordinary_hours_override ?? null) !== (initialConfig.ordinary_hours_override ?? null)) {
      changes.push('tope de horas ordinarias diarias (previo a extras)')
    }

    const deductionsStr = JSON.stringify(cfg.legal_deductions)
    const initialDeductionsStr = JSON.stringify(initialConfig.legal_deductions)
    if (deductionsStr !== initialDeductionsStr) {
      changes.push('deducciones legales')
    }
    
    const cutDatesStr = JSON.stringify(cfg.payment_cut_dates)
    const initialCutDatesStr = JSON.stringify(initialConfig.payment_cut_dates)
    if (cutDatesStr !== initialCutDatesStr) {
      changes.push('fechas de corte de pago')
    }
    
    if (cfg.calculation_script !== initialConfig.calculation_script) {
      changes.push('script de cálculo')
    }
    
    const configStr = JSON.stringify(cfg.calculation_config)
    const initialStr = JSON.stringify(initialConfig.calculation_config)
    if (configStr !== initialStr) {
      changes.push('configuración de cálculo')
    }
    
    const fieldsStr = JSON.stringify(cfg.custom_fields)
    const initialFieldsStr = JSON.stringify(initialConfig.custom_fields)
    if (fieldsStr !== initialFieldsStr) {
      const oldFieldsCount = Object.keys(initialConfig.custom_fields).length
      const newFieldsCount = Object.keys(cfg.custom_fields).length
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
                expandedSections.paymentFrequency ? 'max-h-[280px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}>
                <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-blue-400/50 transition-colors">
                  <input
                    type="radio"
                    name="payment_frequency"
                    value="biweekly"
                    checked={config.payment_frequency === 'biweekly'}
                    onChange={(e) => {
                      // Al cambiar a quincenal, resetear fechas a estándar quincenal
                      setConfig(prev => ({
                        ...prev,
                        payment_frequency: 'biweekly' as 'biweekly' | 'monthly' | 'weekly',
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
                    onChange={(e) => {
                      // Al cambiar a mensual, resetear fechas a estándar mensual
                      setConfig(prev => ({
                        ...prev,
                        payment_frequency: 'monthly' as 'biweekly' | 'monthly' | 'weekly',
                        payment_cut_dates: {
                          ...prev.payment_cut_dates,
                          monthly_type: 'standard',
                          monthly_start: 1,
                          monthly_end: 30
                        }
                      }))
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-white">Mensual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-blue-400/50 transition-colors">
                  <input
                    type="radio"
                    name="payment_frequency"
                    value="weekly"
                    checked={config.payment_frequency === 'weekly'}
                    onChange={(e) => {
                      setConfig(prev => ({
                        ...prev,
                        payment_frequency: 'weekly' as 'biweekly' | 'monthly' | 'weekly',
                        payment_cut_dates: {
                          ...prev.payment_cut_dates,
                          weekly_type: 'standard'
                        }
                      }))
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-white">Semanal</span>
                </label>
                </div>
              </div>
            </div>

            {/* Método de Cálculo de Salario */}
            <div className="glass border border-white/20 rounded-lg p-4">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, calculationMode: !prev.calculationMode }))}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="h-4 w-4 text-emerald-300" />
                  <label className="text-sm font-medium text-white">
                    Método de Cálculo de Salario
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.calculationMode ? (
                    <ChevronUp className="h-5 w-5 text-emerald-300 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-emerald-300 transition-transform duration-200" />
                  )}
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedSections.calculationMode ? 'max-h-[320px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-emerald-400/50 transition-colors flex-1">
                      <input
                        type="radio"
                        name="calculation_mode"
                        value="daily"
                        checked={(config.calculation_mode ?? 'daily') === 'daily'}
                        onChange={() => setConfig(prev => ({
                          ...prev,
                          calculation_mode: 'daily',
                          incomplete_record_default_hours: null
                        }))}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div>
                        <span className="text-white font-medium">Por Día (Asistencia)</span>
                        <p className="text-xs text-gray-400 mt-0.5">Paga el día completo si hay registro de asistencia</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 glass border border-white/20 rounded-lg hover:border-emerald-400/50 transition-colors flex-1">
                      <input
                        type="radio"
                        name="calculation_mode"
                        value="hourly"
                        checked={(config.calculation_mode ?? 'daily') === 'hourly'}
                        onChange={() => setConfig(prev => ({
                          ...prev,
                          calculation_mode: 'hourly'
                        }))}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div>
                        <span className="text-white font-medium">Por Hora Exacta</span>
                        <p className="text-xs text-gray-400 mt-0.5">Calcula según sumatoria de horas efectivas</p>
                      </div>
                    </label>
                  </div>
                  {(config.calculation_mode ?? 'daily') === 'hourly' && (
                    <div className="p-3 glass border border-amber-500/30 rounded-lg">
                      <label className="flex items-center gap-2 text-sm text-amber-200">
                        <Info className="h-4 w-4" />
                        En caso de falta de salida (check-out), asignar horas por defecto:
                      </label>
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          value={config.incomplete_record_default_hours ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setConfig(prev => ({
                              ...prev,
                              incomplete_record_default_hours: v === '' ? null : Number(v)
                            }))
                          }}
                          className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          <option value="">No asignar (alertar para corrección manual)</option>
                          <option value="4">4 horas</option>
                          <option value="8">8 horas</option>
                        </select>
                      </div>
                    </div>
                  )}
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
                    {config.payment_frequency === 'biweekly' && ' (Quincenal)'}
                    {config.payment_frequency === 'monthly' && ' (Mensual)'}
                    {config.payment_frequency === 'weekly' && ' (Semanal)'}
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
                          setConfig(prev => {
                            // Al cambiar a personalizado, mantener valores actuales o usar estándar si no existen
                            const current = prev.payment_cut_dates
                            return {
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_type: 'custom',
                                biweekly_first_start: current.biweekly_first_start || 1,
                                biweekly_first_end: current.biweekly_first_end || 15,
                                biweekly_second_start: current.biweekly_second_start || 16,
                                biweekly_second_end: current.biweekly_second_end || 30
                              }
                            }
                          })
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-white text-sm">Personalizado</span>
                    </label>
                  </div>
                  
                  {/* Campos de fechas quincenales - Siempre mostrar cuando es personalizado */}
                  {(config.payment_cut_dates.biweekly_type || 'standard') === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-300 mb-2">Primera Quincena</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Día inicio"
                            value={config.payment_cut_dates.biweekly_first_start || ''}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_first_start: e.target.value ? parseInt(e.target.value) : undefined
                              }
                            }))}
                            className="w-24 input-glass text-white text-center"
                          />
                          <span className="text-white">al</span>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Día fin"
                            value={config.payment_cut_dates.biweekly_first_end || ''}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_first_end: e.target.value ? parseInt(e.target.value) : undefined
                              }
                            }))}
                            className="w-24 input-glass text-white text-center"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Ej: 26 al 11 (cruza fin de mes)</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-2">Segunda Quincena</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Día inicio"
                            value={config.payment_cut_dates.biweekly_second_start || ''}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_second_start: e.target.value ? parseInt(e.target.value) : undefined
                              }
                            }))}
                            className="w-24 input-glass text-white text-center"
                          />
                          <span className="text-white">al</span>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Día fin"
                            value={config.payment_cut_dates.biweekly_second_end || ''}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                biweekly_second_end: e.target.value ? parseInt(e.target.value) : undefined
                              }
                            }))}
                            className="w-24 input-glass text-white text-center"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Ej: 27 al 10 (cruza fin de mes)</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Mostrar valores estándar cuando está seleccionado estándar */}
                  {(config.payment_cut_dates.biweekly_type || 'standard') === 'standard' && (
                    <div className="p-3 glass border border-green-400/20 rounded-lg">
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold text-green-300">Primera Quincena:</span> Día 1 al 15
                      </p>
                      <p className="text-sm text-gray-300 mt-1">
                        <span className="font-semibold text-green-300">Segunda Quincena:</span> Día 16 al 30
                      </p>
                    </div>
                  )}
                </div>
              ) : config.payment_frequency === 'weekly' ? (
                <div className="space-y-4">
                  {/* Períodos semanales estándar */}
                  <div className="p-3 glass border border-green-400/20 rounded-lg">
                    <p className="text-sm font-semibold text-green-300 mb-2">Períodos semanales (estándar)</p>
                    <p className="text-sm text-gray-300">
                      Semana 1: Días 1-7 | Semana 2: Días 8-14 | Semana 3: Días 15-21 | Semana 4: Días 22-fin de mes
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      El salario mensual se divide entre 4 para cada período semanal.
                    </p>
                  </div>
                  {/* Opción: monto fijo vs proporcional a días trabajados */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer p-2 glass border border-white/20 rounded-lg hover:border-green-400/50 transition-colors">
                      <input
                        type="radio"
                        name="semanal_proration"
                        value="proportional"
                        checked={(config.semanal_proration ?? 'proportional') === 'proportional'}
                        onChange={() => setConfig(prev => ({ ...prev, semanal_proration: 'proportional' }))}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-white text-sm">Proporcional a días trabajados</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 glass border border-white/20 rounded-lg hover:border-green-400/50 transition-colors">
                      <input
                        type="radio"
                        name="semanal_proration"
                        value="fixed"
                        checked={(config.semanal_proration ?? 'proportional') === 'fixed'}
                        onChange={() => setConfig(prev => ({ ...prev, semanal_proration: 'fixed' }))}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-white text-sm">Monto fijo (mensual/4)</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">
                    {(config.semanal_proration ?? 'proportional') === 'proportional'
                      ? 'Si falta un día, se descuenta proporcionalmente.'
                      : 'Pago fijo por semana sin importar días trabajados.'}
                  </p>
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
                          setConfig(prev => {
                            // Al cambiar a personalizado, mantener valores actuales o usar estándar si no existen
                            const current = prev.payment_cut_dates
                            return {
                              ...prev,
                              payment_cut_dates: {
                                ...prev.payment_cut_dates,
                                monthly_type: 'custom',
                                monthly_start: current.monthly_start || 1,
                                monthly_end: current.monthly_end || 30
                              }
                            }
                          })
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-white text-sm">Personalizado</span>
                    </label>
                  </div>
                  
                  {/* Campos de fechas mensuales - Siempre mostrar cuando es personalizado */}
                  {(config.payment_cut_dates.monthly_type || 'standard') === 'custom' && (
                    <div>
                      <label className="block text-xs text-gray-300 mb-2">Período Mensual</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Día inicio"
                          value={config.payment_cut_dates.monthly_start || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            payment_cut_dates: {
                              ...prev.payment_cut_dates,
                              monthly_start: e.target.value ? parseInt(e.target.value) : undefined
                            }
                          }))}
                          className="w-24 input-glass text-white text-center"
                        />
                        <span className="text-white">al</span>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Día fin"
                          value={config.payment_cut_dates.monthly_end || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            payment_cut_dates: {
                              ...prev.payment_cut_dates,
                              monthly_end: e.target.value ? parseInt(e.target.value) : undefined
                            }
                          }))}
                          className="w-24 input-glass text-white text-center"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Ej: 28 al 27 (cruza fin de mes)</p>
                    </div>
                  )}
                  
                  {/* Mostrar valores estándar cuando está seleccionado estándar */}
                  {(config.payment_cut_dates.monthly_type || 'standard') === 'standard' && (
                    <div className="p-3 glass border border-green-400/20 rounded-lg">
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold text-green-300">Período Mensual:</span> Día 1 al 30
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Vista previa próximos 3 periodos */}
              <div className="mt-4 p-3 glass border border-green-400/20 rounded-lg">
                <p className="text-xs font-medium text-green-300 mb-2 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Próximos 3 periodos de pago
                </p>
                {periodPreviewLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculando…
                  </div>
                ) : periodPreview.length > 0 ? (
                  <ul className="space-y-1.5 text-sm text-gray-300">
                    {periodPreview.map((p, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="font-medium text-white">{p.label}</span>
                        <span className="text-gray-400">{p.fechaInicio} – {p.fechaFin}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No se pudo calcular la vista previa</p>
                )}
              </div>
              </div>
            </div>

            {/* Tope diario de horas ordinarias (AHC / extras) */}
            <div className="glass border border-white/20 rounded-lg p-4">
              <button
                type="button"
                onClick={() =>
                  setExpandedSections((prev) => ({ ...prev, ordinaryDailyCap: !prev.ordinaryDailyCap }))
                }
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-sky-300" />
                  <label className="text-sm font-medium text-white">
                    Tope de horas ordinarias (día)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.ordinaryDailyCap ? (
                    <ChevronUp className="h-5 w-5 text-sky-300 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-sky-300 transition-transform duration-200" />
                  )}
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedSections.ordinaryDailyCap ? 'max-h-[720px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="flex flex-col gap-4">
                  <div className="p-3 glass border border-sky-500/30 rounded-lg">
                    <label className="flex items-start gap-2 text-sm text-sky-200">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="font-medium leading-snug">Horas ordinarias máximas por día</span>
                    </label>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      Opcional. Las horas netas por encima de este tope pasan al tramo extraordinario en el cálculo
                      batch (luego se reparten en diurna / nocturna / feriado según reglas). Vacío = se usa{' '}
                      <span className="text-gray-300">legal_daily_hours</span> de la ley del país (habitualmente 8 h).
                      Rango permitido: 1 a 16 h, en incrementos de 0,5. Tras cambiar, recalcule las horas de
                      asistencia del período.
                    </p>
                    <div className="mt-3 space-y-2">
                      <span className="text-xs text-gray-500 block">Valor (1–16, paso 0,5)</span>
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          max={16}
                          step={0.5}
                          inputMode="decimal"
                          placeholder="Ej. 8"
                          value={ordinaryHoursDraft}
                          onChange={(e) => {
                            const v = e.target.value
                            setOrdinaryHoursDraft(v)
                            if (v.trim() === '') {
                              setConfig((prev) => ({ ...prev, ordinary_hours_override: null }))
                              return
                            }
                            const n = parseOrdinaryHoursOverrideInput(v.trim().replace(',', '.'))
                            if (n !== null) {
                              setConfig((prev) => ({ ...prev, ordinary_hours_override: n }))
                            }
                          }}
                          onBlur={() => {
                            const t = ordinaryHoursDraft.trim().replace(',', '.')
                            if (t === '') {
                              setConfig((prev) => ({ ...prev, ordinary_hours_override: null }))
                              setOrdinaryHoursDraft('')
                              return
                            }
                            const n = parseOrdinaryHoursOverrideInput(t)
                            if (n === null) {
                              setOrdinaryHoursDraft(
                                config.ordinary_hours_override == null
                                  ? ''
                                  : String(config.ordinary_hours_override)
                              )
                              return
                            }
                            setConfig((prev) => ({ ...prev, ordinary_hours_override: n }))
                            setOrdinaryHoursDraft(String(n))
                          }}
                          className="w-[140px] px-3 py-2 input-glass text-white text-sm placeholder:text-white/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setConfig((prev) => ({ ...prev, ordinary_hours_override: null }))
                            setOrdinaryHoursDraft('')
                          }}
                          className="text-xs text-sky-300/90 hover:text-sky-200 underline-offset-2 hover:underline"
                        >
                          Usar ley (vacío)
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">Valores comunes</p>
                      <div className="flex flex-wrap gap-2">
                        {ORDINARY_HOURS_PRESETS.map((h) => {
                          const tChip = ordinaryHoursDraft.trim().replace(',', '.')
                          const parsedChip = tChip === '' ? null : parseOrdinaryHoursOverrideInput(tChip)
                          const chipSelected =
                            parsedChip !== null ? parsedChip : config.ordinary_hours_override
                          return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              setConfig((prev) => ({ ...prev, ordinary_hours_override: h }))
                              setOrdinaryHoursDraft(String(h))
                            }}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                              chipSelected === h
                                ? 'bg-sky-500/25 border-sky-400/50 text-sky-100'
                                : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'
                            )}
                          >
                            {h.toFixed(1)}
                          </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-lg border border-white/10 bg-white/[0.04]">
                      <p className="text-xs font-medium text-sky-200/90 mb-1.5">Vista previa del significado</p>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {(() => {
                          const ejemploNetas = 9
                          const cap = config.ordinary_hours_override
                          if (cap == null) {
                            return (
                              <>
                                Sin tope propio: el límite de ordinarias en el batch sale de la ley (p. ej. 8 h). Con
                                una jornada neta de ejemplo de {ejemploNetas} h en un día, lo que exceda ese límite
                                legal pasa al bloque extraordinario antes del reparto diurno/nocturno/feriado.
                              </>
                            )
                          }
                          const alExtra = Math.max(0, ejemploNetas - cap)
                          return (
                            <>
                              Con tope <span className="text-white font-medium">{cap} h</span> de ordinarias, una
                              jornada neta de ejemplo de {ejemploNetas} h dejaría unas{' '}
                              <span className="text-white font-medium">
                                {Math.min(cap, ejemploNetas).toFixed(1)} h
                              </span>{' '}
                              por debajo o igual al tope (tratamiento ordinario en ese tramo) y unas{' '}
                              <span className="text-white font-medium">{alExtra.toFixed(1)} h</span> por encima del
                              tope en el bloque extraordinario (luego se clasifican según reglas de turno).
                            </>
                          )
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
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
                        onChange={(e) => handleUpdateField(fieldName, { category: e.target.value as 'earnings' | 'deductions' | 'calculation_helper' })}
                        className="w-full px-3 py-2 input-glass text-white text-sm"
                      >
                        <option value="earnings">Ingresos (Suman al salario)</option>
                        <option value="deductions">Deducciones (Restan al salario)</option>
                        {field.category === 'calculation_helper' && (
                          <option value="calculation_helper">Ayuda de Cálculo (Solo lectura)</option>
                        )}
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
                  {/* Cálculo y fórmula - oculto por ahora
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <div>
                      <label className="block text-xs text-white mb-1">Cálculo (opcional)</label>
                      <Input
                        value={(field as CustomField).formula ?? ''}
                        onChange={(e) => handleUpdateField(fieldName, { formula: e.target.value || undefined })}
                        placeholder="Ej: monto_factura / plazos"
                        className="text-sm input-glass text-white font-mono"
                      />
                    </div>
                    {(field as CustomField).formula && field.category === 'deductions' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(field as CustomField).track_plazos ?? false}
                          onChange={(e) => handleUpdateField(fieldName, { track_plazos: e.target.checked })}
                          className="rounded border-white/30"
                        />
                        <span className="text-xs text-gray-300">Contar plazos aplicados</span>
                      </div>
                    )}
                  </div>
                  */}
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
                                onChange={(e) => handleUpdateField(fieldName, { category: e.target.value as 'earnings' | 'deductions' | 'calculation_helper' })}
                                className="w-full px-3 py-2 input-glass text-white text-sm"
                              >
                                <option value="earnings">Ingresos (Suman al salario)</option>
                                <option value="deductions">Deducciones (Restan al salario)</option>
                                {field.category === 'calculation_helper' && (
                                  <option value="calculation_helper">Ayuda de Cálculo (Solo lectura)</option>
                                )}
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
                          {/* Cálculo y fórmula - oculto por ahora
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                            <div>
                              <label className="block text-xs text-white mb-1">Cálculo (opcional)</label>
                              <Input
                                value={(field as CustomField).formula ?? ''}
                                onChange={(e) => handleUpdateField(fieldName, { formula: e.target.value || undefined })}
                                placeholder="Ej: monto_factura / plazos"
                                className="text-sm input-glass text-white font-mono"
                              />
                            </div>
                            {(field as CustomField).formula && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={(field as CustomField).track_plazos ?? false}
                                  onChange={(e) => handleUpdateField(fieldName, { track_plazos: e.target.checked })}
                                  className="rounded border-white/30"
                                />
                                <span className="text-xs text-gray-300">Contar plazos aplicados</span>
                              </div>
                            )}
                          </div>
                          */}
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
                    Nombre interno del campo *
                  </label>
                  <Input
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="Ej: cxc_optica o horas_extras (sin espacios)"
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
                {/* Fórmula y parámetros - oculto por ahora
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex gap-2 mb-1">
                      <Info className="h-4 w-4 text-blue-300 shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-200">
                        <p className="font-medium mb-1">¿Cuándo usar fórmula?</p>
                        <p>Si el monto se calcula (ej: factura ÷ 12 quincenas), defina la fórmula. Cada empleado ingresará sus propios valores al editar la planilla.</p>
                        <p className="mt-1 text-blue-300/90">Ejemplo CXC Óptica: <code className="bg-white/10 px-1 rounded">monto_factura / plazos</code> → si factura = 2,400 y plazos = 12, se deduce 200 por quincena.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">¿Cómo se calcula el monto? (opcional)</label>
                    <div className="flex gap-2">
                      <Input
                        value={newField.formula ?? ''}
                        onChange={(e) => setNewField(prev => ({ ...prev, formula: e.target.value || undefined }))}
                        placeholder="Ej: monto_factura / plazos  (use + - * / entre nombres)"
                        className="input-glass text-white placeholder:text-white/70 font-mono text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewField(prev => ({
                            ...prev,
                            formula: 'monto_factura / plazos',
                            parameters: [
                              { key: 'monto_factura', label: 'Monto total de la factura (L.)', type: 'number' as const, default: 0 },
                              { key: 'plazos', label: 'Número de plazos (quincenas)', type: 'number' as const, default: 12 }
                            ]
                          }))
                        }}
                        className="border-white/20 hover:bg-white/10 shrink-0 text-xs"
                        title="Ejemplo: factura dividida en plazos"
                      >
                        Usar ejemplo
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Escriba la operación usando los nombres que definirá abajo. Operadores permitidos: + - * /</p>
                  </div>
                  {newField.formula && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Datos que pedirá a cada empleado</label>
                        <p className="text-xs text-gray-400 mb-2">Cada dato que usó en la fórmula debe aparecer aquí. El usuario verá la etiqueta al editar la planilla.</p>
                        {(newField.parameters ?? []).map((p, i) => (
                          <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                            <Input
                              value={p.key}
                              onChange={(e) => {
                                const params = [...(newField.parameters ?? [])]
                                params[i] = { ...params[i], key: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                                setNewField(prev => ({ ...prev, parameters: params }))
                              }}
                              placeholder="Nombre (ej: monto_factura)"
                              className="input-glass text-white text-sm flex-1 min-w-[120px]"
                              title="Debe coincidir con lo escrito en la fórmula"
                            />
                            <Input
                              value={p.label}
                              onChange={(e) => {
                                const params = [...(newField.parameters ?? [])]
                                params[i] = { ...params[i], label: e.target.value }
                                setNewField(prev => ({ ...prev, parameters: params }))
                              }}
                              placeholder="Texto visible (ej: Monto total factura)"
                              className="input-glass text-white text-sm flex-1 min-w-[140px]"
                            />
                            <select
                              value={p.type}
                              onChange={(e) => {
                                const params = [...(newField.parameters ?? [])]
                                params[i] = { ...params[i], type: e.target.value as 'number' | 'string' }
                                setNewField(prev => ({ ...prev, parameters: params }))
                              }}
                              className="px-2 py-1.5 input-glass text-white text-sm w-24"
                            >
                              <option value="number">Número</option>
                              <option value="string">Texto</option>
                            </select>
                            <Input
                              type={p.type === 'number' ? 'number' : 'text'}
                              value={p.default}
                              onChange={(e) => {
                                const params = [...(newField.parameters ?? [])]
                                params[i] = { ...params[i], default: p.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value }
                                setNewField(prev => ({ ...prev, parameters: params }))
                              }}
                              placeholder="Por defecto"
                              className="input-glass text-white text-sm w-20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const params = (newField.parameters ?? []).filter((_, j) => j !== i)
                                setNewField(prev => ({ ...prev, parameters: params }))
                              }}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Quitar"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewField(prev => ({
                            ...prev,
                            parameters: [...(prev.parameters ?? []), { key: '', label: '', type: 'number', default: 0 }]
                          }))}
                          className="border-white/20 hover:bg-white/10 mt-1"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar dato
                        </Button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Seguir plazos (solo deducciones)</label>
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={newField.track_plazos ?? false}
                            onChange={(e) => setNewField(prev => ({ ...prev, track_plazos: e.target.checked }))}
                            disabled={newField.category !== 'deductions'}
                            className="rounded border-white/30 mt-1"
                          />
                          <div>
                            <span className="text-sm text-gray-300">Contar cuántas deducciones se han aplicado y cuántas faltan</span>
                            <p className="text-xs text-gray-400 mt-0.5">Ej: CXC Óptica a 12 quincenas → el sistema mostrará &quot;3/12 aplicadas, 9 restantes&quot;</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                */}
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
                        default: 0,
                        formula: undefined,
                        parameters: undefined,
                        track_plazos: undefined
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


      {/* Save Button - Siempre visible, deshabilitado si no hay cambios */}
      <Card variant="glass" className={`p-4 ${hasChangesState ? 'border-yellow-400/30' : 'border-white/10'}`}>
        <div className="flex items-center justify-between">
          {hasChangesState ? (
            <div className="flex items-center gap-2 text-yellow-300 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Tienes cambios sin guardar</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>No hay cambios pendientes</span>
            </div>
          )}
          <div className="flex justify-end gap-3">
            {hasChangesState && (
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={saving}
                className="border-white/20 hover:bg-white/10 hover:border-white/30"
              >
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleSaveClick}
              disabled={saving || !hasChangesState}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

