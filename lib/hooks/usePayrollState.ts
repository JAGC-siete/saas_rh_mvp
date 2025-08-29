// Custom hook for managing payroll state with persistence
// Implements state machine and localStorage persistence

import { useState, useCallback } from 'react'
import {
  PayrollState,
  UIRunStatus,
  PayrollFilters
} from '../../types/payroll'
import { payrollApi, mapPayrollError } from '../payroll-api'

const STORAGE_KEY = 'payroll_filters'

// Default filters
const getDefaultFilters = (): PayrollFilters => {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quincena: 1,
    tipo: 'CON'
  }
}

// Load filters from localStorage
const loadFilters = (): PayrollFilters => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate stored data
      if (parsed.year && parsed.month && parsed.quincena && parsed.tipo) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Error loading payroll filters from localStorage:', error)
  }
  return getDefaultFilters()
}

// Save filters to localStorage
const saveFilters = (filters: PayrollFilters) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch (error) {
    console.warn('Error saving payroll filters to localStorage:', error)
  }
}

export const usePayrollState = () => {
  const [state, setState] = useState<PayrollState>({
    status: 'idle',
    filters: loadFilters(),
    planilla: [],
    loading: false
  })

  // Update filters and persist to localStorage
  const updateFilters = useCallback((newFilters: Partial<PayrollFilters>) => {
    const updatedFilters = { ...state.filters, ...newFilters }
    setState((prev: PayrollState) => ({ ...prev, filters: updatedFilters }))
    saveFilters(updatedFilters)
  }, [state.filters])

  // Reset to default filters
  const resetFilters = useCallback(() => {
    const defaultFilters = getDefaultFilters()
    setState((prev: PayrollState) => ({ ...prev, filters: defaultFilters }))
    saveFilters(defaultFilters)
  }, [])

  // State machine transitions
  const setStatus = useCallback((newStatus: UIRunStatus) => {
    setState((prev: PayrollState) => ({ ...prev, status: newStatus }))
  }, [])

  const setError = useCallback((error: string) => {
    setState((prev: PayrollState) => ({ 
      ...prev, 
      status: 'error', 
      error,
      loading: false 
    }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev: PayrollState) => ({ ...prev, error: undefined }))
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState((prev: PayrollState) => ({ ...prev, loading }))
  }, [])

  // Preview action
  const generatePreview = useCallback(async () => {
    setStatus('previewing')
    setLoading(true)
    clearError()

    try {
      const response = await payrollApi.preview(state.filters)
      
      setState((prev: PayrollState) => ({
        ...prev,
        status: 'draft',
        runId: response.run_id,
        planilla: response.planilla,
        loading: false
      }))

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      setError(errorMessage)
      throw error
    }
  }, [state.filters, setStatus, setLoading, clearError, setError])

  // Edit action
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

      // Update the specific line in planilla
      setState((prev: PayrollState) => ({
        ...prev,
        status: 'draft',
        planilla: prev.planilla.map((line: any) => 
          line.line_id === runLineId 
            ? { ...line, [field]: newValue }
            : line
        ),
        loading: false
      }))

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      setError(errorMessage)
      throw error
    }
  }, [state.runId, setStatus, setLoading, clearError, setError])

  // Authorize action
  const authorizeRun = useCallback(async () => {
    if (!state.runId) {
      throw new Error('No hay una corrida de nómina activa')
    }

    setStatus('authorizing')
    setLoading(true)
    clearError()

    try {
      const response = await payrollApi.authorize({ run_id: state.runId })
      
      setState((prev: PayrollState) => ({
        ...prev,
        status: 'authorized',
        loading: false
      }))

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      setError(errorMessage)
      throw error
    }
  }, [state.runId, setStatus, setLoading, clearError, setError])

  // Send email action
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

      setState((prev: PayrollState) => ({
        ...prev,
        status: 'authorized',
        loading: false
      }))

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      setError(errorMessage)
      throw error
    }
  }, [state.runId, setStatus, setLoading, clearError, setError])

  // Reset state
  const resetState = useCallback(() => {
    setState({
      status: 'idle',
      filters: state.filters, // Keep current filters
      planilla: [],
      loading: false
    })
  }, [state.filters])

  // Check if actions are enabled based on current status
  const canPreview = state.status === 'idle' || state.status === 'draft' || state.status === 'error'
  const canEdit = state.status === 'draft' && !!state.runId
  const canAuthorize = state.status === 'draft' && !!state.runId
  const canSend = state.status === 'authorized' && !!state.runId
  const canReset = state.status !== 'idle'

  return {
    // State
    ...state,
    
    // Actions
    generatePreview,
    editLine,
    authorizeRun,
    sendEmail,
    resetState,
    
    // Filter management
    updateFilters,
    resetFilters,
    
    // State management
    setStatus,
    setError,
    clearError,
    setLoading,
    
    // Computed properties
    canPreview,
    canEdit,
    canAuthorize,
    canSend,
    canReset,
    
    // Utility
    hasPlanilla: state.planilla.length > 0,
    hasEdits: state.planilla.some((line: any) => line.line_id && state.planilla.some((l: any) => l.line_id === line.line_id)),
    totalEmployees: state.planilla.length,
    totalBruto: state.planilla.reduce((sum: number, line: any) => sum + line.total_earnings, 0),
    totalDeducciones: state.planilla.reduce((sum: number, line: any) => sum + line.total_deducciones, 0),
    totalNeto: state.planilla.reduce((sum: number, line: any) => sum + line.total, 0)
  }
}
