import { useState } from 'react'
import FiltersBar from './FiltersBar'
import { Button } from '../ui/button'

interface HeaderBarProps {
  preset: string
  onPresetChange: (preset: string) => void
  selectedEmployeeId: string
  onEmployeeChange: (employeeId: string) => void
  lastUpdated: Date | null
  onExport: (format: string) => Promise<void>
}

export default function HeaderBar({
  preset,
  onPresetChange,
  selectedEmployeeId,
  onEmployeeChange,
  lastUpdated,
  onExport
}: HeaderBarProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: string) => {
    try {
      setExporting(true)
      await onExport(format)
    } finally {
      setExporting(false)
    }
  }

  const formatLastUpdated = () => {
    if (!lastUpdated) return null
    
    const now = new Date()
    const diffMs = now.getTime() - lastUpdated.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Actualizado ahora'
    if (diffMins < 60) return `Actualizado hace ${diffMins} min`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Actualizado hace ${diffHours}h`
    
    return `Actualizado ${lastUpdated.toLocaleDateString('es-HN')}`
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      {/* Filtros */}
      <FiltersBar 
        preset={preset} 
        onPresetChange={onPresetChange}
        selectedEmployeeId={selectedEmployeeId}
        onEmployeeChange={onEmployeeChange}
      />

      {/* Acciones del header */}
      <div className="flex items-center gap-3">
        {/* Timestamp */}
        {lastUpdated && (
          <span className="text-xs text-gray-400">
            {formatLastUpdated()}
          </span>
        )}

        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="bg-brand-600 hover:bg-brand-700 text-white border-brand-500"
            disabled={exporting}
            onClick={() => handleExport('xlsx')}
          >
            {exporting ? 'Exportando...' : '📊 Excel'}
          </Button>
          <Button 
            variant="outline" 
            className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            disabled={exporting}
            onClick={() => handleExport('csv')}
          >
            📄 CSV
          </Button>
          <Button 
            variant="outline" 
            className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            disabled={exporting}
            onClick={() => handleExport('pdf')}
          >
            📋 PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
