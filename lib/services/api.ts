import { supabase } from '../supabase'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiService {
  private baseUrl = '/api'
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token 
      ? { 'Authorization': `Bearer ${session.access_token}` }
      : {}
  }
  
  // Make request public
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = await this.getAuthHeaders()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...options.headers
      }
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new ApiError(response.status, errorData)
    }
    
    return response.json()
  }
  
  // Attendance methods
  async registerAttendance(data: { last5: string; justification?: string }) {
    return this.request('/attendance/register', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async lookupEmployee(data: { last5: string }) {
    return this.request('/attendance/lookup', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async getWeeklyPattern() {
    return this.request('/attendance/weekly-pattern')
  }
  
  // Payroll methods
  async calculatePayroll(data: { periodo: string; quincena: number; incluirDeducciones?: boolean }) {
    return this.request('/payroll/calculate', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async getPayrollRecords(params?: { periodo?: string; quincena?: number }) {
    const query = new URLSearchParams()
    if (params?.periodo) query.append('periodo', params.periodo)
    if (params?.quincena) query.append('quincena', params.quincena.toString())
    
    return this.request(`/payroll/records?${query.toString()}`)
  }
  
  async exportPayrollPDF(params: { periodo: string; quincena: number }) {
    const query = new URLSearchParams()
    query.append('periodo', params.periodo)
    query.append('quincena', params.quincena.toString())
    
    const response = await fetch(`${this.baseUrl}/payroll/export?${query.toString()}`, {
      headers: await this.getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, 'Error exporting PDF')
    }
    
    return response.blob()
  }
  
  // Auth methods
  async validateToken() {
    return this.request('/auth/validate')
  }
  
  // Health check
  async healthCheck() {
    return this.request('/health')
  }
}

export const apiService = new ApiService()
export default apiService