import { useState } from 'react'
import { Button } from '../ui/button'
import { PreviewData } from './ReportBuilder'
import { Download, Loader2, CheckCircle, FileSpreadsheet } from 'lucide-react'
import type { ReportExportCapabilities } from '../../lib/reports/report-ui-capabilities'

interface ExportBarProps {
  data: PreviewData
  onExport: (format: 'excel' | 'pdf' | 'csv') => Promise<void>
  disabled?: boolean
  capabilities: ReportExportCapabilities
  onExportError?: (message: string) => void
}

export default function ExportBar({ data, onExport, disabled, capabilities, onExportError }: ExportBarProps) {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | 'csv' | null>(null)
  const [exported, setExported] = useState<'excel' | 'pdf' | 'csv' | null>(null)

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      setExporting(format)
      setExported(null)
      await onExport(format)
      setExported(format)
      setTimeout(() => setExported(null), 3000)
    } catch (error) {
      console.error(`Error exporting ${format}:`, error)
      setExported(null)
      onExportError?.(error instanceof Error ? error.message : 'Error al exportar')
    } finally {
      setExporting(null)
    }
  }

  const isDisabled = disabled || exporting !== null
  const count = data.totalCount ?? data.rows.length

  const renderButton = (
    format: 'excel' | 'pdf' | 'csv',
    label: string,
    icon: typeof Download
  ) => {
    const Icon = icon
    return (
      <Button
        key={format}
        onClick={() => handleExport(format)}
        disabled={isDisabled}
        variant="outline"
        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500 hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting === format ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Exportando...
          </>
        ) : exported === format ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Listo
          </>
        ) : (
          <>
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </>
        )}
      </Button>
    )
  }

  const anyExport = capabilities.excel || capabilities.pdf || capabilities.csv

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-brand-900/20 rounded-lg border border-brand-500/30 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5 text-brand-400 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-white">Exportar</h3>
          <p className="text-xs text-gray-400">
            {count} registro{count === 1 ? '' : 's'} en vista previa
            {!anyExport && ' · No hay exportación disponible para este tipo de reporte.'}
          </p>
        </div>
      </div>

      {anyExport && (
        <div className="flex flex-wrap gap-2 justify-end">
          {capabilities.excel && renderButton('excel', 'Excel', FileSpreadsheet)}
          {capabilities.pdf && renderButton('pdf', 'PDF', Download)}
          {capabilities.csv && renderButton('csv', 'CSV', Download)}
        </div>
      )}
    </div>
  )
}
