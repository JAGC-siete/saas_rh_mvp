import { useState, useCallback } from 'react'
import { useCompanyContext } from '../useCompanyContext'

export type Tipo1314 = '13AVO' | '14AVO'

export interface Salario1314Row {
  employee_id: string
  name: string
  base_salary: number
  amount: number
  months_worked?: number
  days_worked?: number
  [key: string]: unknown
}

export interface Use1314SalarioManagerState {
  year: number
  tipo: Tipo1314
  data: Salario1314Row[]
  loading: boolean
  error: string | null
}

const getCurrentYear = () => new Date().getFullYear()

export function use1314SalarioManager() {
  const { companyId, loading: companyLoading } = useCompanyContext()

  const [state, setState] = useState<Use1314SalarioManagerState>({
    year: getCurrentYear(),
    tipo: '13AVO',
    data: [],
    loading: false,
    error: null
  })

  const setYear = useCallback((year: number) => {
    setState((prev) => ({ ...prev, year }))
  }, [])

  const setTipo = useCallback((tipo: Tipo1314) => {
    setState((prev) => ({ ...prev, tipo }))
  }, [])

  const fetchPreview = useCallback(async () => {
    if (!companyId) {
      setState((prev) => ({
        ...prev,
        error: 'No se encontró el contexto de la empresa.',
        loading: false
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        year: state.year.toString(),
        tipo: state.tipo
      })
      const res = await fetch(`/api/13-14-salario/preview?${params}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${res.status}: ${res.statusText}`)
      }

      const json = await res.json()
      const rows = Array.isArray(json.rows) ? json.rows : []
      setState((prev) => ({
        ...prev,
        data: rows,
        loading: false,
        error: null
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar el preview'
      setState((prev) => ({
        ...prev,
        data: [],
        loading: false,
        error: message
      }))
    }
  }, [companyId, state.year, state.tipo])

  return {
    companyId,
    companyLoading,
    year: state.year,
    tipo: state.tipo,
    data: state.data,
    loading: state.loading,
    error: state.error,
    setYear,
    setTipo,
    fetchPreview
  }
}
