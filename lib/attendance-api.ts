// Attendance API Client - Consistent with payroll-api.ts
// Provides a clean abstraction layer for attendance operations

export interface AttendanceExportParams {
  preset?: string
  formato?: 'excel' | 'csv' | 'pdf'
  employee_id?: string
  role?: string
  startDate?: string
  endDate?: string
}

export interface AttendanceExportResponse {
  url: string
  filename?: string
}

export interface AttendanceError {
  status: number
  error: string
  message?: string
  details?: any
}

// Generic API function with timeout and error handling (same as payroll)
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
      } as AttendanceError
    }
    
    return data as T
  } finally {
    clearTimeout(id)
  }
}

// Attendance API endpoints
export const attendanceApi = {
  // Export attendance data
  export: async (params: AttendanceExportParams): Promise<AttendanceExportResponse> => {
    const searchParams = new URLSearchParams()
    
    if (params.preset) searchParams.set('preset', params.preset)
    if (params.formato) searchParams.set('formato', params.formato)
    if (params.employee_id) searchParams.set('employee_id', params.employee_id)
    if (params.role) searchParams.set('role', params.role)
    if (params.startDate) searchParams.set('startDate', params.startDate)
    if (params.endDate) searchParams.set('endDate', params.endDate)
    
    const url = `/api/attendance/export?${searchParams.toString()}`
    
    // Para PDF, manejar descarga directa
    if (params.formato === 'pdf') {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Crear blob y URL para descarga
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      return { url: downloadUrl }
    }
    
    return { url }
  },

  // Generate PDF (when implemented)
  generatePDF: (params: AttendanceExportParams): Promise<AttendanceExportResponse> => {
    const searchParams = new URLSearchParams()
    
    if (params.preset) searchParams.set('preset', params.preset)
    if (params.employee_id) searchParams.set('employee_id', params.employee_id)
    if (params.role) searchParams.set('role', params.role)
    if (params.startDate) searchParams.set('startDate', params.startDate)
    if (params.endDate) searchParams.set('endDate', params.endDate)
    
    const url = `/api/attendance/generate-pdf?${searchParams.toString()}`
    return Promise.resolve({ url })
  },

  // Get teams/roles
  getTeams: (): Promise<{ success: boolean; roles: string[] }> =>
    api<{ success: boolean; roles: string[] }>('/api/teams'),

  // Get attendance KPIs
  getKPIs: (params: AttendanceExportParams): Promise<any> => {
    const searchParams = new URLSearchParams()
    
    if (params.preset) searchParams.set('preset', params.preset)
    if (params.employee_id) searchParams.set('employee_id', params.employee_id)
    if (params.role) searchParams.set('role', params.role)
    
    return api<any>(`/api/attendance/kpis?${searchParams.toString()}`)
  },

  // Get attendance lists
  getLists: (params: AttendanceExportParams & { type?: string }): Promise<any[]> => {
    const searchParams = new URLSearchParams()
    
    if (params.preset) searchParams.set('preset', params.preset)
    if (params.type) searchParams.set('type', params.type)
    if (params.employee_id) searchParams.set('employee_id', params.employee_id)
    if (params.role) searchParams.set('role', params.role)
    
    return api<any[]>(`/api/attendance/lists?${searchParams.toString()}`)
  },

  // Get attendance trends
  getTrends: (params: AttendanceExportParams): Promise<{ success: boolean; data: any[] }> => {
    const searchParams = new URLSearchParams()
    
    if (params.preset) searchParams.set('preset', params.preset)
    if (params.employee_id) searchParams.set('employee_id', params.employee_id)
    if (params.role) searchParams.set('role', params.role)
    
    return api<{ success: boolean; data: any[] }>(`/api/reports/attendance-trends?${searchParams.toString()}`)
  }
}

// Error mapping utility (consistent with payroll)
export const mapAttendanceError = (error: any): string => {
  if (error.status === 403) {
    return 'No tienes permisos para realizar esta acción'
  }
  if (error.status === 404) {
    return 'No se encontraron datos para el período seleccionado'
  }
  if (error.status === 400) {
    return error.message || 'Parámetros inválidos'
  }
  if (error.status === 500) {
    return 'Error interno del servidor. Intenta nuevamente'
  }
  return error.message || 'Error desconocido'
}
