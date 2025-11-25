import { useEffect, useState, useMemo } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import HeaderBar from '../../../components/attendance/HeaderBar'
import KpiCards from '../../../components/attendance/KpiCards'
import AbsenceTable from '../../../components/attendance/AbsenceTable'
import ArrivalTable from '../../../components/attendance/ArrivalTable'
import TrendsChart from '../../../components/attendance/TrendsChart'
import KpiBarsChart from '../../../components/attendance/KpiBarsChart'
import { Card } from '../../../components/ui/card'
import { useCompanyContext } from '../../../lib/useCompanyContext'
import { formatTimeDisplay } from '../../../lib/timezone'
import EmployeeDrawer from '../../../components/attendance/EmployeeDrawer'
import { useAttendanceData, calculateAttendanceRates, getSeverityFromDelta } from '../../../lib/hooks/useAttendanceData'
import { attendanceApi, mapAttendanceError } from '../../../lib/attendance-api'

export default function AttendanceDashboardApp() {
  const [preset, setPreset] = useState('today')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [from, setFrom] = useState<string | undefined>(undefined)
  const [to, setTo] = useState<string | undefined>(undefined)
  const [drawer, setDrawer] = useState<{
    open: boolean
    name: string
    events: any[]
    employeeData?: any
    stats?: any
    schedule?: any
  }>({open:false, name:'', events:[], employeeData: undefined, stats: undefined, schedule: undefined})
  const { companyId } = useCompanyContext()
  const [trends, setTrends] = useState<{ date: string; present: number; absent: number; late: number; checkInTimes: Array<{time: string, employee: string}> }[]>([])

  // Hook unificado para datos de asistencia
  const { kpis, absent, early, late, lastUpdated, loading, error } = useAttendanceData(preset, selectedEmployeeId, selectedRole, from, to)

  // Calcular tasas derivadas
  const { total, asistenciaPct, puntualidadPct } = calculateAttendanceRates(kpis)

  // Cargar tendencias de asistencia usando el mismo preset que los KPIs
  useEffect(() => {
    const loadTrends = async () => {
      try {
        if (!companyId) return
        // Permitir rango personalizado si preset === 'custom'
        const range = preset === 'custom' && from && to ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : ''
        const trendsUrl = `/api/reports/attendance-trends?preset=${preset}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}${selectedRole ? `&role=${encodeURIComponent(selectedRole)}` : ''}${range}`
        console.log('🔍 Frontend - Loading trends from:', trendsUrl)
        const res = await fetch(trendsUrl)
        const json = await res.json()
        console.log('📊 Frontend - Trends response:', json)
        if (json?.success) {
          console.log('✅ Frontend - Setting trends data:', json.data)
          setTrends(json.data)
        }
      } catch (error) {
        console.error('❌ Frontend - Error loading trends:', error)
        setTrends([])
      }
    }
    loadTrends()
  }, [companyId, selectedEmployeeId, selectedRole, preset, from, to]) // Agregar preset y rango como dependencias

  const handlePresetChange = (p: string) => setPreset(p)
  const handleRangeChange = (f: string, t: string) => {
    setFrom(f ? `${f}T00:00:00.000Z` : undefined)
    setTo(t ? `${t}T23:59:59.999Z` : undefined)
  }
  
  // Nuevo handler para cambio de empleado
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
  }

  const handleExport = async (format: string) => {
    try {
      // Construir URL con query params (como payroll)
      const searchParams = new URLSearchParams()
      searchParams.set('preset', preset)
      // El endpoint acepta 'excel' o 'xlsx', usar 'excel' para consistencia
      searchParams.set('formato', format === 'xlsx' ? 'excel' : format)
      if (selectedEmployeeId) searchParams.set('employee_id', selectedEmployeeId)
      if (selectedRole) searchParams.set('role', selectedRole)
      
      // Si hay rango personalizado, agregarlo
      if (preset === 'custom' && from && to) {
        const fromDate = from.split('T')[0]
        const toDate = to.split('T')[0]
        searchParams.set('startDate', fromDate)
        searchParams.set('endDate', toDate)
      }
      
      const url = `/api/attendance/export?${searchParams.toString()}`
      
      // Hacer fetch y descargar blob (como payroll)
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': format === 'pdf' 
            ? 'application/pdf' 
            : format === 'csv' 
            ? 'text/csv' 
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(errorData.error || errorData.message || `Error ${response.status}`)
      }
      
      // Obtener blob y descargar
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      
      // Determinar nombre del archivo basado en preset y empleado
      const employeePart = selectedEmployeeId ? '_empleado' : ''
      const datePart = new Date().toLocaleString('sv-SE', { timeZone: 'America/Tegucigalpa' }).split(' ')[0]
      const fileExtension = format === 'xlsx' ? 'xlsx' : format
      const fileName = `asistencia_${preset}${employeePart}_${datePart}.${fileExtension}`
      link.download = fileName
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
    } catch (error: any) {
      console.error('Error al exportar:', error)
      const errorMessage = mapAttendanceError(error)
      alert(`Error al exportar: ${errorMessage}`)
    }
  }

  const handleEmployeeClick = async (id: string, name: string) => {
    try {
      const employeeUrl = `/api/attendance/employee/${id}?preset=${preset}`
      const res = await fetch(employeeUrl)
      const data = await res.json()
      
      setDrawer({
        open: true,
        name: data.employee?.name || name,
        events: data.timeline || [],
        employeeData: data.employee,
        stats: data.stats,
        schedule: data.schedule
      })
    } catch (error) {
      console.error('Error loading employee details:', error)
      setDrawer({open: false, name: '', events: [], employeeData: undefined})
    }
  }

  const getPresetLabel = (preset: string) => {
    switch (preset) {
      case 'today':
        return 'de Hoy'
      case 'week':
        return 'de esta Semana'
      case 'fortnight':
        return 'de esta Quincena'
      case 'month':
        return 'de este Mes'
      case 'year':
        return 'del Año'
      default:
        return 'de Hoy'
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header con filtros, export y timestamp */}
          <HeaderBar
            preset={preset}
            onPresetChange={handlePresetChange}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeChange={handleEmployeeChange}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            lastUpdated={lastUpdated}
            onExport={handleExport}
            loading={loading}
            from={from}
            to={to}
            onRangeChange={handleRangeChange}
          />

          {/* KPIs con tasas derivadas */}
          <KpiCards 
            presentes={kpis?.presentes ?? 0} 
            ausentes={kpis?.ausentes ?? 0} 
            temprano={kpis?.tempranos ?? 0} 
            tarde={kpis?.tardes ?? 0}
            presetLabel={` ${getPresetLabel(preset)}`}
            asistenciaPct={asistenciaPct}
            puntualidadPct={puntualidadPct}
            total={total}
            loading={loading}
          />

          {/* Gráfico de barras para distribución de asistencia */}
          <Card variant="glass" className="border border-white/10">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Distribución de Asistencia
              </h3>
              <KpiBarsChart kpis={kpis} loading={loading} />
            </div>
          </Card>

          {/* Tablas de datos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AbsenceTable 
              data={absent} 
              title={`Ausentes ${getPresetLabel(preset)}`} 
              onSelect={handleEmployeeClick} 
            />
            <ArrivalTable 
              earlyData={early} 
              lateData={late} 
              title={`Llegadas ${getPresetLabel(preset)}`} 
              onSelect={handleEmployeeClick} 
            />
          </div>
          {/* Gráfico de tendencias de asistencia */}
          <Card variant="glass" className="border border-white/10">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">📈</span>
                Tendencias de Asistencia {getPresetLabel(preset)}
                {selectedEmployeeId && (
                  <span className="text-sm text-gray-400 ml-2 font-normal">
                    • Empleado seleccionado
                  </span>
                )}
                {selectedRole && (
                  <span className="text-sm text-gray-400 ml-2 font-normal">
                    • {selectedRole}
                  </span>
                )}
              </h3>
              <TrendsChart trends={trends} loading={loading} />
              {trends.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4 font-medium">Sin datos en este rango.</p>
                  <div className="flex justify-center gap-3">
                    <button 
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-all hover:scale-105 shadow-lg shadow-brand-600/30"
                      onClick={() => setPreset('week')}
                    >
                      📅 Últimos 7 días
                    </button>
                    <button 
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-all hover:scale-105 shadow-lg shadow-brand-600/30"
                      onClick={() => setPreset('month')}
                    >
                      🗓️ Este mes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        <EmployeeDrawer 
          open={drawer.open} 
          onClose={() => setDrawer({open:false, name:'', events:[], employeeData: undefined, stats: undefined, schedule: undefined})} 
          name={drawer.name} 
          events={drawer.events}
          employeeData={drawer.employeeData}
          stats={drawer.stats}
          schedule={drawer.schedule}
        />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

// Legacy re-export removed; this file is now the sole source


