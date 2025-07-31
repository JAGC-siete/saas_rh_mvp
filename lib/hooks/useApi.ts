import { useState, useCallback } from 'react'
import { apiService, ApiError } from '../services/api'

interface UseApiOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: ApiError) => void
}

export function useApi<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  
  const execute = useCallback(async (params?: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiService.request(endpoint, params)
      setData(result)
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      options.onError?.(apiError)
      throw apiError
    } finally {
      setLoading(false)
    }
  }, [endpoint, options.onSuccess, options.onError])
  
  return { data, loading, error, execute }
}

// Specific hooks for common operations
export function useAttendance() {
  const registerAttendance = useCallback(async (data: { last5: string; justification?: string }) => {
    return apiService.registerAttendance(data)
  }, [])
  
  const lookupEmployee = useCallback(async (data: { last5: string }) => {
    return apiService.lookupEmployee(data)
  }, [])
  
  return { registerAttendance, lookupEmployee }
}

export function usePayroll() {
  const calculatePayroll = useCallback(async (data: { periodo: string; quincena: number; incluirDeducciones?: boolean }) => {
    return apiService.calculatePayroll(data)
  }, [])
  
  const getPayrollRecords = useCallback(async (params?: { periodo?: string; quincena?: number }) => {
    return apiService.getPayrollRecords(params)
  }, [])
  
  const exportPayrollPDF = useCallback(async (params: { periodo: string; quincena: number }) => {
    return apiService.exportPayrollPDF(params)
  }, [])
  
  return { calculatePayroll, getPayrollRecords, exportPayrollPDF }
}