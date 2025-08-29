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
    api<PreviewResponse>('/api/payroll/preview', {
      method: 'POST',
      body: JSON.stringify(body)
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

  // Generate PDF
  generatePDF: (runId: string): Promise<{ url: string }> =>
    api<{ url: string }>(`/api/payroll/generate-pdf?run_id=${runId}`),

  // Generate voucher
  generateVoucher: (runLineId: string): Promise<{ url: string }> =>
    api<{ url: string }>(`/api/payroll/generate-voucher?run_line_id=${runLineId}`)
}

// Error mapping for better UX
export const mapPayrollError = (error: any): string => {
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
