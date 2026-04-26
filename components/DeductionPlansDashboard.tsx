'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatDateOnlyForHonduras } from '../lib/timezone'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Icon } from './Icon'

interface DeductionPlan {
  id: string
  employee_id: string
  field_key: string
  monto_total: number
  plazos_totales: number
  plazos_aplicados: number
  monto_por_plazo: number
  fecha_inicio: string
  fecha_fin: string | null
  plazos_restantes?: number
  monto_pendiente?: number
  employee_name?: string
  employee_dni?: string
  employee_code?: string
}

interface DeductionPlansDashboardProps {
  companyId: string
  className?: string
}

export default function DeductionPlansDashboard({ companyId, className = '' }: DeductionPlansDashboardProps) {
  const [plans, setPlans] = useState<DeductionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (!companyId) return
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/payroll/deduction-plans?company_id=${encodeURIComponent(companyId)}`)
        if (!res.ok) throw new Error('Error cargando planes')
        const data = await res.json()
        setPlans(data.plans || [])
      } catch {
        setPlans([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [companyId])

  const formatCurrency = (n: number) => `L. ${Number(n).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
  const formatDate = (d: string | null) => d ? (/^\d{4}-\d{2}-\d{2}$/.test(d) ? formatDateOnlyForHonduras(d) : new Date(d).toLocaleDateString('es-HN')) : '-'

  const formatFieldKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  if (loading && plans.length === 0) {
    return (
      <Card className={`backdrop-blur-md bg-white/10 border border-white/20 ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse flex gap-4">
            <div className="h-4 bg-white/20 rounded w-1/3" />
            <div className="h-4 bg-white/20 rounded w-1/3" />
            <div className="h-4 bg-white/20 rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (plans.length === 0) return null

  return (
    <Card className={`backdrop-blur-md bg-white/10 border border-white/20 ${className}`}>
      <CardHeader
        className="cursor-pointer select-none py-6"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Icon name="chart" className="h-5 w-5 text-blue-300" />
            Planes de deducción activos ({plans.length})
          </CardTitle>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 pb-6">
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 text-left text-gray-300 bg-white/5">
                  <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Empleado</th>
                  <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Campo</th>
                  <th className="pb-3 pt-2 px-4 text-right font-semibold text-white/90">Monto total</th>
                  <th className="pb-3 pt-2 px-4 text-center font-semibold text-white/90">Plazos</th>
                  <th className="pb-3 pt-2 px-4 text-right font-semibold text-white/90">Pendiente</th>
                  <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Inicio</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-white">
                      {p.employee_name || p.employee_dni || p.employee_code || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{formatFieldKey(p.field_key)}</td>
                    <td className="py-3 px-4 text-right text-white">{formatCurrency(p.monto_total)}</td>
                    <td className="py-3 px-4 text-center text-gray-300">
                      {p.plazos_aplicados}/{p.plazos_totales}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-300 font-medium">
                      {formatCurrency(p.monto_pendiente ?? 0)}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{formatDate(p.fecha_inicio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
