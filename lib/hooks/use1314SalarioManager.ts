import { useState, useCallback } from 'react'
import { useCompanyContext } from '../useCompanyContext'
import type {
  BenefitPreviewRow,
  BenefitTipo,
} from '../payroll/thirteenth-fourteenth/preview'

export type Tipo1314 = BenefitTipo
export type Salario1314Row = BenefitPreviewRow

export interface Use1314SalarioManagerState {
  year: number
  tipo: Tipo1314
  data: Salario1314Row[]
  total: number
  periodo: { inicio: string; fin: string } | null
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
    total: 0,
    periodo: null,
    loading: false,
    error: null
  })

  const setYear = useCallback((year: number) => {
    setState((prev) => ({ ...prev, year, data: [], total: 0, periodo: null }))
  }, [])

  const setTipo = useCallback((tipo: Tipo1314) => {
    setState((prev) => ({ ...prev, tipo, data: [], total: 0, periodo: null }))
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
        total: typeof json.total === 'number' ? json.total : 0,
        periodo: json.periodo ?? null,
        loading: false,
        error: null
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar el preview'
      setState((prev) => ({
        ...prev,
        data: [],
        total: 0,
        periodo: null,
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
    total: state.total,
    periodo: state.periodo,
    loading: state.loading,
    error: state.error,
    setYear,
    setTipo,
    fetchPreview
  }
}
