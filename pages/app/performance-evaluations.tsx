import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { ClipboardCheck, Plus } from 'lucide-react'

interface EmployeeRow {
  id: string
  name: string
  role?: string | null
  position?: string | null
  departments?: { name?: string | null } | null
}

interface EvaluationRow {
  id: string
  employee_id: string
  cycle_start: string
  cycle_end: string
  status: string
  overall_score: number | null
  updated_at: string
}

interface MtpDraftRow {
  id: string
  title: string
  role_name: string
  version: number
  updated_at: string
}

const CyclePicker = dynamic(() => import('../../components/performance/CyclePicker').then((m) => m.CyclePicker), {
  ssr: false,
})

export default function PerformanceEvaluationsPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [cycleStart, setCycleStart] = useState<string>('')
  const [cycleEnd, setCycleEnd] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [mtpDraftId, setMtpDraftId] = useState<string>('')
  const [mtpDrafts, setMtpDrafts] = useState<MtpDraftRow[]>([])
  const [mtpLoading, setMtpLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [empRes, evalRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/performance-evaluations'),
      ])
      if (!empRes.ok) throw new Error('No se pudieron cargar empleados')
      if (!evalRes.ok) throw new Error('No se pudieron cargar evaluaciones')
      const empData = await empRes.json()
      const evalData = await evalRes.json()
      setEmployees(empData.employees ?? [])
      setEvaluations(evalData.evaluations ?? [])
    } catch (err: any) {
      setError(err?.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMtpDrafts = useCallback(async () => {
    try {
      setMtpLoading(true)
      const res = await fetch('/api/mtp/drafts')
      if (!res.ok) return
      const data = await res.json()
      setMtpDrafts(data.drafts ?? [])
    } finally {
      setMtpLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchMtpDrafts()
  }, [fetchMtpDrafts])

  const evaluationByEmployee = useMemo(() => {
    const map = new Map<string, EvaluationRow>()
    for (const ev of evaluations) {
      const prev = map.get(ev.employee_id)
      if (!prev || new Date(ev.updated_at).getTime() > new Date(prev.updated_at).getTime()) {
        map.set(ev.employee_id, ev)
      }
    }
    return map
  }, [evaluations])

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => (e.name || '').toLowerCase().includes(q))
  }, [employees, query])

  const createEvaluation = async () => {
    if (!selectedEmployeeId || !cycleStart || !cycleEnd) {
      setError('Seleccione empleado y ciclo')
      return
    }

    try {
      setCreating(true)
      setError(null)
      const res = await fetch('/api/performance-evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          mtp_draft_id: mtpDraftId ? mtpDraftId : null,
          cycle_start: cycleStart,
          cycle_end: cycleEnd,
          status: 'draft',
          items: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear la evaluación')
      const id = data.evaluation?.id
      if (id) {
        await router.push(`/app/performance-evaluations/${id}`)
      } else {
        throw new Error('Respuesta inválida del servidor')
      }
    } catch (err: any) {
      setError(err?.message || 'Error creando evaluación')
    } finally {
      setCreating(false)
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-brand-500/20 p-2.5">
                <ClipboardCheck className="h-7 w-7 text-brand-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Evaluaciones de desempeño</h1>
                <p className="mt-1 text-gray-300">
                  Califica funciones y KR por empleado en ciclos definidos.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-white">Nueva evaluación</CardTitle>
                <CardDescription className="text-gray-300">
                  Selecciona empleado y ciclo; opcionalmente vincula un borrador MTP.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-200">Empleado</label>
                  <Select value={selectedEmployeeId ?? ''} onValueChange={(v) => setSelectedEmployeeId(v)}>
                    <SelectTrigger className="border-white/20 bg-white/10 text-white">
                      <SelectValue placeholder="Selecciona empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-200">Ciclo</label>
                  <CyclePicker
                    valueStart={cycleStart}
                    valueEnd={cycleEnd}
                    onChangeStart={setCycleStart}
                    onChangeEnd={setCycleEnd}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-200">
                    Perfil MTP (opcional)
                  </label>
                  <Select value={mtpDraftId} onValueChange={setMtpDraftId}>
                    <SelectTrigger className="border-white/20 bg-white/10 text-white">
                      <SelectValue placeholder={mtpLoading ? 'Cargando…' : 'Selecciona un borrador MTP'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">(Sin MTP)</SelectItem>
                      {mtpDrafts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title} · {d.role_name} · v{d.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-1 text-xs text-gray-400">
                    Esto precarga las funciones/KR del MTP en la evaluación.
                  </div>
                </div>

                <Button onClick={createEvaluation} disabled={creating}>
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? 'Creando…' : 'Crear evaluación'}
                </Button>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-white">Empleados</CardTitle>
                <CardDescription className="text-gray-300">
                  Última evaluación por empleado (si existe).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-md">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar empleado…"
                    className="border-white/20 bg-white/10 text-white"
                  />
                </div>

                {loading ? (
                  <div className="text-gray-300">Cargando…</div>
                ) : (
                  <div className="overflow-auto rounded-lg border border-white/10">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/5 text-gray-200">
                        <tr>
                          <th className="p-3 text-left font-medium">Empleado</th>
                          <th className="p-3 text-left font-medium">Rol/Depto</th>
                          <th className="p-3 text-left font-medium">Última evaluación</th>
                          <th className="p-3 text-left font-medium">Score</th>
                          <th className="p-3 text-left font-medium">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-gray-100">
                        {filteredEmployees.map((e) => {
                          const ev = evaluationByEmployee.get(e.id)
                          return (
                            <tr key={e.id} className="hover:bg-white/5">
                              <td className="p-3">
                                <div className="font-medium text-white">{e.name}</div>
                              </td>
                              <td className="p-3 text-gray-200">
                                <div>{e.position || e.role || '—'}</div>
                                <div className="text-xs text-gray-400">{e.departments?.name || '—'}</div>
                              </td>
                              <td className="p-3 text-gray-200">
                                {ev ? (
                                  <div className="text-xs">
                                    {ev.cycle_start} → {ev.cycle_end} · {ev.status}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">Sin evaluación</div>
                                )}
                              </td>
                              <td className="p-3 text-gray-200">
                                {ev?.overall_score != null ? ev.overall_score.toFixed(3) : '—'}
                              </td>
                              <td className="p-3">
                                {ev ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.push(`/app/performance-evaluations/${ev.id}`)}
                                  >
                                    Abrir
                                  </Button>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

