import { useState, useEffect, useCallback } from 'react'

interface Employee {
  id: string
  name: string
  employee_code: string
  dni: string
  email: string
  phone: string
  position: string
  status: string
  attendance_status?: 'present' | 'absent' | 'late' | 'not_registered'
  check_in_time?: string
  check_out_time?: string
  departments?: { name: string }
  work_schedules?: { name: string }
  employee_scores?: { total_points: number }
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
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

export function useEmployeeSearch() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  })
  const [searchParams, setSearchParams] = useState<SearchParams>({
    search: '',
    page: 1,
    limit: 20,
    status: 'active',
    sort_by: 'name',
    sort_order: 'asc'
  })

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        search: searchParams.search,
        page: searchParams.page.toString(),
        limit: searchParams.limit.toString(),
        status: searchParams.status,
        sort_by: searchParams.sort_by,
        sort_order: searchParams.sort_order
      })

      if (searchParams.department_id) {
        params.append('department_id', searchParams.department_id)
      }

      const response = await fetch(`/api/employees/search?${params}`)
      
      if (!response.ok) {
        throw new Error('Error fetching employees')
      }

      const data = await response.json()
      setEmployees(data.employees)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching employees')
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEmployees()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [fetchEmployees])

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