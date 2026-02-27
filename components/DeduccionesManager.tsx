'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useCompanyContext } from '../lib/useCompanyContext'
import { useToast } from '../lib/toast'
import { Loader2, Download } from 'lucide-react'

interface DeductionType {
  key: string
  label: string
}

interface Employee {
  id: string
  name: string
  employee_code?: string
  dni?: string
}

interface DeductionPlan {
  id: string
  employee_id: string
  field_key: string
  monto_total: number
  plazos_totales: number
  plazos_aplicados: number
  monto_por_plazo?: number
  fecha_inicio: string
  fecha_fin: string | null
  activo: boolean
  plazos_restantes?: number
  monto_pendiente?: number
  employee_name?: string
  employee_dni?: string
  employee_code?: string
}

const formatCurrency = (n: number) =>
  `L. ${Number(n).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('es-HN') : '-'
const formatFieldKey = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export default function DeduccionesManager() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyContext()
  const toast = useToast()

  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [plans, setPlans] = useState<DeductionPlan[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const [form, setForm] = useState({
    field_key: '',
    employee_id: '',
    monto_total: '',
    plazos_totales: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: ''
  })

  const fetchDeductionTypes = useCallback(async () => {
    if (!companyId) return
    try {
      setLoadingTypes(true)
      const res = await fetch(
        `/api/payroll/deduction-types?company_id=${encodeURIComponent(companyId)}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const data = await res.json()
        setDeductionTypes(data.deduction_types || [])
      }
    } catch {
      setDeductionTypes([])
    } finally {
      setLoadingTypes(false)
    }
  }, [companyId])

  const fetchEmployees = useCallback(async () => {
    if (!companyId) return
    try {
      setLoadingEmployees(true)
      const res = await fetch(
        '/api/employees/search?limit=200&status=active',
        { credentials: 'include' }
      )
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees || [])
      }
    } catch {
      setEmployees([])
    } finally {
      setLoadingEmployees(false)
    }
  }, [companyId])

  const fetchPlans = useCallback(async () => {
    if (!companyId) return
    try {
      setLoadingPlans(true)
      const res = await fetch(
        `/api/payroll/deduction-plans?company_id=${encodeURIComponent(companyId)}&include_inactive=true`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans || [])
      }
    } catch {
      setPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchDeductionTypes()
    fetchEmployees()
    fetchPlans()
  }, [fetchDeductionTypes, fetchEmployees, fetchPlans])

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    const monto = parseFloat(form.monto_total)
    const plazos = parseInt(form.plazos_totales, 10)
    if (!form.field_key || !form.employee_id || isNaN(monto) || monto <= 0 || isNaN(plazos) || plazos <= 0) {
      toast.error('Campos requeridos', 'Complete todos los campos requeridos (deducción, empleado, monto y plazos)')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        company_id: companyId,
        employee_id: form.employee_id,
        field_key: form.field_key,
        monto_total: monto,
        plazos_totales: plazos,
        fecha_inicio: form.fecha_inicio || undefined
      }
      if (form.fecha_fin) body.fecha_fin = form.fecha_fin

      const res = await fetch('/api/payroll/deduction-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error('Error', data.message || data.error || 'Error al crear el plan')
        return
      }

      toast.success('Éxito', 'Plan de deducción creado correctamente')
      setForm({
        field_key: '',
        employee_id: '',
        monto_total: '',
        plazos_totales: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: ''
      })
      fetchPlans()
    } catch {
      toast.error('Error', 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelPlan = async (planId: string) => {
    if (!companyId) return
    if (!confirm('¿Cancelar este plan de deducción?')) return

    try {
      const res = await fetch('/api/payroll/deduction-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan_id: planId })
      })
      if (res.ok) {
        toast.success('Éxito', 'Plan cancelado')
        fetchPlans()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error('Error', data.error || 'Error al cancelar')
      }
    } catch {
      toast.error('Error', 'Error de conexión')
    }
  }

  const handleExportPDF = async () => {
    if (!companyId) return
    setExportingPdf(true)
    try {
      const res = await fetch(
        `/api/payroll/deduction-plans-export-pdf?company_id=${encodeURIComponent(companyId)}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error('Error', data.error || data.message || 'No se pudo generar el PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte_deducciones_${new Date().toISOString().split('T')[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Éxito', 'PDF descargado correctamente')
    } catch {
      toast.error('Error', 'Error de conexión')
    } finally {
      setExportingPdf(false)
    }
  }

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    )
  }

  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <Card className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="pt-6">
            <p className="text-red-400">
              {companyError || 'No se pudo cargar el contexto de la empresa.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Deducciones</h1>
        <p className="text-gray-300">
          Asignar deducciones a empleados con seguimiento de plazos
        </p>
      </div>

      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-xl font-semibold">Nuevo plan de deducción</CardTitle>
          <CardDescription className="text-gray-200 text-base">
            Seleccione la deducción, el empleado, el monto total y el número de plazos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Tipo de deducción
              </label>
              <Select
                value={form.field_key}
                onValueChange={(v) => handleFormChange('field_key', v)}
                disabled={loadingTypes}
              >
                <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10 text-white data-[placeholder]:text-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 hover:bg-white/15">
                  <SelectValue placeholder="Seleccionar deducción" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                  {deductionTypes.map((t) => (
                    <SelectItem
                      key={t.key}
                      value={t.key}
                      className="text-white hover:bg-white/20 focus:bg-white/20"
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Empleado
              </label>
              <Select
                value={form.employee_id}
                onValueChange={(v) => handleFormChange('employee_id', v)}
                disabled={loadingEmployees}
              >
                <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10 text-white data-[placeholder]:text-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 hover:bg-white/15">
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20 max-h-[240px]">
                  {employees.map((e) => (
                    <SelectItem
                      key={e.id}
                      value={e.id}
                      className="text-white hover:bg-white/20 focus:bg-white/20"
                    >
                      {e.name} {e.employee_code ? `(${e.employee_code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Monto total (L.)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.monto_total}
                onChange={(e) => handleFormChange('monto_total', e.target.value)}
                placeholder="0.00"
                className="rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Número de plazos
              </label>
              <Input
                type="number"
                min="1"
                value={form.plazos_totales}
                onChange={(e) => handleFormChange('plazos_totales', e.target.value)}
                placeholder="Ej. 12"
                className="rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Fecha inicio
              </label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => handleFormChange('fecha_inicio', e.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Fecha fin (opcional)
              </label>
              <Input
                type="date"
                value={form.fecha_fin}
                onChange={(e) => handleFormChange('fecha_fin', e.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 text-white"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 xl:col-span-6 flex items-end">
              <Button
                type="submit"
                disabled={saving || !form.field_key || !form.employee_id || !form.monto_total || !form.plazos_totales}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-white text-xl font-semibold">
                Planes de deducción
              </CardTitle>
              <CardDescription className="text-gray-200 text-base">
                Por tipo de deducción, empleado, estado y plazos
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exportingPdf || plans.length === 0}
              className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 shrink-0"
            >
              {exportingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPlans ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : plans.length === 0 ? (
            <p className="text-gray-400 py-8 text-center">
              No hay planes de deducción. Cree uno con el formulario de arriba.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20 text-left text-gray-300 bg-white/5">
                    <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Tipo deducción</th>
                    <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Empleado</th>
                    <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Activa</th>
                    <th className="pb-3 pt-2 px-4 text-right font-semibold text-white/90">Monto total</th>
                    <th className="pb-3 pt-2 px-4 text-center font-semibold text-white/90">Cuotas total</th>
                    <th className="pb-3 pt-2 px-4 text-center font-semibold text-white/90">Cuotas aplicadas</th>
                    <th className="pb-3 pt-2 px-4 text-center font-semibold text-white/90">Cuotas restantes</th>
                    <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Inicio</th>
                    <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Fin</th>
                    <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-white">
                        {formatFieldKey(p.field_key)}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {p.employee_name || p.employee_dni || p.employee_code || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            p.activo
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {p.activo ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white">
                        {formatCurrency(p.monto_total)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {p.plazos_totales}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {p.plazos_aplicados ?? 0}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-300 font-medium">
                        {p.plazos_restantes ?? (p.plazos_totales - (p.plazos_aplicados ?? 0))}
                      </td>
                      <td className="py-3 px-4 text-gray-400">{formatDate(p.fecha_inicio)}</td>
                      <td className="py-3 px-4 text-gray-400">{formatDate(p.fecha_fin)}</td>
                      <td className="py-3 px-4">
                        {p.activo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            onClick={() => handleCancelPlan(p.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
