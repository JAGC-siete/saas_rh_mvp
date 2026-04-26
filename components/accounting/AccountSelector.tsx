import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'

export interface AccountOption {
  id: string
  code: string
  name: string
  account_type?: string
}

interface AccountSelectorProps {
  value: string | null
  onChange: (accountId: string | null, account?: AccountOption) => void
  companyId: string | null
  placeholder?: string
  className?: string
  disabled?: boolean
  displayValue?: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

export function AccountSelector({
  value,
  onChange,
  companyId,
  placeholder = 'Buscar por código o nombre...',
  className,
  disabled,
  displayValue
}: AccountSelectorProps) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<AccountOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AccountOption | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  const fetchAccounts = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ company_id: companyId })
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
      const res = await fetch(`/api/accounting/chart-of-accounts?${params}`, {
        credentials: 'include'
      })
      if (res.ok) {
        const { accounts } = await res.json()
        setOptions(accounts ?? [])
      } else {
        setOptions([])
      }
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [companyId, debouncedQuery])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (value && !selected) {
      const found = options.find((a) => a.id === value)
      if (found) setSelected(found)
      else if (companyId) {
        fetch(`/api/accounting/chart-of-accounts?company_id=${companyId}`, {
          credentials: 'include'
        })
          .then((r) => r.json())
          .then(({ accounts }) => {
            const a = (accounts ?? []).find((x: AccountOption) => x.id === value)
            if (a) setSelected(a)
          })
          .catch(() => {})
      }
    } else if (!value) setSelected(null)
  }, [value, companyId, options, selected])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayText =
    displayValue ??
    (selected ? `${selected.code} - ${selected.name}` : '') ??
    query ??
    ''

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        value={open ? query : displayText}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value) {
            onChange(null)
            setSelected(null)
          }
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/20 bg-slate-900/95 backdrop-blur-md py-1 shadow-lg max-h-48 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-white/60">Cargando...</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-white/60">
              {debouncedQuery ? 'Sin resultados' : 'Escriba para buscar'}
            </div>
          ) : (
            options.map((acc) => (
              <button
                key={acc.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                onClick={() => {
                  setSelected(acc)
                  onChange(acc.id, acc)
                  setQuery('')
                  setOpen(false)
                }}
              >
                {acc.code} - {acc.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
