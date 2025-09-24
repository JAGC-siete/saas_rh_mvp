import { useEffect, useState, useMemo } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import HeaderBar from '../../../components/attendance/HeaderBar'
import KpiCards from '../../../components/attendance/KpiCards'
import AbsenceTable from '../../../components/attendance/AbsenceTable'
import ArrivalTable from '../../../components/attendance/ArrivalTable'
import { Card } from '../../../components/ui/card'
import { useCompanyContext } from '../../../lib/useCompanyContext'
import { formatTimeDisplay } from '../../../lib/timezone'
import EmployeeDrawer from '../../../components/attendance/EmployeeDrawer'
import { useAttendanceData, calculateAttendanceRates, getSeverityFromDelta } from '../../../lib/hooks/useAttendanceData'

export default function AttendanceDashboardApp() {
  const [preset, setPreset] = useState('today')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [drawer, setDrawer] = useState<{open:boolean; name:string; events:any[]}>({open:false,name:'',events:[]})
  const { companyId } = useCompanyContext()
  const [trends, setTrends] = useState<{ date: string; present: number; absent: number; late: number; checkInTimes: Array<{time: string, employee: string}> }[]>([])

  // Hook unificado para datos de asistencia
  const { kpis, absent, early, late, lastUpdated, loading, error } = useAttendanceData(preset, selectedEmployeeId)

  // Calcular tasas derivadas
  const { total, asistenciaPct, puntualidadPct } = calculateAttendanceRates(kpis)

  // Cargar tendencias de asistencia usando el mismo preset que los KPIs
  useEffect(() => {
    const loadTrends = async () => {
      try {
        if (!companyId) return
        // USAR PRESET en lugar de fechas fijas para sincronizar con KPIs
        const trendsUrl = `/api/reports/attendance-trends?preset=${preset}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
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
  }, [companyId, selectedEmployeeId, preset]) // Agregar preset como dependencia

  const handlePresetChange = (p: string) => setPreset(p)
  
  // Nuevo handler para cambio de empleado
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
  }

  const handleExport = async (format: string) => {
    try {
      // Construir URL de exportación con parámetros
      const exportUrl = `/api/attendance/export?format=${format}&preset=${preset}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
      
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
            lastUpdated={lastUpdated}
            onExport={handleExport}
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
          {/* Tendencias de asistencia al final */}
          <Card variant="glass" className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Tendencias de Asistencia {getPresetLabel(preset)}
                {selectedEmployeeId && (
                  <span className="text-sm text-gray-400 ml-2">
                    - Empleado seleccionado
                  </span>
                )}
              </h3>
            </div>
            {trends.length > 0 ? (
              <div className="space-y-2">
                {/* Encabezados de la tabla */}
                <div className="grid grid-cols-8 gap-2 text-sm py-2 border-b border-gray-600 font-semibold text-gray-300">
                  <div>Fecha</div>
                  <div>Presentes</div>
                  <div>Ausentes</div>
                  <div>Tarde</div>
                  <div>Total</div>
                  <div>Asistencia</div>
                  <div>Puntualidad</div>
                  <div>Horas de Entrada</div>
                </div>
                {(() => {
                  console.log('🎨 Frontend - Rendering trends data:', trends)
                  return trends.map((t) => {
                  const total = t.present + t.late + t.absent
                  const attendanceRate = total > 0 ? ((t.present + t.late) / total) * 100 : 0
                  const punctualityRate = total > 0 ? (t.present / total) * 100 : 0
                  return (
                    <div key={t.date} className="grid grid-cols-8 gap-2 text-sm py-2 border-b border-gray-700">
                      <div className="text-gray-300">{new Date(t.date + 'T00:00:00').toLocaleDateString('es-HN')}</div>
                      <div className="text-emerald-400 font-medium">{t.present}</div>
                      <div className="text-red-400 font-medium">{t.absent}</div>
                      <div className="text-orange-400 font-medium">{t.late}</div>
                      <div className="font-medium text-white">{total}</div>
                      <div className="font-medium text-gray-200">{attendanceRate.toFixed(1)}%</div>
                      <div className="font-medium text-gray-200">{punctualityRate.toFixed(1)}%</div>
                      <div className="text-blue-400 font-medium">
                        {t.checkInTimes && t.checkInTimes.length > 0 ? (
                          <div className="max-h-20 overflow-y-auto">
                            {t.checkInTimes.map((item, idx) => (
                              <div key={idx} className="text-xs flex justify-between">
                                <span>{formatTimeDisplay(item.time)}</span>
                                <span className="text-gray-400 ml-2">{item.employee}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">Sin registro</span>
                        )}
                      </div>
                    </div>
                  )
                })
                })()}
              </div>
            ) : (
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
          </Card>
        </div>
        <EmployeeDrawer open={drawer.open} onClose={() => setDrawer({open:false,name:'',events:[]})} name={drawer.name} events={drawer.events} />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

// Legacy re-export removed; this file is now the sole source


