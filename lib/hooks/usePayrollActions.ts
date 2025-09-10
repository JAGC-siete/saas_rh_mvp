// Specialized hook for payroll actions
// Provides clean, focused API for payroll operations

import { useCallback } from 'react'
import { useToast } from '../toast'
import { payrollApi, mapPayrollError } from '../payroll-api'
import { PayrollFilters } from '../../types/payroll'

export interface PayrollActions {
  // Data loading
  loadUnifiedData: () => Promise<void>
  
  // Legacy API actions
  generatePreview: (filters: PayrollFilters) => Promise<any>
  editLine: (runLineId: string, field: string, newValue: number, reason?: string) => Promise<any>
  authorizeRun: (runId: string) => Promise<any>
  sendEmail: (runId: string, employeeId?: string) => Promise<any>
  generatePDF: (runId: string, period: { year: number; month: number }) => Promise<void>
  generateVoucher: (runLineId: string) => Promise<void>
}

export const usePayrollActions = (
  onLoadingChange: (loading: boolean) => void,
  onErrorChange: (error: string | null) => void,
  onStatusChange: (status: string) => void,
  onRunIdChange: (runId: string | undefined) => void
): PayrollActions => {
  const toast = useToast()

  const loadUnifiedData = useCallback(async () => {
    onLoadingChange(true)
    onErrorChange(null)

    try {
      // This will be implemented by the parent component
      // with the actual data loading logic
      console.log('Loading unified data...')
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido'
      onErrorChange(`Error cargando datos: ${errorMessage}`)
      toast.error('Error', 'No se pudieron cargar los datos del período actual', 5000)
    } finally {
      onLoadingChange(false)
    }
  }, [onLoadingChange, onErrorChange, toast])

  const generatePreview = useCallback(async (filters: PayrollFilters) => {
    onStatusChange('previewing')
    onLoadingChange(true)
    onErrorChange(null)

    try {
      const response = await payrollApi.preview(filters)
      
      onRunIdChange(response.run_id)
      onStatusChange('draft')
      
      toast.success(
        'Preview Generado',
        `${response.empleados} empleados procesados exitosamente`,
        5000
      )

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      onErrorChange(errorMessage)
      onStatusChange('error')
      toast.error('Error en Preview', errorMessage, 8000)
      throw error
    } finally {
      onLoadingChange(false)
    }
  }, [onStatusChange, onLoadingChange, onErrorChange, onRunIdChange, toast])

  const editLine = useCallback(async (
    runLineId: string,
    field: string,
    newValue: number,
    reason?: string
  ) => {
    onStatusChange('editing')
    onLoadingChange(true)
    onErrorChange(null)

    try {
      const response = await payrollApi.edit({
        run_line_id: runLineId,
        field: field as any,
        new_value: newValue,
        reason
      })

      onStatusChange('draft')
      toast.success('Línea Editada', `Campo ${field} actualizado a ${newValue}`, 4000)

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      onErrorChange(errorMessage)
      onStatusChange('error')
      toast.error('Error Editando', errorMessage, 6000)
      throw error
    } finally {
      onLoadingChange(false)
    }
  }, [onStatusChange, onLoadingChange, onErrorChange, toast])

  const authorizeRun = useCallback(async (runId: string) => {
    onStatusChange('authorizing')
    onLoadingChange(true)
    onErrorChange(null)

    try {
      const response = await payrollApi.authorize({ run_id: runId })
      
      onStatusChange('authorized')
      toast.success('Nómina Autorizada', 'La nómina ha sido autorizada exitosamente', 6000)

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      onErrorChange(errorMessage)
      onStatusChange('error')
      toast.error('Error Autorizando', errorMessage, 8000)
      throw error
    } finally {
      onLoadingChange(false)
    }
  }, [onStatusChange, onLoadingChange, onErrorChange, toast])

  const sendEmail = useCallback(async (runId: string, employeeId?: string) => {
    onStatusChange('distributing')
    onLoadingChange(true)
    onErrorChange(null)

    try {
      const response = await payrollApi.sendMail({
        run_id: runId,
        employee_id: employeeId
      })

      onStatusChange('authorized')
      
      if (response.successful > 0) {
        toast.success('Emails Enviados', `${response.successful} emails enviados exitosamente`, 5000)
      }
      
      if (response.failed > 0) {
        toast.warning('Algunos Emails Fallaron', `${response.failed} emails no se pudieron enviar`, 8000)
      }

      return response
    } catch (error: any) {
      const errorMessage = mapPayrollError(error)
      onErrorChange(errorMessage)
      onStatusChange('error')
      toast.error('Error Enviando Emails', errorMessage, 8000)
      throw error
    } finally {
      onLoadingChange(false)
    }
  }, [onStatusChange, onLoadingChange, onErrorChange, toast])

  const generatePDF = useCallback(async (runId: string, period: { year: number; month: number }) => {
    try {
      const response = await payrollApi.generatePDF(runId)
      
      // Trigger direct download
      const link = document.createElement('a')
      link.href = response.url
      link.download = `planilla_${period.year}-${period.month.toString().padStart(2, '0')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('PDF Generado', 'El PDF se ha descargado correctamente', 4000)
    } catch (error: any) {
      toast.error('Error Generando PDF', 'No se pudo generar el PDF', 6000)
    }
  }, [toast])

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

  return {
    loadUnifiedData,
    generatePreview,
    editLine,
    authorizeRun,
    sendEmail,
    generatePDF,
    generateVoucher
  }
}
