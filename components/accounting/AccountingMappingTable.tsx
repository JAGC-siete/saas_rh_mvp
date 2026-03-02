import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import { AccountSelector, type AccountOption } from './AccountSelector'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Loader2 } from 'lucide-react'

interface MappingRow {
  id: string
  concept_code: string
  concept_name: string
  cost_center_type: string | null
  debit_account_id: string | null
  credit_account_id: string | null
  debit_account?: { id: string; code: string; name: string } | null
  credit_account?: { id: string; code: string; name: string } | null
  is_provision_payment: boolean
}

interface AccountingMappingTableProps {
  companyId: string | null
  onSeedSuccess?: () => void
}

const COST_CENTER_LABELS: Record<string, string> = {
  ventas: 'Ventas',
  administracion: 'Administración',
  produccion: 'Producción'
}

export function AccountingMappingTable({
  companyId,
  onSeedSuccess
}: AccountingMappingTableProps) {
  const [mappings, setMappings] = useState<MappingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const fetchMappings = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/accounting/mappings?company_id=${companyId}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const { mappings: data } = await res.json()
        setMappings(data ?? [])
      } else {
        setMappings([])
      }
    } catch {
      setMappings([])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchMappings()
  }, [fetchMappings])

  const handleSeed = async () => {
    if (!companyId) return
    setSeeding(true)
    try {
      const res = await fetch('/api/accounting/seed-company-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await fetchMappings()
        onSeedSuccess?.()
      } else {
        alert(data.error || 'Error inicializando catálogo')
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setSeeding(false)
    }
  }

  const handleAccountChange = async (
    mappingId: string,
    field: 'debit' | 'credit',
    accountId: string | null
  ) => {
    setSaving(mappingId)
    try {
      const body =
        field === 'debit'
          ? { debit_account_id: accountId }
          : { credit_account_id: accountId }
      const res = await fetch(`/api/accounting/mappings/${mappingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      })
      if (res.ok) {
        await fetchMappings()
      } else {
        const err = await res.json()
        alert(err.error || 'Error guardando')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setSaving(null)
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
    <Card className="backdrop-blur-md bg-white/10 border border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Mapeo Contable</CardTitle>
          <CardDescription className="text-white/70">
            Vincule conceptos de nómina con las cuentas del catálogo NIIF
          </CardDescription>
        </div>
        <Button
          onClick={handleSeed}
          disabled={seeding || !companyId}
          className="bg-brand-600 hover:bg-brand-500 text-white"
        >
          {seeding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inicializando...
            </>
          ) : (
            'Inicializar Catálogo'
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {mappings.length === 0 ? (
          <div className="rounded-lg border border-white/20 bg-white/5 p-8 text-center">
            <p className="text-white/80 mb-4">
              No hay mapeos configurados. Haga clic en &quot;Inicializar Catálogo&quot; para
              cargar el catálogo NIIF por defecto y los mapeos para Honduras.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-2 text-white/80 font-medium">
                    Concepto
                  </th>
                  <th className="text-left py-3 px-2 text-white/80 font-medium">
                    Centro de Costo
                  </th>
                  <th className="text-left py-3 px-2 text-white/80 font-medium">
                    Cuenta Debe
                  </th>
                  <th className="text-left py-3 px-2 text-white/80 font-medium">
                    Cuenta Haber
                  </th>
                  <th className="text-left py-3 px-2 text-white/80 font-medium">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <td className="py-2 px-2 text-white/90">
                      {m.concept_name}
                    </td>
                    <td className="py-2 px-2 text-white/70">
                      {m.cost_center_type
                        ? COST_CENTER_LABELS[m.cost_center_type] ??
                          m.cost_center_type
                        : '—'}
                    </td>
                    <td className="py-2 px-2 min-w-[200px]">
                      <AccountSelector
                        value={m.debit_account_id}
                        onChange={(id) =>
                          handleAccountChange(m.id, 'debit', id)
                        }
                        companyId={companyId}
                        placeholder="Seleccionar cuenta..."
                        disabled={saving === m.id}
                        displayValue={
                          m.debit_account
                            ? `${m.debit_account.code} - ${m.debit_account.name}`
                            : undefined
                        }
                      />
                    </td>
                    <td className="py-2 px-2 min-w-[200px]">
                      <AccountSelector
                        value={m.credit_account_id}
                        onChange={(id) =>
                          handleAccountChange(m.id, 'credit', id)
                        }
                        companyId={companyId}
                        placeholder="Seleccionar cuenta..."
                        disabled={saving === m.id}
                        displayValue={
                          m.credit_account
                            ? `${m.credit_account.code} - ${m.credit_account.name}`
                            : undefined
                        }
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Badge
                        variant="outline"
                        className={
                          m.is_provision_payment
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-white/10 text-white/80 border-white/20'
                        }
                      >
                        {m.is_provision_payment ? 'Pago Provisión' : 'Fijo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
