import React, { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../lib/toast'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { JournalEntryTable } from './JournalEntryTable'
import { StatutoryTraceabilityPanel } from './StatutoryTraceabilityPanel'
import type { JournalStatutoryTraceBlock } from '../../lib/accounting/payroll-statutory-trace'
import { StatusBadge } from './StatusBadge'
import { CalculatorIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { Loader2 } from 'lucide-react'

interface PayrollAccountingTabProps {
  runId: string | undefined
  status: string | undefined
  companyId: string | undefined
  onGenerate: () => Promise<void>
}

export function PayrollAccountingTab({
  runId,
  status,
  companyId,
  onGenerate
}: PayrollAccountingTabProps) {
  const toast = useToast()
  const [entries, setEntries] = useState<any[]>([])
  const [statutoryTrace, setStatutoryTrace] =
    useState<JournalStatutoryTraceBlock | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const canGenerate =
    status === 'authorized' || status === 'distributed'
  const isDraft = status === 'draft' || status === 'edited'

  const fetchEntries = useCallback(async () => {
    if (!runId || !companyId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/accounting/journal-entries?payroll_run_id=${runId}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const { entries: data, statutory_trace: trace } = await res.json()
        setEntries(data ?? [])
        setStatutoryTrace(trace ?? null)
      } else {
        setEntries([])
        setStatutoryTrace(null)
      }
    } catch {
      setEntries([])
      setStatutoryTrace(null)
    } finally {
      setLoading(false)
    }
  }, [runId, companyId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleGenerate = async () => {
    if (!runId || !companyId) return
    setGenerating(true)
    try {
      await onGenerate()
      await fetchEntries()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error generando asientos'
      console.error('generate-journal-entries:', e)
      toast.error('Asientos contables', msg, 8000)
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = (format: 'csv' | 'json') => {
    if (entries.length === 0) return
    const ids = entries.map((e) => e.id).join(',')
    const url = `/api/accounting/export?journal_entry_ids=${encodeURIComponent(ids)}&format=${format}`
    window.open(url, '_blank')
  }

  const journalStatus =
    entries.length > 0
      ? entries.some((e) => e.status === 'posted')
        ? 'posted'
        : 'draft'
      : 'no_generado'

  if (isDraft) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardContent className="p-8 text-center">
          <CalculatorIcon className="h-12 w-12 text-amber-400/80 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Autorice la nómina primero
          </h3>
          <p className="text-white/70 max-w-md mx-auto">
            La generación de asientos contables está disponible una vez que la
            planilla haya sido autorizada. Autorice la nómina para habilitar esta
            función.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!canGenerate) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardContent className="p-8 text-center">
          <p className="text-white/70">
            Seleccione un período con planilla autorizada para generar asientos.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400/80" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardContent className="p-8 text-center">
          <CalculatorIcon className="h-12 w-12 text-brand-400/80 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Generar Asientos Contables
          </h3>
          <p className="text-white/70 max-w-md mx-auto mb-6">
            Genere las partidas contables (Partida 1: Salarios y retenciones,
            Partida 2: Aportaciones y provisiones) a partir de esta planilla
            autorizada.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-brand-600 hover:bg-brand-500 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar Asientos Contables'
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge status={journalStatus} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Exportar JSON
          </Button>
        </div>
      </div>
      <StatutoryTraceabilityPanel
        statutory={statutoryTrace}
        className="backdrop-blur-md bg-white/10 border border-white/20"
      />
      <JournalEntryTable entries={entries} />
    </div>
  )
}
