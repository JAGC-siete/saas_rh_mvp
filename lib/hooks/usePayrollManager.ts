// Unified Payroll Manager Hook
// Consolidates all payroll state management into a single, cohesive system
// Replaces the dual state system with a single source of truth

import { useReducer, useCallback, useMemo, useEffect } from 'react'
import { useCompanyContext } from '../useCompanyContext'
import { useToast } from '../toast'
import { fetchUnifiedPayroll, getCurrentPeriod, UnifiedRow, UnifiedResumen } from '../payroll-unified'
import { usePayrollMetrics } from './usePayrollMetrics'
import { payrollApi, mapPayrollError } from '../payroll-api'
import type { PayrollPdfGroupBy } from '../payroll/pdf-layout'
import { PayrollFilters, UIRunStatus } from '../../types/payroll'

// Unified State Interface
export interface PayrollManagerState {
  // Data
  unifiedData: { rows: UnifiedRow[]; resumen: UnifiedResumen; runId?: string; status?: string; incompleteRecordsAlert?: { employee_id: string; employee_name: string; dates: string[] }[] } | null
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

  // AHC preflight (attendance_hours_calculation completeness)
  ahcPreflight?: {
    status: 'GREEN' | 'YELLOW' | 'RED'
    missingAHC: number
    completeRecords: number
    ahcRecords: number
    totalRecords: number
    recommendedAction?: string
  } | null
  ahcPreflightLoading?: boolean
}

