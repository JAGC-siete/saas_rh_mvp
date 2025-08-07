import { useState, useEffect, useCallback } from 'react'

interface Employee {
  id: string
  company_id: string
  employee_code: string
  dni: string
  name: string
  email: string
  phone: string
  role: string
  position: string
  base_salary: number
  hire_date: string
  status: string
  bank_name: string
  bank_account: string
  department_id?: string
  attendance_status?: 'present' | 'absent' | 'late' | 'not_registered'
  check_in_time?: string
  check_out_time?: string
  work_schedule?: {
    name: string
    start_time: string
    end_time: string
  }
  gamification?: {
    total_points: number
    weekly_points: number
    monthly_points: number
    achievements_count: number
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface SearchParams {
  search: string
  page: number
  limit: number
  status: string
  department_id?: string
  sort_by: string
  sort_order: 'asc' | 'desc'
}

interface UseEmployeeSearchReturn {
  employees: Employee[]
  loading: boolean
  error: string | null
  pagination: PaginationInfo
  searchParams: SearchParams
  setSearchParams: (params: Partial<SearchParams>) => void
  refreshData: () => void
}

export function useEmployeeSearch(): UseEmployeeSearchReturn {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  const [searchParams, setSearchParamsState] = useState<SearchParams>({
    search: '',
    page: 1,
    limit: 20,
    status: 'active',
    sort_by: 'name',
    sort_order: 'asc'
  })

  // Debounce search term
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchParams.search)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchParams.search])

  // Fetch employees function
  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const searchParamsObj = new URLSearchParams({
        search: debouncedSearch,
        page: searchParams.page.toString(),
        limit: searchParams.limit.toString(),
        status: searchParams.status,
        sort_by: searchParams.sort_by,
        sort_order: searchParams.sort_order
      })

      if (searchParams.department_id) {
        searchParamsObj.append('department_id', searchParams.department_id)
      }

      const response = await fetch(`/api/employees/search?${searchParamsObj}`)
      
      if (!response.ok) {
        throw new Error('Error fetching employees')
      }

      const data = await response.json()
      
      setEmployees(data.employees)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, searchParams])

  // Fetch data when search params change
  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // Set search params function
  const setSearchParams = useCallback((params: Partial<SearchParams>) => {
    setSearchParamsState(prev => {
      const newParams = { ...prev, ...params }
      
      // Reset to page 1 when search term changes
      if (params.search !== undefined && params.search !== prev.search) {
        newParams.page = 1
      }
      
      return newParams
    })
  }, [])

  // Refresh data function
  const refreshData = useCallback(() => {
    fetchEmployees()
  }, [fetchEmployees])

  return {
    employees,
    loading,
    error,
    pagination,
    searchParams,
    setSearchParams,
    refreshData
  }
} 