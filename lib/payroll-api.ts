// Payroll API Client - Thin and reusable API layer
// Can be easily mocked for testing

import {
  PreviewRequest,
  PreviewResponse,
  EditRequest,
  EditResponse,
  AuthorizeRequest,
  AuthorizeResponse,
  SendMailRequest,
  SendResponse,
  PayrollError
} from '../types/payroll'
import {
  BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE,
  BULK_VOUCHER_EMAIL_TRIAL_MESSAGE,
} from './billing/messages'
import type { PayrollPdfGroupBy } from './payroll/pdf-layout'
import type { VoucherPreviewData } from './payroll/voucher-preview'
import type { PlanillaPreviewData } from './payroll/planilla-preview'

// Generic API function with timeout and error handling
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), 20_000) // 20 second timeout
  
  try {
    const response = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      }
    })
    
    const data = await response.json()
    
    if (!response.ok || data?.ok === false) {
      throw {
        status: response.status,
        ...data
      } as PayrollError
    }
    
    return data as T
  } finally {
    clearTimeout(id)
  }
}

// Payroll API endpoints
export const payrollApi = {
  // Generate payroll preview
  preview: (body: PreviewRequest): Promise<PreviewResponse> =>
    api<PreviewResponse>(`/api/payroll/preview?year=${body.year}&month=${body.month}&quincena=${body.quincena}&tipo=${body.tipo}`, {
      method: 'GET'
    }),

  // Edit payroll line
  edit: (body: EditRequest): Promise<EditResponse> =>
    api<EditResponse>('/api/payroll/edit', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  // Authorize payroll run
  authorize: (body: AuthorizeRequest): Promise<AuthorizeResponse> =>
    api<AuthorizeResponse>('/api/payroll/authorize', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  // Send payroll by email
  sendMail: (body: SendMailRequest): Promise<SendResponse> =>
    api<SendResponse>('/api/payroll/send-email', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  // Generate PDF from run (URL para fetch con credentials; group_by opcional)
  generatePDF: (runId: string, options?: { groupBy?: PayrollPdfGroupBy }): Promise<{ url: string }> => {
    const params = new URLSearchParams({ run_id: runId })
    const gb = options?.groupBy
    if (gb && gb !== 'none') {
      params.set('group_by', gb)
    }
    return Promise.resolve({ url: `/api/payroll/generate-pdf-from-run?${params.toString()}` })
  },

  // Preview voucher data for on-screen modal
  fetchVoucherPreview: async (runLineId: string): Promise<{ preview: VoucherPreviewData }> => {
    const params = new URLSearchParams({ run_line_id: runLineId })
    const response = await fetch(`/api/payroll/voucher-preview?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || data?.message || 'No se pudo cargar el comprobante')
    }
    return data.data
  },

  fetchPlanillaPreview: async (runId: string): Promise<{ preview: PlanillaPreviewData }> => {
    const params = new URLSearchParams({ run_id: runId })
    const response = await fetch(`/api/payroll/planilla-preview?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || data?.message || 'No se pudo cargar la planilla')
    }
    return data.data
  },

  // Download voucher PDF from run_line_id
  downloadVoucher: async (runLineId: string): Promise<void> => {
    const response = await fetch(`/api/payroll/receipt-voucher?run_line_id=${encodeURIComponent(runLineId)}`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate voucher' }))
      throw new Error(error.error || error.message || 'Failed to generate voucher')
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `voucher_${runLineId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  },

  /** @deprecated Use downloadVoucher */
  generateVoucher: async (runLineId: string): Promise<{ url: string }> => {
    await payrollApi.downloadVoucher(runLineId)
    return { url: '' }
  },
}

// Error mapping for better UX
export const mapPayrollError = (error: any): string => {
  if (
    error?.code === BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE ||
    error?.error === BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE
  ) {
    return error?.message || BULK_VOUCHER_EMAIL_TRIAL_MESSAGE
  }

  if (error?.errorCode) {
    switch (error.errorCode) {
      case 'TENANT_MISMATCH':
        return 'Acceso no autorizado a esta empresa'
      case 'RUN_CLOSED':
        return 'La nómina ya está cerrada y no se puede editar'
      case 'MAIL_SENDER_UNVERIFIED':
        return 'El remitente de email no está verificado'
      case 'WHATSAPP_IN_DEVELOPMENT':
        return 'Envío por WhatsApp en desarrollo'
      default:
        return error.message || 'Error desconocido'
    }
  }
  
  if (error?.status === 403) {
    return 'No tienes permisos para realizar esta acción'
  }
  
  if (error?.status === 404) {
    return 'Recurso no encontrado'
  }
  
  if (error?.status === 500) {
    return 'Error interno del servidor'
  }
  
  return error?.message || 'Error desconocido'
}

// Utility functions
export const downloadFile = (url: string, filename: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const openInNewTab = (url: string) => {
  window.open(url, '_blank')
}