// Action Types
export type PayrollManagerAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: { rows: UnifiedRow[]; resumen: UnifiedResumen; runId?: string; status?: string; incompleteRecordsAlert?: { employee_id: string; employee_name: string; dates: string[] }[] } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATUS'; payload: UIRunStatus }
  | { type: 'SET_FILTERS'; payload: Partial<PayrollFilters> }
  | { type: 'SET_PERIOD'; payload: { year: number; month: number; quincena: 1 | 2 } }
  | { type: 'SET_RUN_ID'; payload: string | undefined }
  | { type: 'SET_LOADED_INITIAL'; payload: boolean }
  | { type: 'SET_AHC_PREFLIGHT'; payload: PayrollManagerState['ahcPreflight'] }
  | { type: 'SET_AHC_PREFLIGHT_LOADING'; payload: boolean }
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
    hasLoadedInitialData: false,
    ahcPreflight: null,
    ahcPreflightLoading: false
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
        unifiedData: {
          rows: action.payload.rows,
          resumen: action.payload.resumen,
          runId: (action.payload as any).runId ?? state.unifiedData?.runId,
          status: (action.payload as any).status ?? state.unifiedData?.status,
          incompleteRecordsAlert: (action.payload as any).incompleteRecordsAlert
        },
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

    case 'SET_AHC_PREFLIGHT':
      return { ...state, ahcPreflight: action.payload }

    case 'SET_AHC_PREFLIGHT_LOADING':
      return { ...state, ahcPreflightLoading: action.payload }
    
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

  // Check for existing draft
  const checkDraft = useCallback(async () => {
    if (!companyId) return null

    try {
      const response = await fetch(
        `/api/payroll/draft?year=${state.filters.year}&month=${state.filters.month}&quincena=${state.filters.quincena}&tipo=${state.filters.tipo}`
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.exists ? data.draft : null
    } catch (error) {
      console.error('Error checking draft:', error)
      return null
    }
  }, [companyId, state.filters])

  // Data Loading
  const loadUnifiedData = useCallback(async () => {
    if (!companyId) return

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      // Check for existing draft first
      const draft = await checkDraft()
      
      if (draft) {
        console.log('📋 Borrador encontrado:', draft)
        dispatch({ type: 'SET_RUN_ID', payload: draft.run_id })
        dispatch({ type: 'SET_STATUS', payload: draft.status as UIRunStatus })
        
        // Show toast notification
        toast.success(
          'Borrador Cargado',
          `Se encontró un borrador guardado con ${draft.edited_lines} líneas editadas`,
          5000
        )
      }

      // Loading unified payroll data
      const data = await fetchUnifiedPayroll(
        companyId,
        state.currentPeriod.year,
        state.currentPeriod.month,
        state.currentPeriod.quincena,
        state.filters.tipo
      )

      dispatch({ type: 'SET_DATA', payload: data })
      
      // Si hay un runId en la respuesta, actualizarlo (sobrescribe el del draft si es diferente)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, state.currentPeriod.year, state.currentPeriod.month, state.currentPeriod.quincena, state.filters.tipo])

  const loadAhcPreflight = useCallback(async () => {
    if (!companyId) return
    dispatch({ type: 'SET_AHC_PREFLIGHT_LOADING', payload: true })
    try {
      const q = new URLSearchParams({
        year: String(state.filters.year),
        month: String(state.filters.month),
        quincena: String(state.filters.quincena),
        tipo: String(state.filters.tipo || 'CON'),
      })
      const res = await fetch(`/api/payroll/preflight?${q.toString()}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        dispatch({ type: 'SET_AHC_PREFLIGHT', payload: null })
        return
      }
      dispatch({
        type: 'SET_AHC_PREFLIGHT',
        payload: {
          status: json.status,
          missingAHC: json.missingAHC ?? 0,
          completeRecords: json.completeRecords ?? 0,
          ahcRecords: json.ahcRecords ?? 0,
          totalRecords: json.totalRecords ?? 0,
          recommendedAction: json.recommendedAction,
        },
      })
    } finally {
      dispatch({ type: 'SET_AHC_PREFLIGHT_LOADING', payload: false })
    }
  }, [companyId, state.filters.year, state.filters.month, state.filters.quincena, state.filters.tipo])

  const recalculateMissingAhc = useCallback(async () => {
    if (!companyId) {
      throw new Error('Company ID no encontrado')
    }
    const res = await fetch('/api/payroll/recalculate-missing-ahc', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: state.filters.year,
        month: state.filters.month,
        quincena: state.filters.quincena,
        tipo: state.filters.tipo || 'CON',
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = json?.error || json?.message || `Error ${res.status}`
      throw new Error(msg)
    }
    return json as { success: boolean; missing: number; calculated: number }
  }, [companyId, state.filters.year, state.filters.month, state.filters.quincena, state.filters.tipo])

  // Refresh preflight after preview loads
  useEffect(() => {
    if (!companyId) return
    if (!state.unifiedData) return
    void loadAhcPreflight()
  }, [companyId, state.unifiedData, loadAhcPreflight])

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
        dispatch({
          type: 'SET_DATA',
          payload: {
            rows,
            resumen,
            runId: response.run_id,
            status: response.status ?? 'draft',
            incompleteRecordsAlert: response.incompleteRecordsAlert
          }
        })
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
      } else if (response?.attendanceExemptSummary?.count) {
        toast.warning(
          'Exentos de asistencia',
          response.attendanceExemptSummary.message,
          8000
        )
      } else if (response?.incompleteRecordsAlert?.length) {
        toast.warning(
          'Marcas incompletas detectadas',
          `${response.incompleteRecordsAlert.length} empleado(s) con registros sin check-out. Revise la alerta en la tabla.`,
          8000
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

        if (refreshedData.status) {
          dispatch({ type: 'SET_STATUS', payload: refreshedData.status as UIRunStatus })
        }

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

  const generatePDF = useCallback(
    async (groupBy: PayrollPdfGroupBy = 'none') => {
      if (!state.runId) {
        toast.error('Error', 'No hay una corrida de nómina activa', 4000)
        return
      }

      const defaultFilename = `planilla_${state.currentPeriod.year}-${String(state.currentPeriod.month).padStart(2, '0')}_q${state.currentPeriod.quincena}.pdf`

      const filenameFromContentDisposition = (cd: string | null): string | null => {
        if (!cd) return null
        const m =
          cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ||
          cd.match(/filename="([^"]+)"/)?.[1] ||
          cd.match(/filename=([^;]+)/)?.[1]
        if (!m) return null
        const raw = m.trim().replace(/^["']|["']$/g, '')
        try {
          return decodeURIComponent(raw)
        } catch {
          return raw
        }
      }

      const triggerDownload = (blob: Blob, filename: string) => {
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000)
      }

      try {
        const { url } = await payrollApi.generatePDF(state.runId, {
          groupBy: groupBy === 'none' ? undefined : groupBy
        })
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({} as { message?: string; error?: string }))
          throw new Error(errBody.message || errBody.error || `Error ${res.status}`)
        }

        const buf = await res.arrayBuffer()
        const bytes = new Uint8Array(buf)
        const looksPdf =
          bytes.length >= 4 &&
          bytes[0] === 0x25 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x44 &&
          bytes[3] === 0x46
        const contentType = (res.headers.get('Content-Type') || '').toLowerCase()
        const typedAsPdf = contentType.includes('application/pdf')

        if (!looksPdf && !typedAsPdf) {
          const text = new TextDecoder().decode(bytes.slice(0, 4096))
          let parsed: { message?: string; error?: string } | null = null
          try {
            parsed = JSON.parse(text) as { message?: string; error?: string }
          } catch {
            parsed = null
          }
          const fromJson = parsed?.message || parsed?.error
          throw new Error(fromJson || 'El servidor no devolvió un PDF válido')
        }

        if (bytes.length === 0) {
          throw new Error('El PDF recibido está vacío')
        }

        const filename =
          filenameFromContentDisposition(res.headers.get('Content-Disposition')) || defaultFilename
        const blob = new Blob([buf], { type: 'application/pdf' })
        triggerDownload(blob, filename)
        toast.success('PDF Generado', 'El PDF se ha descargado correctamente', 4000)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'No se pudo generar el PDF'
        toast.error('Error Generando PDF', message, 6000)
      }
    },
    [state.runId, state.currentPeriod, toast]
  )

  const generateVoucher = useCallback(async (runLineId: string) => {
    try {
      // The API function already handles the download
      await payrollApi.generateVoucher(runLineId)
      
      toast.success('Voucher Generado', 'El voucher se ha descargado correctamente', 4000)
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
        // Check for existing draft first
        const draft = await checkDraft()
        
        if (draft) {
          console.log('📋 Borrador encontrado en auto-load:', draft)
          dispatch({ type: 'SET_RUN_ID', payload: draft.run_id })
          dispatch({ type: 'SET_STATUS', payload: draft.status as UIRunStatus })
          
          // Show toast notification
          toast.success(
            'Borrador Cargado',
            `Se encontró un borrador guardado con ${draft.edited_lines} líneas editadas`,
            5000
          )
        }

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
        }
        
        // Si hay un status en la respuesta, actualizar el estado
        if (data.status) {
          dispatch({ type: 'SET_STATUS', payload: data.status as UIRunStatus })
        }
        
        dispatch({ type: 'SET_LOADED_INITIAL', payload: true })
      } catch (error: any) {
        const errorMessage = error?.message || 'Error desconocido'
        dispatch({ type: 'SET_ERROR', payload: `Error cargando datos: ${errorMessage}` })
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasLoadedInitialData, companyId, state.currentPeriod.year, state.currentPeriod.month, state.currentPeriod.quincena, state.filters.tipo])

  // Set unified data directly (for preview updates)
  const setUnifiedData = useCallback((data: { rows: UnifiedRow[]; resumen: UnifiedResumen }) => {
    dispatch({ type: 'SET_DATA', payload: data })
  }, [])

  // Computed Properties
  const canPreview = state.status === 'idle' || state.status === 'draft' || state.status === 'error'
  const canEdit = state.status === 'draft' && !!state.runId
  const canAuthorize = (state.status === 'draft' || state.status === 'edited') && !!state.runId
  const canSend =
    (state.status === 'authorized' || state.status === 'distributed') && !!state.runId
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
    loadAhcPreflight,
    recalculateMissingAhc,
    
    // Filter Management
    updateFilter,
    resetFilters,
    
    // State Management
    setStatus,
    setError,
    clearError,
    setLoading,
    setUnifiedData,
    
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
