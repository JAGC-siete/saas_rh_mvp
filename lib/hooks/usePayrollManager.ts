// Unified Payroll Manager Hook
// Consolidates all payroll state management into a single, cohesive system
// Replaces the dual state system with a single source of truth

import { useReducer, useCallback, useMemo, useEffect } from 'react'
import { useCompanyContext } from '../useCompanyContext'
import { useToast } from '../toast'
import { fetchUnifiedPayroll, getCurrentPeriod, UnifiedRow, UnifiedResumen } from '../payroll-unified'
import { usePayrollMetrics } from './usePayrollMetrics'
import { payrollApi, mapPayrollError } from '../payroll-api'
import { PayrollFilters, UIRunStatus } from '../../types/payroll'

// Unified State Interface
export interface PayrollManagerState {
  // Data
  unifiedData: { rows: UnifiedRow[]; resumen: UnifiedResumen; runId?: string; status?: string } | null
  currentPeriod: { year: number; month: number; quincena: 1 | 2 }
  
  // UI State
  status: UIRunStatus
  loading: boolean
  error: string | null
  
  // Filters
  filters: PayrollFilters
  
  // Legacy compatibility (will be removed)
  runId?: string
  hasLoadedInitialData: boolean
}

// Action Types
export type PayrollManagerAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: { rows: UnifiedRow[]; resumen: UnifiedResumen } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATUS'; payload: UIRunStatus }
  | { type: 'SET_FILTERS'; payload: Partial<PayrollFilters> }
  | { type: 'SET_PERIOD'; payload: { year: number; month: number; quincena: 1 | 2 } }
  | { type: 'SET_RUN_ID'; payload: string | undefined }
  | { type: 'SET_LOADED_INITIAL'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' }

// Initial State
const getInitialState = (): PayrollManagerState => {
  const currentPeriod = getCurrentPeriod()
  return {
    unifiedData: null,
    currentPeriod: {
      ...currentPeriod,
      quincena: currentPeriod.quincena as 1 | 2
    },
    status: 'idle',
    loading: false,
    error: null,
    filters: {
      year: currentPeriod.year,
      month: currentPeriod.month,
      quincena: currentPeriod.quincena as 1 | 2,
      tipo: 'CON'
    },
    runId: undefined,
    hasLoadedInitialData: false
  }
}

// Reducer
const payrollManagerReducer = (
  state: PayrollManagerState,
  action: PayrollManagerAction
): PayrollManagerState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_DATA':
      return { 
        ...state, 
        unifiedData: action.payload, 
        loading: false,
        error: null
      }
    
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload, 
        loading: false,
        status: action.payload ? 'error' : state.status
      }
    
    case 'SET_STATUS':
      return { ...state, status: action.payload }
    
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload }
      }
    
    case 'SET_PERIOD':
      return { 
        ...state, 
        currentPeriod: action.payload,
        hasLoadedInitialData: false // Reset to allow new data loading
      }
    
    case 'SET_RUN_ID':
      return { ...state, runId: action.payload }
    
    case 'SET_LOADED_INITIAL':
      return { ...state, hasLoadedInitialData: action.payload }
    
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    
    case 'RESET_STATE':
      return getInitialState()
    
    default:
      return state
  }
}

