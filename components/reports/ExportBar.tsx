import { useState } from 'react'
import { Button } from '../ui/button'
import { PreviewData } from './ReportBuilder'
import { 
  FileSpreadsheet, 
  FileText, 
  Download,
  Loader2,
  CheckCircle 
} from 'lucide-react'

interface ExportBarProps {
  data: PreviewData
  onExport: (format: 'excel' | 'pdf') => Promise<void>
  disabled?: boolean
}

export default function ExportBar({ data, onExport, disabled }: ExportBarProps) {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [exported, setExported] = useState<'excel' | 'pdf' | null>(null)

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      setExporting(format)
      setExported(null)
      await onExport(format)
      setExported(format)
      
      // Clear success state after 3 seconds
      setTimeout(() => setExported(null), 3000)
    } catch (error) {
      console.error(`Error exporting ${format}:`, error)
      setExported(null)
    } finally {
      setExporting(null)
    }
  }

  const isDisabled = disabled || exporting !== null

  return (
    <div className="flex items-center justify-between p-4 bg-brand-900/20 rounded-lg border border-brand-500/30 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5 text-brand-400" />
        <div>
          <h3 className="text-sm font-semibold text-white">
            Exportar Reporte
          </h3>
          <p className="text-xs text-gray-400">
            {data.totalCount || data.rows.length} registros disponibles
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => handleExport('excel')}
          disabled={isDisabled}
          variant="outline"
          className="bg-green-600 hover:bg-green-700 text-white border-green-500 hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'excel' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : exported === 'excel' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Exportado
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </>
          )}
        </Button>

        <Button
          onClick={() => handleExport('pdf')}
          disabled={isDisabled}
          variant="outline"
          className="bg-red-600 hover:bg-red-700 text-white border-red-500 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'pdf' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : exported === 'pdf' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Exportado
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

