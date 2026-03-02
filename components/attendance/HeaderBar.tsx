import { useState } from 'react'
import FiltersBar from './FiltersBar'
import { ExportFormatButtons } from '../ui/ExportFormatButtons'

interface HeaderBarProps {
  preset: string
  onPresetChange: (preset: string) => void
  selectedEmployeeId: string
  onEmployeeChange: (employeeId: string) => void
  selectedRole?: string
  onRoleChange?: (role: string) => void
  selectedDepartmentId?: string
  onDepartmentChange?: (departmentId: string) => void
  lastUpdated: Date | null
  onExport: (format: string) => Promise<void>
  loading?: boolean
  from?: string
  to?: string
  onRangeChange?: (from: string, to: string) => void
}

export default function HeaderBar({
  preset,
  onPresetChange,
  selectedEmployeeId,
  onEmployeeChange,
  selectedRole,
  onRoleChange,
  selectedDepartmentId,
  onDepartmentChange,
  lastUpdated,
  onExport,
  loading = false,
  from,
  to,
  onRangeChange
}: HeaderBarProps) {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    try {
      setExportingFormat(format)
      await onExport(format)
    } finally {
      setExportingFormat(null)
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
        selectedRole={selectedRole}
        onRoleChange={onRoleChange}
        selectedDepartmentId={selectedDepartmentId}
        onDepartmentChange={onDepartmentChange}
        loading={loading}
        from={from}
        to={to}
        onRangeChange={onRangeChange}
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
        <ExportFormatButtons
          formats={['excel', 'csv', 'pdf']}
          onExport={async (format) => {
            await handleExport(format === 'excel' ? 'xlsx' : format)
          }}
          disabled={!!exportingFormat}
          loadingFormat={exportingFormat === 'xlsx' ? 'excel' : (exportingFormat as 'pdf' | 'csv' | null)}
          variant="primary"
        />
      </div>
    </div>
  )
}
