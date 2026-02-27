import React, { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { formatCurrency } from '../lib/utils/currency'
import { HONDURAS_LABOR_FACTOR } from '../lib/payroll/constants'
import { evaluateFormulaSafe } from '../lib/utils/formula-evaluator'
import { Plus, Calendar } from 'lucide-react'

interface CustomPayrollFieldsFormProps {
  companyId: string
  runLineId: string
  employeeId?: string
  currentMetadata?: Record<string, unknown> | null
  baseSalary: number
  onSave: (metadata: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}

interface DeductionPlan {
  id: string
  field_key: string
  monto_total: number
  plazos_totales: number
  plazos_aplicados: number
  monto_por_plazo: number
  activo: boolean
}

function renderFieldInput(
  fieldName: string,
  fieldDef: any,
  formData: Record<string, unknown>,
  handleInputChange: (k: string, v: string | number) => void,
  customFields: Record<string, string>,
  isEarnings: boolean,
  baseSalaryProp: number
) {
  const label = customFields[fieldName] || fieldDef?.label || fieldName
  const hasFormula = fieldDef?.formula && typeof fieldDef.formula === 'string'
  const parameters = fieldDef?.parameters || []

  if (hasFormula && parameters.length > 0) {
    const metadata = Object.fromEntries(
        parameters.map((p: { key: string; default?: number | string }) => [
          p.key,
          formData[p.key] !== undefined && formData[p.key] !== null && formData[p.key] !== ''
            ? (typeof formData[p.key] === 'number' ? formData[p.key] : parseFloat(String(formData[p.key])) || 0)
            : (typeof p.default === 'number' ? p.default : parseFloat(String(p.default)) || 0)
        ])
      ) as Record<string, number | string | boolean>
    const result = evaluateFormulaSafe(fieldDef.formula, { baseSalary: baseSalaryProp, metadata })

    return (
      <div key={fieldName} className="space-y-2">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {parameters.map((p: { key: string; label: string; type: string; default: number | string }) => (
            <div key={p.key}>
              <label className="block text-xs text-gray-400 mb-1">{p.label || p.key}</label>
              <input
                type={p.type === 'number' ? 'number' : 'text'}
                step="0.01"
                value={formData[p.key] !== undefined && formData[p.key] !== null ? String(formData[p.key]) : (p.default !== undefined ? String(p.default) : '')}
                onChange={(e) => handleInputChange(p.key, p.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/10 text-white placeholder-gray-400 text-sm"
                placeholder={p.type === 'number' ? '0' : ''}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Resultado:</span>
          <span className={`font-mono font-medium ${isEarnings ? 'text-green-300' : 'text-red-300'}`}>
            {formatCurrency(result)}
          </span>
          <span className="text-gray-500 text-xs">(solo lectura)</span>
        </div>
      </div>
    )
  }

  return (
    <div key={fieldName}>
      <label className="block text-sm font-medium text-white mb-2">{label}</label>
      <input
        type="number"
        step="0.01"
        value={formData[fieldName] !== undefined && formData[fieldName] !== null ? String(formData[fieldName]) : ''}
        onChange={(e) => handleInputChange(fieldName, e.target.value)}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 ${
          isEarnings ? 'border-white/20 focus:ring-green-400 focus:border-green-400' : 'border-white/20 focus:ring-red-400 focus:border-red-400'
        }`}
        placeholder="0.00"
      />
    </div>
  )
}

export default function CustomPayrollFieldsForm({
  companyId,
  runLineId,
  employeeId,
  currentMetadata = {},
  baseSalary,
  onSave,
  onCancel
}: CustomPayrollFieldsFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [customFields, setCustomFields] = useState<Record<string, string> | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [payrollDefaults, setPayrollDefaults] = useState<Record<string, number>>({})
  const [deductionPlans, setDeductionPlans] = useState<DeductionPlan[]>([])
  const [createPlanModal, setCreatePlanModal] = useState<{ fieldKey: string; montoTotal: string; plazosTotales: string } | null>(null)

  const handleInputChange = useCallback((fieldName: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }, [])

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/api/payroll/config')
        if (response.ok) {
          const data = await response.json()
          if (data.config) {
            setConfig(data.config)
            const fields: Record<string, string> = {}
            if (data.config.custom_fields) {
              for (const [fieldName, fieldDef] of Object.entries(data.config.custom_fields)) {
                const def = fieldDef as any
                fields[fieldName] = typeof def === 'string' ? def : (def.label || fieldName)
              }
            }
            setCustomFields(fields)
          }
        }
      } catch (error) {
        console.error('Error loading payroll config:', error)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [companyId])

  useEffect(() => {
    async function loadEmployeeData() {
      if (!employeeId || !companyId) return
      try {
        const [empRes, plansRes] = await Promise.all([
          fetch(`/api/employees/search?employee_id=${employeeId}&limit=1`),
          fetch(`/api/payroll/deduction-plans?employee_id=${employeeId}&company_id=${companyId}`)
        ])
        if (empRes.ok) {
          const empData = await empRes.json()
          const emp = empData.employees?.[0]
          const defaults = emp?.metadata?.payroll_defaults
          if (defaults && typeof defaults === 'object') {
            const parsed: Record<string, number> = {}
            for (const [k, v] of Object.entries(defaults)) {
              const n = typeof v === 'number' ? v : parseFloat(String(v))
              if (!isNaN(n)) parsed[k] = n
            }
            setPayrollDefaults(parsed)
          }
        }
        if (plansRes.ok) {
          const plansData = await plansRes.json()
          const plans = plansData.plans || []
          setDeductionPlans(plans)
          if (plans.length > 0 && (!currentMetadata || Object.keys(currentMetadata).length === 0)) {
            setFormData((prev) => {
              const next = { ...prev }
              const planIds: string[] = [...((prev._deduction_plan_ids as string[]) || [])]
              for (const p of plans) {
                if (p.activo && p.plazos_aplicados < p.plazos_totales && (prev[p.field_key] === undefined || prev[p.field_key] === '' || prev[p.field_key] === null)) {
                  next[p.field_key] = p.monto_por_plazo
                  if (!planIds.includes(p.id)) planIds.push(p.id)
                }
              }
              if (planIds.length > 0) next._deduction_plan_ids = planIds
              return next
            })
          }
        }
      } catch (error) {
        console.error('Error loading employee data:', error)
      }
    }
    loadEmployeeData()
  }, [employeeId, companyId])

  useEffect(() => {
    const hasCurrent = currentMetadata && Object.keys(currentMetadata).length > 0
    if (hasCurrent) {
      setFormData({ ...currentMetadata } as Record<string, unknown>)
    } else if (customFields) {
      const initial: Record<string, unknown> = {}
      for (const key of Object.keys(customFields)) {
        const defVal = payrollDefaults[key]
        initial[key] = defVal !== undefined ? defVal : (currentMetadata?.[key] ?? '')
      }
      if (Object.keys(payrollDefaults).length > 0) {
        setFormData((prev) => {
          const merged = { ...prev }
          for (const [k, v] of Object.entries(payrollDefaults)) {
            if (merged[k] === '' || merged[k] === undefined || merged[k] === null) {
              merged[k] = v
            }
          }
          return merged
        })
      } else {
        setFormData(initial)
      }
    }
  }, [currentMetadata, customFields, payrollDefaults])

  const getFieldValue = useCallback(
    (fieldName: string, fieldDef: any): number => {
      const hasFormula = fieldDef?.formula && fieldDef?.parameters?.length
      if (hasFormula) {
        const params = fieldDef.parameters as Array<{ key: string; default: number | string }>
        const metadata: Record<string, number | string | boolean> = {}
        for (const p of params) {
          const v = formData[p.key]
          metadata[p.key] =
            v !== undefined && v !== null && v !== ''
              ? (typeof v === 'number' ? v : parseFloat(String(v)) || 0)
              : (typeof p.default === 'number' ? p.default : parseFloat(String(p.default)) || 0)
        }
        return evaluateFormulaSafe(fieldDef.formula, { baseSalary, metadata })
      }
      const val = formData[fieldName]
      if (val === undefined || val === null || val === '') return 0
      return typeof val === 'number' ? val : parseFloat(String(val)) || 0
    },
    [formData, baseSalary]
  )

  const handleCreatePlan = async () => {
    if (!createPlanModal || !employeeId || !companyId) return
    const { fieldKey, montoTotal, plazosTotales } = createPlanModal
    const monto = parseFloat(montoTotal)
    const plazos = parseInt(plazosTotales, 10)
    if (isNaN(monto) || monto <= 0 || isNaN(plazos) || plazos <= 0) return
    try {
      const res = await fetch('/api/payroll/deduction-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          company_id: companyId,
          field_key: fieldKey,
          monto_total: monto,
          plazos_totales: plazos
        })
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.message || err.error || 'Error creando plan')
        return
      }
      const plan = await res.json()
      setDeductionPlans((prev) => [...prev, plan])
      setFormData((prev) => {
        const existing = (prev._deduction_plan_ids as string[]) || []
        return {
          ...prev,
          [fieldKey]: plan.monto_por_plazo,
          _deduction_plan_ids: [...existing, plan.id]
        }
      })
      setCreatePlanModal(null)
    } catch (e) {
      console.error(e)
      alert('Error creando plan')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const converted: Record<string, unknown> = {}
      const hourlyRate = (Number(baseSalary) || 0) / HONDURAS_LABOR_FACTOR
      const planIds = new Set<string>((formData._deduction_plan_ids as string[]) || [])

      for (const key in formData) {
        if (key === '_deduction_plan_ids') continue
        const value = formData[key]
        if (value === '' || value === null || value === undefined) {
          converted[key] = 0
        } else {
          converted[key] = typeof value === 'string' ? parseFloat(value) || 0 : value
        }
      }

      for (const plan of deductionPlans) {
        if (!plan.activo || plan.plazos_aplicados >= plan.plazos_totales) continue
        const fieldDef = config?.custom_fields?.[plan.field_key]
        if (!fieldDef?.track_plazos) continue
        const savedVal = Number(converted[plan.field_key]) || 0
        if (savedVal > 0 && Math.abs(savedVal - plan.monto_por_plazo) < 0.01) {
          planIds.add(plan.id)
        }
      }
      converted._deduction_plan_ids = Array.from(planIds)

      if (converted.horas_extras !== undefined && converted.horas_extras !== null) {
        const hours = Number(converted.horas_extras) || 0
        converted.horas_extras = Math.round(hours * hourlyRate * 100) / 100
      }
      if (converted.feriado_trabajado !== undefined && converted.feriado_trabajado !== null) {
        const days = Number(converted.feriado_trabajado) || 0
        converted.feriado_trabajado = Math.round(days * 8 * hourlyRate * 100) / 100
      }

      await onSave(converted)
    } catch (error) {
      console.error('Error saving custom fields:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">Cargando configuración...</p>
        </CardContent>
      </Card>
    )
  }

  if (!config || !customFields) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">No hay campos personalizados configurados para esta empresa</p>
        </CardContent>
      </Card>
    )
  }

  const earningsFields = Object.keys(customFields).filter((key) => {
    const fieldDef = config?.custom_fields?.[key]
    return typeof fieldDef === 'object' && fieldDef.category === 'earnings'
  })
  const deductionsFields = Object.keys(customFields).filter((key) => {
    const fieldDef = config?.custom_fields?.[key]
    return typeof fieldDef === 'object' && fieldDef.category === 'deductions'
  })

  const hourlyRate = (Number(baseSalary) || 0) / HONDURAS_LABOR_FACTOR
  const totalIngresos = earningsFields.reduce((sum, key) => {
    const fieldDef = config.custom_fields[key]
    let val = getFieldValue(key, fieldDef)
    if (key.includes('horas_extras')) val = val * hourlyRate
    if (key.includes('feriado')) val = val * 8 * hourlyRate
    return sum + val
  }, 0)
  const totalDeducciones = deductionsFields.reduce((sum, key) => {
    const fieldDef = config.custom_fields[key]
    const plan = deductionPlans.find((p) => p.field_key === key && p.activo)
    let val: number
    if (plan && plan.plazos_aplicados < plan.plazos_totales) {
      const override = formData[key]
      val = override !== undefined && override !== null && override !== '' ? (typeof override === 'number' ? override : parseFloat(String(override)) || 0) : plan.monto_por_plazo
    } else {
      val = getFieldValue(key, fieldDef)
    }
    return sum + val
  }, 0)

  return (
    <Card className="backdrop-blur-md bg-white/10 border border-white/20">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white text-xl font-bold">
          Campos Personalizados - {config?.companyName || 'Sin Configurar'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
              Ingresos Adicionales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {earningsFields.map((fieldName) =>
                renderFieldInput(fieldName, config.custom_fields[fieldName], formData, handleInputChange, customFields, true, baseSalary)
              )}
            </div>
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-white font-medium">Total Ingresos Adicionales:</span>
                <span className="text-green-300 font-bold">{formatCurrency(totalIngresos)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-400 mr-2"></span>
              Deducciones Adicionales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deductionsFields.map((fieldName) => {
                const fieldDef = config.custom_fields[fieldName]
                const plan = deductionPlans.find((p) => p.field_key === fieldName && p.activo)
                const hasTrackPlazos = fieldDef?.track_plazos === true

                return (
                  <div key={fieldName} className="space-y-2">
                    {renderFieldInput(fieldName, fieldDef, formData, handleInputChange, customFields, false, baseSalary)}
                    {hasTrackPlazos && (
                      <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
                        {plan ? (
                          <div className="text-sm text-gray-300">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {plan.plazos_aplicados}/{plan.plazos_totales} aplicadas, {plan.plazos_totales - plan.plazos_aplicados} restantes · {formatCurrency(plan.monto_por_plazo)}/plazo
                            </span>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => setCreatePlanModal({ fieldKey: fieldName, montoTotal: '', plazosTotales: '' })}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Crear plan
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-white font-medium">Total Deducciones Adicionales:</span>
                <span className="text-red-300 font-bold">{formatCurrency(totalDeducciones)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-white font-medium">Impacto Neto:</span>
              <span className={`font-bold ${totalIngresos - totalDeducciones >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {formatCurrency(totalIngresos - totalDeducciones)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <Button type="button" onClick={onCancel} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                'Guardar Campos Personalizados'
              )}
            </Button>
          </div>
        </form>
      </CardContent>

      {createPlanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full border border-white/20">
            <h4 className="text-white font-semibold mb-4">Crear plan de deducción</h4>
            <p className="text-gray-400 text-sm mb-4">{customFields[createPlanModal.fieldKey] || createPlanModal.fieldKey}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Monto total</label>
                <input
                  type="number"
                  step="0.01"
                  value={createPlanModal.montoTotal}
                  onChange={(e) => setCreatePlanModal((p) => (p ? { ...p, montoTotal: e.target.value } : null))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Plazos totales</label>
                <input
                  type="number"
                  min="1"
                  value={createPlanModal.plazosTotales}
                  onChange={(e) => setCreatePlanModal((p) => (p ? { ...p, plazosTotales: e.target.value } : null))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  placeholder="12"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setCreatePlanModal(null)} className="text-white border-white/30">
                Cancelar
              </Button>
              <Button onClick={handleCreatePlan} className="bg-blue-600 hover:bg-blue-700 text-white">
                Crear
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
