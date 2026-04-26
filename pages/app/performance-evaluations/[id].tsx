import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { computeOverallScore } from '../../../lib/performance/score'
import { parsePerformanceSettings } from '../../../lib/performance/settings'

type Rating = 'no_cumple' | 'cumple' | 'supera'

interface PerfItem {
  id: string
  function: string
  indicator: string
  weight: number
  rating?: Rating
  comment: string
}

interface EvaluationRow {
  id: string
  employee_id: string
  cycle_start: string
  cycle_end: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  items: PerfItem[]
  overall_score: number | null
}

const RATING_LABELS: Record<Rating, string> = {
  no_cumple: 'No cumple',
  cumple: 'Cumple',
  supera: 'Supera',
}

export default function PerformanceEvaluationEditor() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const [evaluation, setEvaluation] = useState<EvaluationRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState(() => parsePerformanceSettings({}))

  const isFrozen = evaluation?.status === 'completed' || evaluation?.status === 'archived'

  const scoreLive = useMemo(() => {
    if (!evaluation) return null
    return computeOverallScore(evaluation.items, { superaMultiplier: settings.performance_supera_multiplier })
  }, [evaluation, settings.performance_supera_multiplier])

  const loadSettings = useCallback(async () => {
    try {
      const supabaseMetaRes = await fetch('/api/company-metadata/employees')
      if (!supabaseMetaRes.ok) return
      const data = await supabaseMetaRes.json()
      setSettings(parsePerformanceSettings(data?.employees_metadata || {}))
    } catch {
      setSettings(parsePerformanceSettings({}))
    }
  }, [])

  const fetchEvaluation = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/performance-evaluations/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la evaluación')
      setEvaluation(data.evaluation)
    } catch (err: any) {
      setError(err?.message || 'Error cargando evaluación')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchEvaluation()
  }, [fetchEvaluation])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateItem = (itemId: string, patch: Partial<PerfItem>) => {
    setEvaluation((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      }
    })
  }

  const validateBeforeComplete = () => {
    if (!evaluation) return null
    if (settings.performance_require_all_rated_to_complete) {
      const missing = evaluation.items.filter((it) => !it.rating)
      if (missing.length > 0) return 'No se puede finalizar: hay criterios sin calificación.'
    }
    if (settings.performance_require_comment_on_no_cumple) {
      const bad = evaluation.items.filter((it) => it.rating === 'no_cumple' && !it.comment.trim())
      if (bad.length > 0) {
        return 'No se puede finalizar: se requiere comentario cuando la calificación es “No cumple”.'
      }
    }
    return null
  }

  const normalizeWeights = () => {
    if (!evaluation) return
    const items = evaluation.items.map((it) => ({ ...it, weight: Number.isFinite(it.weight) ? Math.max(0, it.weight) : 0 }))
    const sum = items.reduce((s, it) => s + it.weight, 0)
    const next =
      sum > 0
        ? items.map((it) => ({ ...it, weight: Math.round((it.weight / sum) * 1000) / 10 })) // one decimal
        : items.map((it) => ({ ...it, weight: Math.round((100 / items.length) * 10) / 10 }))
    setEvaluation({ ...evaluation, items: next })
  }

  const setEqualWeights = () => {
    if (!evaluation) return
    const w = Math.round((100 / evaluation.items.length) * 10) / 10
    setEvaluation({ ...evaluation, items: evaluation.items.map((it) => ({ ...it, weight: w })) })
  }

  const save = async (status?: EvaluationRow['status']) => {
    if (!evaluation) return
    try {
      setSaving(true)
      setError(null)
      setMessage(null)
      if (status === 'completed') {
        const msg = validateBeforeComplete()
        if (msg) {
          setError(msg)
          return
        }
      }
      const res = await fetch(`/api/performance-evaluations/${evaluation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status ?? evaluation.status,
          items: evaluation.items,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar')
      setEvaluation(data.evaluation)
      setMessage('Guardado')
    } catch (err: any) {
      setError(err?.message || 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!evaluation) return
    await save('archived')
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Evaluación</h1>
              {evaluation && (
                <p className="mt-1 text-sm text-gray-300">
                  {evaluation.cycle_start} → {evaluation.cycle_end} · {evaluation.status}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push('/app/performance-evaluations')}>
                Volver
              </Button>
              {evaluation && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => save(evaluation.status === 'draft' ? 'in_progress' : evaluation.status)}
                    disabled={saving || isFrozen}
                  >
                    Guardar
                  </Button>
                  <Button onClick={() => save('completed')} disabled={saving || isFrozen}>
                    Finalizar
                  </Button>
                  <Button variant="destructive" onClick={archive} disabled={saving || evaluation.status !== 'completed'}>
                    Archivar
                  </Button>
                </>
              )}
            </div>
          </div>

          {(error || message) && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                error
                  ? 'border-red-500/40 bg-red-500/10 text-red-200'
                  : 'border-brand-400/40 bg-brand-500/10 text-brand-100'
              }`}
            >
              {error || message}
            </div>
          )}

          {loading ? (
            <div className="text-gray-300">Cargando…</div>
          ) : !evaluation ? (
            <div className="text-gray-300">No se encontró la evaluación.</div>
          ) : (
            <div className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-white">Score</CardTitle>
                  <CardDescription className="text-gray-300">
                    Score en vivo (normaliza pesos automáticamente).
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-white">
                  <div className="text-3xl font-bold">{scoreLive == null ? '—' : scoreLive.toFixed(3)}</div>
                  <div className="mt-2 text-xs text-gray-300">
                    Nota: “Supera” puntúa más que “Cumple”; “No cumple” es 0.
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-white">Criterios</CardTitle>
                      <CardDescription className="text-gray-300">
                        Califica cada función/KR usando 3 niveles + comentario.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={setEqualWeights} disabled={isFrozen}>
                        Pesos iguales
                      </Button>
                      <Button variant="outline" size="sm" onClick={normalizeWeights} disabled={isFrozen}>
                        Normalizar a 100
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-auto rounded-lg border border-white/10">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/5 text-gray-200">
                        <tr>
                          <th className="p-3 text-left font-medium">Función</th>
                          <th className="p-3 text-left font-medium">KR</th>
                          <th className="p-3 text-left font-medium">Peso</th>
                          <th className="p-3 text-left font-medium">Rating</th>
                          <th className="p-3 text-left font-medium">Comentario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-gray-100">
                        {evaluation.items.map((it) => (
                          <tr key={it.id} className="align-top hover:bg-white/5">
                            <td className="p-3 min-w-[280px]">
                              <Textarea
                                value={it.function}
                                onChange={(e) => updateItem(it.id, { function: e.target.value })}
                                className="border-white/20 bg-white/10 text-white"
                                disabled={isFrozen}
                              />
                            </td>
                            <td className="p-3 min-w-[220px]">
                              <Textarea
                                value={it.indicator}
                                onChange={(e) => updateItem(it.id, { indicator: e.target.value })}
                                className="border-white/20 bg-white/10 text-white"
                                disabled={isFrozen}
                              />
                            </td>
                            <td className="p-3 w-[120px]">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={Number.isFinite(it.weight) ? it.weight : 0}
                                onChange={(e) => updateItem(it.id, { weight: Number(e.target.value) })}
                                className="border-white/20 bg-white/10 text-white"
                                disabled={isFrozen}
                              />
                            </td>
                            <td className="p-3 w-[160px]">
                              <Select
                                value={it.rating ?? ''}
                                onValueChange={(v) => updateItem(it.id, { rating: v as Rating })}
                                disabled={isFrozen}
                              >
                                <SelectTrigger className="border-white/20 bg-white/10 text-white">
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(['no_cumple', 'cumple', 'supera'] as Rating[]).map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {RATING_LABELS[r]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3 min-w-[260px]">
                              <Textarea
                                value={it.comment}
                                onChange={(e) => updateItem(it.id, { comment: e.target.value })}
                                className="border-white/20 bg-white/10 text-white"
                                disabled={isFrozen}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {isFrozen && (
                    <div className="text-xs text-gray-300">
                      Esta evaluación está {evaluation.status}. Para modificarla, crea una nueva evaluación en otro ciclo.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

