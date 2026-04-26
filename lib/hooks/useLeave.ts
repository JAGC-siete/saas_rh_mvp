import { useState, useCallback } from 'react'
import { logger } from '../logger'
import { LeaveRequest, LeaveType, CreateLeaveRequestData, UpdateLeaveRequestData } from '../types/leave'

function apiErrorMessage(errorData: { message?: string; error?: string } | null, fallback: string): string {
  if (!errorData) return fallback
  const m = errorData.message || errorData.error
  return typeof m === 'string' && m.trim() ? m.trim() : fallback
}

interface UseLeaveReturn {
  // State
  leaveRequests: LeaveRequest[]
  leaveTypes: LeaveType[]
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  
  // Actions
  fetchLeaveRequests: () => Promise<void>
  fetchLeaveTypes: () => Promise<void>
  createLeaveRequest: (data: CreateLeaveRequestData) => Promise<LeaveRequest | null>
  updateLeaveRequest: (id: string, data: UpdateLeaveRequestData) => Promise<LeaveRequest | null>
  deleteLeaveRequest: (id: string) => Promise<boolean>
  clearError: () => void
}

export function useLeave(): UseLeaveReturn {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Las solicitudes de permiso se consumen enriquecidas: `employee` y `leave_type`
   * vienen del join en GET /api/leave; no duplicar resolución con listas locales salvo en el formulario de alta.
   */
  const fetchLeaveRequests = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/leave')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(errorData, 'Error fetching leave requests'))
      }
      
      const { data } = await response.json()
      setLeaveRequests(data || [])
      
      logger.info('Leave requests fetched successfully', {
        count: data?.length || 0
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching leave requests'
      setError(errorMessage)
      logger.error('Error fetching leave requests', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchLeaveTypes = useCallback(async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/leave/types')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(errorData, 'Error fetching leave types'))
      }
      
      const { data } = await response.json()
      setLeaveTypes(data || [])
      
      logger.info('Leave types fetched successfully', {
        count: data?.length || 0
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching leave types'
      setError(errorMessage)
      logger.error('Error fetching leave types', error)
      throw error
    }
  }, [])

  const createLeaveRequest = useCallback(async (data: CreateLeaveRequestData): Promise<LeaveRequest | null> => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('employee_dni', data.employee_dni)
      formData.append('leave_type_id', data.leave_type_id)
      formData.append('start_date', data.start_date)
      formData.append('end_date', data.end_date)
      formData.append('duration_type', data.duration_type)
      if (data.duration_hours) {
        formData.append('duration_hours', data.duration_hours.toString())
      }
      formData.append('is_half_day', data.is_half_day?.toString() || 'false')
      if (data.reason) {
        formData.append('reason', data.reason)
      }
      if (data.attachment) {
        formData.append('attachment', data.attachment)
      }

      const response = await fetch('/api/leave', {
        method: 'POST',
        body: formData, // Use FormData for file upload
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(errorData, 'Error creating leave request'))
      }

      const { data: createdRequest } = await response.json()
      
      // Update local state
      setLeaveRequests(prev => [createdRequest, ...prev])
      
      logger.info('Leave request created successfully', {
        leaveRequestId: createdRequest.id,
        employeeDni: data.employee_dni
      })
      
      return createdRequest
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error creating leave request'
      setError(errorMessage)
      logger.error('Error creating leave request', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const updateLeaveRequest = useCallback(async (id: string, data: UpdateLeaveRequestData): Promise<LeaveRequest | null> => {
    try {
      setIsSubmitting(true)
      setError(null)
      
      const response = await fetch(`/api/leave/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(errorData, 'Error updating leave request'))
      }

      const { data: updatedRequest } = await response.json()
      
      // Update local state
      setLeaveRequests(prev => 
        prev.map(request => 
          request.id === id ? updatedRequest : request
        )
      )
      
      logger.info('Leave request updated successfully', {
        leaveRequestId: id,
        newStatus: data.status
      })
      
      return updatedRequest
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating leave request'
      setError(errorMessage)
      logger.error('Error updating leave request', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const deleteLeaveRequest = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsSubmitting(true)
      setError(null)
      
      const response = await fetch(`/api/leave/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(errorData, 'Error deleting leave request'))
      }

      // Update local state
      setLeaveRequests(prev => prev.filter(request => request.id !== id))
      
      logger.info('Leave request deleted successfully', {
        leaveRequestId: id
      })
      
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error deleting leave request'
      setError(errorMessage)
      logger.error('Error deleting leave request', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return {
    // State
    leaveRequests,
    leaveTypes,
    isLoading,
    isSubmitting,
    error,
    
    // Actions
    fetchLeaveRequests,
    fetchLeaveTypes,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    clearError,
  }
}
