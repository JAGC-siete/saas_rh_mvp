import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, Link2Off } from 'lucide-react'

type DeductionField = { field_key: string; label: string }
type Concept = { id: string; code: string; label: string; has_employer_contrib: boolean; active: boolean }
type Mapping = { id: string; field_key: string; concept_code: string | null; concept_label: string | null }

export function PayrollDerivedConceptsTab() {
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [deductions, setDeductions] = useState<DeductionField[]>([])
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [mappings, setMappings] = useState<Mapping[]>([])

  const [newConceptCode, setNewConceptCode] = useState('')
  const [newConceptLabel, setNewConceptLabel] = useState('')

  const mappingByField = useMemo(() => {
    const m = new Map<string, Mapping>()
    for (const row of mappings) m.set(row.field_key, row)
    return m
  }, [mappings])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/accounting/payroll-derived-mappings', { credentials: 'include' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'No se pudo cargar mapeos')
      setDeductions(j.deductions || [])
      setConcepts(j.concepts || [])
      setMappings(j.mappings || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const conceptOptions = useMemo(() => {
    const base = [
      { code: 'IHSS', label: 'IHSS' },
      { code: 'RAP', label: 'RAP' },
      { code: 'INFOP', label: 'INFOP' }
    ]
    const extra = (concepts || []).map((c) => ({ code: c.code, label: c.label }))
    const seen = new Set<string>()
    const merged = [...base, ...extra].filter((c) => {
      const k = c.code.toUpperCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    merged.sort((a, b) => a.label.localeCompare(b.label))
    return merged
  }, [concepts])

  const saveMapping = async (fieldKey: string, conceptCode: string | null) => {
    setSavingKey(fieldKey)
    setError(null)
    try {
      const res = await fetch('/api/accounting/payroll-derived-mappings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_key: fieldKey,
          concept_code: conceptCode,
          concept_label:
            conceptCode && conceptCode.toUpperCase() === newConceptCode.trim().toUpperCase()
              ? newConceptLabel
              : undefined
        })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'No se pudo guardar')
      await loadAll()
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
            Mapea deducciones personalizadas (custom fields) a un concepto derivado para que aparezcan agrupadas en reportes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200 text-sm">
              {error}
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
              Nota: el concepto se crea automáticamente la primera vez que lo uses en un mapeo.
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
                          value={current?.concept_code || ''}
                          onChange={(e) => void saveMapping(d.field_key, e.target.value || null)}
                          disabled={isSaving}
                          className="w-full rounded-md bg-white/5 border border-white/20 text-white text-sm px-3 py-2"
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

