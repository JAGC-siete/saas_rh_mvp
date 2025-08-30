import { useState, useEffect } from 'react'
import { DateTime } from 'luxon'

interface Employee {
  id: string
  name: string
  dni: string
  employee_code?: string
}

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
  // Nuevos props para empleados
  selectedEmployeeId?: string
  onEmployeeChange?: (employeeId: string) => void
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
  onRangeChange,
  selectedEmployeeId = '',
  onEmployeeChange
}: FiltersBarProps) {
  const [localFrom, setLocalFrom] = useState(startDate || DateTime.now().toISODate())
  const [localTo, setLocalTo] = useState(endDate || DateTime.now().toISODate())
  
  // Estado para empleados
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Cargar lista de empleados activos
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true)
        const response = await fetch('/api/attendance/employees')
        if (response.ok) {
          const data = await response.json()
          setEmployees(data || [])
        }
      } catch (error) {
        console.error('Error loading employees:', error)
        setEmployees([])
      } finally {
        setLoadingEmployees(false)
      }
    }

    loadEmployees()
  }, [])

  const handleRangeChange = (from: string, to: string) => {
    setLocalFrom(from)
    setLocalTo(to)
    onRangeChange && onRangeChange(from, to)
  }

  const handleEmployeeChange = (employeeId: string) => {
    onEmployeeChange && onEmployeeChange(employeeId)
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      {/* Presets - Mantener existente */}
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

      {/* Nuevo: Dropdown de Empleados */}
      {onEmployeeChange && (
        <div>
          <label className="block text-sm text-gray-300">Empleado</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            className="bg-gray-800 text-white rounded p-2 min-w-[200px]"
            disabled={loadingEmployees}
          >
            <option value="">Todos los empleados</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} {employee.employee_code ? `(${employee.employee_code})` : ''}
              </option>
            ))}
          </select>
          {loadingEmployees && (
            <div className="text-xs text-gray-400 mt-1">Cargando...</div>
          )}
        </div>
      )}

      {/* Equipo - Mantener existente */}
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

      {/* Búsqueda - Mantener existente */}
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

      {/* Fechas personalizadas - Mantener existente */}
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