// Main Hook
export const usePayrollManager = () => {
  const [state, dispatch] = useReducer(payrollManagerReducer, getInitialState())
  const { companyId, loading: companyLoading } = useCompanyContext()
  const toast = useToast()

  // Metrics calculation
  const metrics = usePayrollMetrics(state.unifiedData?.rows || [])

  // Action Creators
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const setStatus = useCallback((status: UIRunStatus) => {
    dispatch({ type: 'SET_STATUS', payload: status })
  }, [])

  // Filter Management
  const updateFilter = useCallback(async (key: keyof PayrollFilters, value: any) => {
    dispatch({ type: 'SET_FILTERS', payload: { [key]: value } })
    
    // Update period if it's a period-related filter
    if (['year', 'month', 'quincena'].includes(key)) {
      dispatch({ 
        type: 'SET_PERIOD', 
        payload: { 
          ...state.currentPeriod, 
          [key]: value 
        } 
      })
    }
    
    // If tipo changes, reload data to reflect the change
    if (key === 'tipo' && companyId) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true })
        dispatch({ type: 'CLEAR_ERROR' })
        
        const data = await fetchUnifiedPayroll(
          companyId,
          state.currentPeriod.year,
          state.currentPeriod.month,
          state.currentPeriod.quincena,
          state.filters.tipo
        )
        
        dispatch({ type: 'SET_DATA', payload: data })
      } catch (error: any) {
        const errorMessage = error?.message || 'Error desconocido'
        dispatch({ type: 'SET_ERROR', payload: `Error cargando datos: ${errorMessage}` })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
  }, [state.currentPeriod, companyId])

  const resetFilters = useCallback(() => {
    const newPeriod = getCurrentPeriod()
    dispatch({ 
      type: 'SET_PERIOD', 
      payload: {
        ...newPeriod,
        quincena: newPeriod.quincena as 1 | 2
      }
    })
    dispatch({ 
      type: 'SET_FILTERS', 
      payload: {
        year: newPeriod.year,
        month: newPeriod.month,
        quincena: newPeriod.quincena as 1 | 2,
        tipo: 'CON'
      }
    })
  }, [])

  // Data Loading
  const loadUnifiedData = useCallback(async () => {
    if (!companyId) return

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      // Loading unified payroll data

      const data = await fetchUnifiedPayroll(
        companyId,
        state.currentPeriod.year,
        state.currentPeriod.month,
        state.currentPeriod.quincena,
        state.filters.tipo
      )

      dispatch({ type: 'SET_DATA', payload: data })
      
      // Si hay un runId en la respuesta, actualizarlo
      if (data.runId) {
        dispatch({ type: 'SET_RUN_ID', payload: data.runId })
        console.log('🔍 DEBUG - Run ID set from data:', data.runId)
      }
      
      // Si hay un status en la respuesta, actualizar el estado
      if (data.status) {
        dispatch({ type: 'SET_STATUS', payload: data.status as UIRunStatus })
        console.log('🔍 DEBUG - Status set from data:', data.status)
      }
      
      dispatch({ type: 'SET_LOADED_INITIAL', payload: true })

      // Unified payroll data loaded successfully

    } catch (error: any) {
      console.error('🔍 DEBUG - Error in loadInitialData:', error)
      
      // Manejar error específico de corrida ya autorizada
      if (error.message && error.message.includes('ya autorizada')) {
        dispatch({ type: 'SET_ERROR', payload: 'Ya existe una nómina autorizada para este período. No se puede generar un nuevo preview.' })
        toast.error('Corrida Ya Autorizada', 'Ya existe una nómina autorizada para este período', 8000)
      } else {
        const errorMessage = error?.message || 'Error desconocido'
        dispatch({ type: 'SET_ERROR', payload: `Error cargando datos: ${errorMessage}` })
        toast.error('Error', 'No se pudieron cargar los datos del período actual', 5000)
      }
    }
  }, [companyId, state.currentPeriod, toast])

  // Legacy API Actions (for compatibility during migration)
  const generatePreview = useCallback(async () => {
    console.log('🚀 DEBUG - generatePreview INICIADO')
    setStatus('previewing')
    setLoading(true)
    clearError()

    try {
      const response = await payrollApi.preview(state.filters)
      
      console.log('🔍 DEBUG - Respuesta del preview:', response)
      console.log('🔍 DEBUG - RunId recibido:', response.run_id)
      console.log('🔍 DEBUG - RunId type:', typeof response.run_id)
      console.log('🔍 DEBUG - RunId truthy:', !!response.run_id)
      
      dispatch({ type: 'SET_RUN_ID', payload: response.run_id })
      dispatch({ type: 'SET_STATUS', payload: 'draft' })
      dispatch({ type: 'CLEAR_ERROR' }) // Limpiar cualquier error previo
      
      console.log('🔍 DEBUG - Estado después de dispatch:', {
        runId: response.run_id,
        status: 'draft'
      })
      
      // ACTUALIZAR TABLA INMEDIATAMENTE con datos de la respuesta
      if (response.planilla && Array.isArray(response.planilla)) {
        console.log('🔍 DEBUG - Actualizando tabla con datos del preview:', response.planilla.length, 'empleados')
        
        // Convertir datos del preview a formato unificado
        const rows: UnifiedRow[] = response.planilla.map((p: any) => ({
          ...p,
          horas_trabajadas: 0,
          extras: { horas: 0, monto: 0 },
          observaciones: '',
          status: 'completo' as const
        }))
        
        // Calcular resumen
        const resumen = rows.reduce((acc, r) => {
          acc.empleados += 1
          acc.total_bruto += r.total_earnings
          acc.total_deducciones.IHSS += r.IHSS || 0
          acc.total_deducciones.RAP += r.RAP || 0
          acc.total_deducciones.ISR += r.ISR || 0
          acc.total_deducciones.otros += 0
          acc.total_neto += r.total
          acc.total_dias_trabajados += r.days_worked || 0
          acc.total_horas_extras += 0
          return acc
        }, {
          empleados: 0,
          total_bruto: 0,
          total_deducciones: { IHSS: 0, RAP: 0, ISR: 0, otros: 0 },
          total_neto: 0,
          total_dias_trabajados: 0,
          total_horas_extras: 0
        })
        
        // Actualizar estado inmediatamente
        dispatch({ type: 'SET_DATA', payload: { rows, resumen } })
        console.log('✅ Tabla actualizada inmediatamente con datos del preview')
      } else {
        console.error('❌ No se encontraron datos de planilla en la respuesta')
      }
      
      // Mostrar mensaje apropiado según si es regeneración o no
      if (response?.warning) {
        toast.warning(
          'Preview Regenerado',
          response.warning,
          8000
        )
      } else if (response?.noAttendanceWarning) {
        toast.warning(
          'Sin Registros de Asistencia',
          `${response.noAttendanceWarning.message} ${response.noAttendanceWarning.detail}`,
          10000
        )
      } else {
        toast.success(
          'Preview Generado',
          `${response.empleados} empleados procesados exitosamente`,
          5000
        )
      }

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      setError(errorMessage)
      toast.error('Error en Preview', errorMessage, 8000)
      throw error
    }
  }, [state.filters, state.currentPeriod, companyId, setStatus, setLoading, clearError, setError, toast])

  const editLine = useCallback(async (
    runLineId: string,
    field: string,
    newValue: number,
    reason?: string
  ) => {
    if (!state.runId) {
      throw new Error('No hay una corrida de nómina activa')
    }

    setStatus('editing')
    setLoading(true)
    clearError()

    try {
      const response = await payrollApi.edit({
        run_line_id: runLineId,
        field: field as any,
        new_value: newValue,
        reason
      })

      setStatus('draft')
      toast.success('Línea Editada', `Campo ${field} actualizado a ${newValue}`, 4000)

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      setError(errorMessage)
      toast.error('Error Editando', errorMessage, 6000)
      throw error
    }
  }, [state.runId, setStatus, setLoading, clearError, setError, toast])

  const authorizeRun = useCallback(async () => {
    console.log('🚀 DEBUG - authorizeRun INICIADO')
    console.log('🔍 DEBUG - Estado actual:', {
      runId: state.runId,
      status: state.status,
      hasUnifiedData: !!state.unifiedData,
      canAuthorize: canAuthorize
    })

    if (!state.runId) {
      throw new Error('No hay una corrida de nómina activa')
    }

    setStatus('authorizing')
    setLoading(true)
    clearError()

    try {
      const response = await payrollApi.authorize({ run_id: state.runId })
      
      console.log('🔍 DEBUG - Respuesta de autorización:', response)
      
      // Actualizar estado a autorizado
      setStatus('authorized')
      
      // Recargar los datos para reflejar el estado actualizado
      console.log('🔍 DEBUG - Recargando datos después de autorización...')
      
      try {
        const refreshedData = await fetchUnifiedPayroll(
          companyId || '',
          state.currentPeriod.year,
          state.currentPeriod.month,
          state.currentPeriod.quincena,
          state.filters.tipo
        )
        
        console.log('🔍 DEBUG - Datos recargados:', refreshedData)
        
        // Actualizar los datos unificados con el runId si está disponible
        dispatch({ type: 'SET_DATA', payload: refreshedData })
        
        if (refreshedData.runId) {
          dispatch({ type: 'SET_RUN_ID', payload: refreshedData.runId })
          console.log('🔍 DEBUG - Run ID actualizado:', refreshedData.runId)
        }
        
      } catch (refreshError) {
        console.error('🔍 DEBUG - Error recargando datos:', refreshError)
        // No fallar la autorización por error de recarga
      }
      
      // Mostrar mensaje apropiado según si es re-autorización o no
      if (response?.warning) {
        toast.warning(
          'Nómina Re-autorizada',
          response.warning,
          8000
        )
      } else {
        toast.success('Nómina Autorizada', 'La nómina ha sido autorizada exitosamente', 6000)
      }
      
      console.log('🔍 DEBUG - Autorización completada exitosamente')

      return response
    } catch (error: any) {
      console.error('🔍 DEBUG - Error en autorización:', error)
      const errorMessage = mapPayrollError(error)
      setError(errorMessage)
      toast.error('Error Autorizando', errorMessage, 8000)
      throw error
    } finally {
      setLoading(false)
    }
  }, [state.runId, state.status, state.unifiedData, state.currentPeriod, state.filters.tipo, companyId, setStatus, setLoading, clearError, setError, toast])

  const sendEmail = useCallback(async (employeeId?: string) => {
    if (!state.runId) {
      throw new Error('No hay una corrida de nómina activa')
    }

    setStatus('distributing')
    setLoading(true)
    clearError()

    try {
      const response = await payrollApi.sendMail({
        run_id: state.runId,
        employee_id: employeeId
      })

      setStatus('authorized')
      
      if (response.successful > 0) {
        toast.success('Emails Enviados', `${response.successful} emails enviados exitosamente`, 5000)
      }
      
      if (response.failed > 0) {
        toast.warning('Algunos Emails Fallaron', `${response.failed} emails no se pudieron enviar`, 8000)
      }

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      setError(errorMessage)
      toast.error('Error Enviando Emails', errorMessage, 8000)
      throw error
    }
  }, [state.runId, setStatus, setLoading, clearError, setError, toast])

  const generatePDF = useCallback(async () => {
    if (!state.runId) {
      toast.error('Error', 'No hay una corrida de nómina activa', 4000)
      return
    }
    
    try {
      const response = await payrollApi.generatePDF(state.runId)
      
      // Trigger direct download
      const link = document.createElement('a')
      link.href = response.url
      link.download = `planilla_${state.currentPeriod.year}-${state.currentPeriod.month.toString().padStart(2, '0')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('PDF Generado', 'El PDF se ha descargado correctamente', 4000)
    } catch (error: any) {
      toast.error('Error Generando PDF', 'No se pudo generar el PDF', 6000)
    }
  }, [state.runId, state.currentPeriod, toast])

  const generateVoucher = useCallback(async (runLineId: string) => {
    try {
      const response = await payrollApi.generateVoucher(runLineId)
      
      // Open in new tab
      window.open(response.url, '_blank')
      toast.success('Voucher Generado', 'El voucher se ha abierto en una nueva pestaña', 4000)
    } catch (error: any) {
      toast.error('Error Generando Voucher', 'No se pudo generar el voucher', 6000)
    }
  }, [toast])

  // Auto-load data when period changes (client-side only)
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return
    if (state.hasLoadedInitialData || !companyId) return

    // Load data directly without calling the callback to avoid dependency issues
    const loadData = async () => {
      if (!companyId) return

      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'CLEAR_ERROR' })

      try {
        const data = await fetchUnifiedPayroll(
          companyId,
          state.currentPeriod.year,
          state.currentPeriod.month,
          state.currentPeriod.quincena,
          state.filters.tipo
        )

        dispatch({ type: 'SET_DATA', payload: data })
        dispatch({ type: 'SET_LOADED_INITIAL', payload: true })
      } catch (error: any) {
        const errorMessage = error?.message || 'Error desconocido'
        dispatch({ type: 'SET_ERROR', payload: `Error cargando datos: ${errorMessage}` })
      }
    }

    loadData()
  }, [state.hasLoadedInitialData, companyId, state.currentPeriod.year, state.currentPeriod.month, state.currentPeriod.quincena])

  // Computed Properties
  const canPreview = state.status === 'idle' || state.status === 'draft' || state.status === 'error'
  const canEdit = state.status === 'draft' && !!state.runId
  const canAuthorize = state.status === 'draft' && !!state.runId
  const canSend = state.status === 'authorized' && !!state.runId
  const canReset = state.status !== 'idle'
  
  // DEBUG: Log current state for debugging
  console.log('🔍 DEBUG - Estado actual del payroll:', {
    status: state.status,
    runId: state.runId,
    error: state.error,
    canAuthorize,
    canSend,
    canEdit,
    unifiedDataExists: !!state.unifiedData,
    unifiedDataRows: state.unifiedData?.rows?.length || 0
  })

  // Legacy compatibility properties
  const hasPlanilla = (state.unifiedData?.rows?.length || 0) > 0
  const totalEmployees = state.unifiedData?.resumen.empleados || 0
  const totalBruto = state.unifiedData?.resumen.total_bruto || 0
  const totalNeto = state.unifiedData?.resumen.total_neto || 0

  return {
    // State
    ...state,
    
    // Metrics
    metrics,
    
    // Actions
    loadUnifiedData,
    generatePreview,
    editLine,
    authorizeRun,
    sendEmail,
    generatePDF,
    generateVoucher,
    
    // Filter Management
    updateFilter,
    resetFilters,
    
    // State Management
    setStatus,
    setError,
    clearError,
    setLoading,
    
    // Computed Properties
    canPreview,
    canEdit,
    canAuthorize,
    canSend,
    canReset,
    
    // Legacy Compatibility
    hasPlanilla,
    totalEmployees,
    totalBruto,
    totalNeto,
    
    // Company Context
    companyId,
    companyLoading
  }
}
