import { useEffect, useState } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import FiltersBar from '../../../components/attendance/FiltersBar'
import KpiCards from '../../../components/attendance/KpiCards'
import AbsenceTable from '../../../components/attendance/AbsenceTable'
import { Card } from '../../../components/ui/card'
import { useCompanyContext } from '../../../lib/useCompanyContext'
import PunctualityTable from '../../../components/attendance/PunctualityTable'
import EmployeeDrawer from '../../../components/attendance/EmployeeDrawer'
import ExportButton from '../../../components/attendance/ExportButton'

const DEFAULT_KPIS = { presentes: 0, ausentes: 0, tempranos: 0, tardes: 0 }

export default function AttendanceDashboardApp() {
  const [preset, setPreset] = useState('today')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('') // Nuevo estado para empleado seleccionado
  const [kpis, setKpis] = useState(DEFAULT_KPIS)
  const [absent, setAbsent] = useState<any[]>([])
  const [early, setEarly] = useState<any[]>([])
  const [late, setLate] = useState<any[]>([])
  const [drawer, setDrawer] = useState<{open:boolean; name:string; events:any[]}>({open:false,name:'',events:[]})
  const { companyId } = useCompanyContext()
  const [trends, setTrends] = useState<{ date: string; present: number; absent: number; late: number }[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        // Agregar employee_id a la consulta de KPIs
        const kpiUrl = `/api/attendance/kpis?preset=${preset}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
        const k = await fetch(kpiUrl).then(r => r.json()).catch(() => null)
        setKpis(k ?? DEFAULT_KPIS)
      } catch { setKpis(DEFAULT_KPIS) }

      try {
        // Agregar employee_id a la consulta de ausentes
        const absentUrl = `/api/attendance/lists?scope=${preset}&type=absent${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
        const a = await fetch(absentUrl).then(r => r.json()).catch(() => [])
        setAbsent(Array.isArray(a) ? a : [])
      } catch { setAbsent([]) }

      try {
        // Agregar employee_id a la consulta de tempranos
        const earlyUrl = `/api/attendance/lists?scope=${preset}&type=early${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
        const e = await fetch(earlyUrl).then(r => r.json()).catch(() => [])
        setEarly(Array.isArray(e) ? e : [])
      } catch { setEarly([]) }

      try {
        // Agregar employee_id a la consulta de tardes
        const lateUrl = `/api/attendance/lists?scope=${preset}&type=late${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
        const l = await fetch(lateUrl).then(r => r.json()).catch(() => [])
        setLate(Array.isArray(l) ? l : [])
      } catch { setLate([]) }
    }
    load()
  }, [preset, selectedEmployeeId]) // Agregar selectedEmployeeId como dependencia

  // Cargar tendencias de asistencia al final, con el rango de hoy (para coherencia con KPIs)
  useEffect(() => {
    const loadTrends = async () => {
      try {
        if (!companyId) return
        const today = new Date().toISOString().split('T')[0]
        // Agregar employee_id a la consulta de tendencias
        const trendsUrl = `/api/reports/attendance-trends?startDate=${today}&endDate=${today}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
        const res = await fetch(trendsUrl)
        const json = await res.json()
        if (json?.success) setTrends(json.data)
      } catch {
        setTrends([])
      }
    }
    loadTrends()
  }, [companyId, selectedEmployeeId]) // Agregar selectedEmployeeId como dependencia

  const handlePresetChange = (p: string) => setPreset(p)
  
  // Nuevo handler para cambio de empleado
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
  }

  const handleExport = async (format: string) => {
    // Agregar employee_id al export
    const exportUrl = `/api/attendance/export?format=${format}&preset=${preset}${selectedEmployeeId ? `&employee_id=${selectedEmployeeId}` : ''}`
    await fetch(exportUrl)
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
        return 'Hoy'
      case 'week':
        return 'Semana'
      case 'month':
        return 'Mes'
      default:
        return 'Hoy'
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <FiltersBar 
            preset={preset} 
            onPresetChange={handlePresetChange}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeChange={handleEmployeeChange}
          />
          <KpiCards presentes={kpis?.presentes ?? 0} ausentes={kpis?.ausentes ?? 0} temprano={kpis?.tempranos ?? 0} tarde={kpis?.tardes ?? 0} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AbsenceTable data={absent} title={`Ausentes ${getPresetLabel(preset)}`} onSelect={handleEmployeeClick} />
            <PunctualityTable data={early} type='early' title={`Tempranos ${getPresetLabel(preset)}`} onSelect={handleEmployeeClick} />
            <PunctualityTable data={late} type='late' title={`Tarde ${getPresetLabel(preset)}`} onSelect={handleEmployeeClick} />
          </div>
          <ExportButton onExport={handleExport} />
          {/* Tendencias de asistencia al final */}
          <Card variant="glass" className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Tendencias de Asistencia ({getPresetLabel(preset)})
                {selectedEmployeeId && (
                  <span className="text-sm text-gray-400 ml-2">
                    - Empleado seleccionado
                  </span>
                )}
              </h3>
            </div>
            {trends.length > 0 ? (
              <div className="space-y-2">
                {trends.map((t) => {
                  const total = t.present + t.late + t.absent
                  const attendanceRate = total > 0 ? ((t.present + t.late) / total) * 100 : 0
                  const punctualityRate = total > 0 ? (t.present / total) * 100 : 0
                  return (
                    <div key={t.date} className="grid grid-cols-7 gap-2 text-sm py-2 border-b border-gray-700">
                      <div className="text-gray-300">{new Date(t.date).toLocaleDateString('es-HN')}</div>
                      <div className="text-emerald-400 font-medium">{t.present}</div>
                      <div className="text-red-400 font-medium">{t.absent}</div>
                      <div className="text-orange-400 font-medium">{t.late}</div>
                      <div className="font-medium text-white">{total}</div>
                      <div className="font-medium text-gray-200">{attendanceRate.toFixed(1)}%</div>
                      <div className="font-medium text-gray-200">{punctualityRate.toFixed(1)}%</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">Sin datos</div>
            )}
          </Card>
        </div>
        <EmployeeDrawer open={drawer.open} onClose={() => setDrawer({open:false,name:'',events:[]})} name={drawer.name} events={drawer.events} />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

// Legacy re-export removed; this file is now the sole source


