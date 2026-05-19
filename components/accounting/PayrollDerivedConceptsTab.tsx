import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, Link2Off } from 'lucide-react'
import type {
  DerivedConceptRow,
  PayrollDerivedDeductionField,
  PayrollDerivedMappingRow,
  PayrollDerivedMappingsPayload
} from '../../lib/accounting/payroll-derived-mappings'

function formatMappingApiError(res: Response, body: Record<string, unknown>): string {
  if (res.status === 429) {
    const retryAfter = body.retryAfter
    const retryHint =
      typeof retryAfter === 'number' && retryAfter > 0
        ? ` Reintente en ${retryAfter} segundos.`
        : ''
    return `${String(body.message || body.error || 'Demasiadas solicitudes')}.${retryHint}`
  }
  return String(body.error || body.message || 'Error en la solicitud')
}

function normalizeConceptCode(code: string | null | undefined): string | null {
  if (!code) return null
  const trimmed = code.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

export function PayrollDerivedConceptsTab() {
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [deductions, setDeductions] = useState<PayrollDerivedDeductionField[]>([])
  const [concepts, setConcepts] = useState<DerivedConceptRow[]>([])
  const [mappings, setMappings] = useState<PayrollDerivedMappingRow[]>([])

  const [newConceptCode, setNewConceptCode] = useState('')
  const [newConceptLabel, setNewConceptLabel] = useState('')

  const loadInFlight = useRef(false)
  const skipBlurSaveRef = useRef(false)

  const applyPayload = useCallback((payload: PayrollDerivedMappingsPayload) => {
    setDeductions(payload.deductions || [])
    setConcepts(payload.concepts || [])
    setMappings(payload.mappings || [])
  }, [])

  const mappingByField = useMemo(() => {
    const m = new Map<string, PayrollDerivedMappingRow>()
    for (const row of mappings) m.set(row.field_key, row)
    return m
  }, [mappings])

  const loadAll = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlight.current) return
    loadInFlight.current = true
    if (!options?.silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const res = await fetch('/api/accounting/payroll-derived-mappings', { credentials: 'include' })
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) throw new Error(formatMappingApiError(res, j))
      applyPayload(j as PayrollDerivedMappingsPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos')
    } finally {
      loadInFlight.current = false
      if (!options?.silent) setLoading(false)
    }
  }, [applyPayload])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const conceptOptions = useMemo(() => {
    const base = [
      { code: 'IHSS', label: 'IHSS' },
      { code: 'RAP', label: 'RAP' },
      { code: 'INFOP', label: 'INFOP' }
    ]
    const extra = (concepts || []).map((c) => ({ code: c.code, label: c.label }))
    const draftCode = newConceptCode.trim().toUpperCase()
    const draft =
      /^[A-Z0-9_]{2,64}$/.test(draftCode)
        ? [{ code: draftCode, label: newConceptLabel.trim() || draftCode }]
        : []
    const seen = new Set<string>()
    const merged = [...base, ...extra, ...draft].filter((c) => {
      const k = c.code.toUpperCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    merged.sort((a, b) => a.label.localeCompare(b.label))
    return merged
  }, [concepts, newConceptCode, newConceptLabel])

  const saveMapping = async (fieldKey: string, conceptCode: string | null) => {
    const current = mappingByField.get(fieldKey)
    const nextCode = normalizeConceptCode(conceptCode)
    const currentCode = normalizeConceptCode(current?.concept_code)
    if (nextCode === currentCode) return

    setSavingKey(fieldKey)
    setError(null)
    try {
      const draftCode = newConceptCode.trim().toUpperCase()
      const res = await fetch('/api/accounting/payroll-derived-mappings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_key: fieldKey,
          concept_code: conceptCode,
          concept_label:
            nextCode && draftCode && nextCode === draftCode ? newConceptLabel.trim() || undefined : undefined
        })
      })
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) throw new Error(formatMappingApiError(res, j))
      if (Array.isArray(j.mappings)) {
        applyPayload(j as PayrollDerivedMappingsPayload)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400/80" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Derivados de nómina</CardTitle>
          <CardDescription className="text-white/70">
            Mapea deducciones personalizadas (custom fields) a un concepto derivado para que aparezcan agrupadas en
            reportes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadAll()}
                className="border-white/20 text-white hover:bg-white/10 shrink-0"
              >
                Reintentar
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-white/15 bg-white/5 p-4 mb-4">
            <div className="text-sm font-medium text-white mb-2">Crear concepto (opcional)</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Código (A-Z0-9_)</label>
                <Input
                  value={newConceptCode}
                  onChange={(e) => setNewConceptCode(e.target.value)}
                  placeholder="COOPERATIVA"
                  className="input-glass text-white placeholder:text-white/60"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Nombre</label>
                <Input
                  value={newConceptLabel}
                  onChange={(e) => setNewConceptLabel(e.target.value)}
                  placeholder="Cooperativa"
                  className="input-glass text-white placeholder:text-white/60"
                />
              </div>
              <Button
                type="button"
                disabled
                className="bg-brand-600 hover:bg-brand-500 text-white opacity-60 cursor-not-allowed"
              >
                Se crea al mapear
              </Button>
            </div>
            <div className="text-xs text-gray-300 mt-2">
              Nota: el concepto se crea automáticamente la primera vez que lo uses en un mapeo. Los cambios en el
              desplegable se guardan al salir del campo.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-2 text-white/80 font-medium">Deducción</th>
                  <th className="text-left py-3 px-2 text-white/80 font-medium">Field key</th>
                  <th className="text-left py-3 px-2 text-white/80 font-medium">Concepto derivado</th>
                  <th className="text-right py-3 px-2 text-white/80 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {deductions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-white/70">
                      No hay deducciones custom configuradas para mapear.
                    </td>
                  </tr>
                )}
                {deductions.map((d) => {
                  const current = mappingByField.get(d.field_key)
                  const isSaving = savingKey === d.field_key
                  return (
                    <tr key={d.field_key} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-2 px-2 text-white/90">{d.label}</td>
                      <td className="py-2 px-2 text-white/70 font-mono">{d.field_key}</td>
                      <td className="py-2 px-2 min-w-[240px]">
                        <select
                          key={`${d.field_key}-${current?.concept_code || ''}`}
                          defaultValue={current?.concept_code || ''}
                          onBlur={(e) => {
                            if (skipBlurSaveRef.current) {
                              skipBlurSaveRef.current = false
                              return
                            }
                            void saveMapping(d.field_key, e.target.value || null)
                          }}
                          disabled={isSaving}
                          className="w-full rounded-md bg-white/5 border border-white/20 text-white text-sm px-3 py-2 disabled:opacity-60"
                        >
                          <option value="" className="bg-gray-900 text-gray-300">
                            (Sin mapear)
                          </option>
                          {conceptOptions.map((c) => (
                            <option key={c.code} value={c.code} className="bg-gray-900">
                              {c.label} ({c.code})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onMouseDown={() => {
                            skipBlurSaveRef.current = true
                          }}
                          onClick={() => void saveMapping(d.field_key, null)}
                          disabled={isSaving || !current?.concept_code}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <Link2Off className="h-4 w-4 mr-1" />
                          Quitar
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
