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

export default function AttendanceDashboardApp() {
  const [preset, setPreset] = useState('today')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [drawer, setDrawer] = useState<{open:boolean; name:string; events:any[]}>({open:false,name:'',events:[]})
  const { companyId } = useCompanyContext()
  const [trends, setTrends] = useState<{ date: string; present: number; absent: number; late: number; checkInTimes: Array<{time: string, employee: string}> }[]>([])

  // Hook unificado para datos de asistencia
  const { kpis, absent, early, late, lastUpdated, loading, error } = useAttendanceData(preset, selectedEmployeeId, selectedRole)

  // Calcular tasas derivadas
  const { total, asistenciaPct, puntualidadPct } = calculateAttendanceRates(kpis)

  // Cargar tendencias de asistencia usando el mismo preset que los KPIs
  useEffect(() => {
    const loadTrends = async () => {
      try {
        if (!companyId) return
        // USAR PRESET en lugar de fechas fijas para sincronizar con KPIs
        const trendsUrl = `/api/reports/attendance-trends?preset=${preset}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}${selectedRole ? `&role=${encodeURIComponent(selectedRole)}` : ''}`
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
  }, [companyId, selectedEmployeeId, selectedRole, preset]) // Agregar preset y role como dependencias

  const handlePresetChange = (p: string) => setPreset(p)
  
  // Nuevo handler para cambio de empleado
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
  }

  const handleExport = async (format: string) => {
    try {
      // Construir URL de exportación con parámetros usando preset
      const exportUrl = `/api/attendance/export?preset=${preset}&formato=${format}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}${selectedRole ? `&role=${encodeURIComponent(selectedRole)}` : ''}`
      
      // Realizar petición
      const response = await fetch(exportUrl)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      // Obtener el contenido del archivo
      const blob = await response.blob()
      
      // Determinar el nombre del archivo basado en preset y empleado (usando timezone de Honduras)
      const employeePart = selectedEmployeeId ? '_empleado' : ''
      const datePart = new Date().toLocaleString('sv-SE', { timeZone: 'America/Tegucigalpa' }).split(' ')[0]
      const fileName = `asistencia_${preset}${employeePart}_${datePart}.${format}`
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      
      // Limpiar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Error al exportar datos. Por favor intente nuevamente.')
    }
  }

  const handleEmployeeClick = async (id: string, name: string) => {
    // Agregar employee_id a la consulta del empleado
    const employeeUrl = `/api/attendance/employee/${id}?preset=${preset}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
    const res = await fetch(employeeUrl)
    const events = await res.json()
    setDrawer({open:true, name, events})
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
          <Card variant="glass">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Distribución de Asistencia</h3>
              <KpiBarsChart kpis={kpis} loading={loading} />
            </div>
          </Card>

          {/* Tablas de datos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Card variant="glass">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Tendencias de Asistencia {getPresetLabel(preset)}
                {selectedEmployeeId && (
                  <span className="text-sm text-gray-400 ml-2">
                    - Empleado seleccionado
                  </span>
                )}
                {selectedRole && (
                  <span className="text-sm text-gray-400 ml-2">
                    - {selectedRole}
                  </span>
                )}
              </h3>
              <TrendsChart trends={trends} loading={loading} />
              {trends.length === 0 && !loading && (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-3">Sin datos en este rango.</p>
                  <div className="flex justify-center gap-2">
                    <button 
                      className="px-3 py-1 bg-brand-600 text-white rounded text-sm hover:bg-brand-700 transition-colors"
                      onClick={() => setPreset('week')}
                    >
                      Últimos 7 días
                    </button>
                    <button 
                      className="px-3 py-1 bg-brand-600 text-white rounded text-sm hover:bg-brand-700 transition-colors"
                      onClick={() => setPreset('month')}
                    >
                      Este mes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        <EmployeeDrawer open={drawer.open} onClose={() => setDrawer({open:false,name:'',events:[]})} name={drawer.name} events={drawer.events} />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

// Legacy re-export removed; this file is now the sole source


