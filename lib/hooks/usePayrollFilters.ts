// Specialized hook for payroll filters management
// Provides clean, focused API for filter operations

import { useCallback, useMemo } from 'react'
import { PayrollFilters } from '../../types/payroll'
import { getCurrentPeriod } from '../payroll-unified'

export interface PayrollFilterActions {
  updateFilter: (key: keyof PayrollFilters, value: any) => void
  resetFilters: () => void
  setFilters: (filters: Partial<PayrollFilters>) => void
  validateFilters: (filters: PayrollFilters) => boolean
}

export interface PayrollFilterState {
  filters: PayrollFilters
  currentPeriod: { year: number; month: number; quincena: 1 | 2 }
  hasChanges: boolean
  isValid: boolean
}

const STORAGE_KEY = 'payroll_filters'

// Default filters
const getDefaultFilters = (): PayrollFilters => {
  const now = getCurrentPeriod()
  return {
    year: now.year,
    month: now.month,
    quincena: now.quincena as 1 | 2,
    tipo: 'CON'
  }
}

// Load filters from localStorage (client-side only)
const loadFilters = (): PayrollFilters => {
  // Only access localStorage on client-side
  if (typeof window === 'undefined') {
    return getDefaultFilters()
  }
  
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

// Save filters to localStorage (client-side only)
const saveFilters = (filters: PayrollFilters) => {
  // Only access localStorage on client-side
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch (error) {
    console.warn('Error saving payroll filters to localStorage:', error)
  }
}

// Validate filters
const validateFilters = (filters: PayrollFilters): boolean => {
  return !!(
    filters.year &&
    filters.month >= 1 && filters.month <= 12 &&
    (filters.quincena === 1 || filters.quincena === 2) &&
    (filters.tipo === 'CON' || filters.tipo === 'SIN')
  )
}

export const usePayrollFilters = (
  filters: PayrollFilters,
  onFiltersChange: (filters: PayrollFilters) => void,
  onPeriodChange: (period: { year: number; month: number; quincena: 1 | 2 }) => void
): PayrollFilterState & PayrollFilterActions => {
  
  // Check if filters have changed from default
  const hasChanges = useMemo(() => {
    const defaultFilters = getDefaultFilters()
    return JSON.stringify(filters) !== JSON.stringify(defaultFilters)
  }, [filters])

  // Validate current filters
  const isValid = useMemo(() => validateFilters(filters), [filters])

  // Get current period from filters
  const currentPeriod = useMemo(() => ({
    year: filters.year,
    month: filters.month,
    quincena: filters.quincena
  }), [filters])

  // Update single filter
  const updateFilter = useCallback((key: keyof PayrollFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    
    // Validate the new filters
    if (!validateFilters(newFilters)) {
      console.warn('Invalid filter value:', { key, value, filters: newFilters })
      return
    }

    onFiltersChange(newFilters)
    saveFilters(newFilters)

    // Update period if it's a period-related filter
    if (['year', 'month', 'quincena'].includes(key)) {
      onPeriodChange({
        year: newFilters.year,
        month: newFilters.month,
        quincena: newFilters.quincena
      })
    }
  }, [filters, onFiltersChange, onPeriodChange])

  // Reset to default filters
  const resetFilters = useCallback(() => {
    const defaultFilters = getDefaultFilters()
    onFiltersChange(defaultFilters)
    onPeriodChange({
      year: defaultFilters.year,
      month: defaultFilters.month,
      quincena: defaultFilters.quincena
    })
    saveFilters(defaultFilters)
  }, [onFiltersChange, onPeriodChange])

  // Set multiple filters at once
  const setFilters = useCallback((newFilters: Partial<PayrollFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    
    // Validate the new filters
    if (!validateFilters(updatedFilters)) {
      console.warn('Invalid filter values:', { newFilters, filters: updatedFilters })
      return
    }

    onFiltersChange(updatedFilters)
    saveFilters(updatedFilters)

    // Update period if any period-related filters changed
    const periodChanged = ['year', 'month', 'quincena'].some(key => key in newFilters)
    if (periodChanged) {
      onPeriodChange({
        year: updatedFilters.year,
        month: updatedFilters.month,
        quincena: updatedFilters.quincena
      })
    }
  }, [filters, onFiltersChange, onPeriodChange])

  return {
    // State
    filters,
    currentPeriod,
    hasChanges,
    isValid,
    
    // Actions
    updateFilter,
    resetFilters,
    setFilters,
    validateFilters
  }
}

// Utility function to load filters from storage
export const loadStoredFilters = (): PayrollFilters => {
  return loadFilters()
}
