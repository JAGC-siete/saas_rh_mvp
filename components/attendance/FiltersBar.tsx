import { useState } from 'react'
import { DateTime } from 'luxon'

interface FiltersBarProps {
  preset: string
  onPresetChange: (p: string) => void
  team?: string
  onTeamChange?: (t: string) => void
  search?: string
  onSearchChange?: (s: string) => void
  startDate?: string
  endDate?: string
  onRangeChange?: (from: string, to: string) => void
}

const presets = [
  { label: 'Hoy', value: 'today' },
  { label: 'Semana', value: 'week' },
  { label: 'Quincena', value: 'fortnight' },
  { label: 'Mes', value: 'month' },
  { label: 'Año', value: 'year' },
  { label: 'Custom', value: 'custom' }
]

export default function FiltersBar({
  preset,
  onPresetChange,
  team = '',
  onTeamChange,
  search = '',
  onSearchChange,
  startDate,
  endDate,
  onRangeChange
}: FiltersBarProps) {
  const [localFrom, setLocalFrom] = useState(startDate || DateTime.now().toISODate())
  const [localTo, setLocalTo] = useState(endDate || DateTime.now().toISODate())

  const handleRangeChange = (from: string, to: string) => {
    setLocalFrom(from)
    setLocalTo(to)
    onRangeChange && onRangeChange(from, to)
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      <div>
        <label className="block text-sm text-gray-300">Presets</label>
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          className="bg-gray-800 text-white rounded p-2"
        >
          {presets.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      {onTeamChange && (
        <div>
          <label className="block text-sm text-gray-300">Equipo</label>
          <input
            type="text"
            value={team}
            onChange={(e) => onTeamChange(e.target.value)}
            className="bg-gray-800 text-white rounded p-2"
            placeholder="Equipo"
          />
        </div>
      )}
      {onSearchChange && (
        <div className="flex-1">
          <label className="block text-sm text-gray-300">Empleado</label>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-gray-800 text-white rounded p-2 w-full"
            placeholder="Buscar..."
          />
        </div>
      )}
      {preset === 'custom' && onRangeChange && (
        <div className="flex gap-2">
          <div>
            <label className="block text-sm text-gray-300">Desde</label>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => handleRangeChange(e.target.value, localTo)}
              className="bg-gray-800 text-white rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">Hasta</label>
            <input
              type="date"
              value={localTo}
              onChange={(e) => handleRangeChange(localFrom, e.target.value)}
              className="bg-gray-800 text-white rounded p-2"
            />
          </div>
        </div>
      )}
    </div>
  )
}
