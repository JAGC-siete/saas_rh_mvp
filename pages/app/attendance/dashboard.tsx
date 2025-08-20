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
        const k = await fetch(`/api/attendance/kpis?preset=${preset}`).then(r => r.json()).catch(() => null)
        setKpis(k ?? DEFAULT_KPIS)
      } catch { setKpis(DEFAULT_KPIS) }

      try {
        const a = await fetch(`/api/attendance/lists?scope=today&type=absent`).then(r => r.json()).catch(() => [])
        setAbsent(Array.isArray(a) ? a : [])
      } catch { setAbsent([]) }

      try {
        const e = await fetch(`/api/attendance/lists?scope=today&type=early`).then(r => r.json()).catch(() => [])
        setEarly(Array.isArray(e) ? e : [])
      } catch { setEarly([]) }

      try {
        const l = await fetch(`/api/attendance/lists?scope=today&type=late`).then(r => r.json()).catch(() => [])
        setLate(Array.isArray(l) ? l : [])
      } catch { setLate([]) }
    }
    load()
  }, [preset])

  // Cargar tendencias de asistencia al final, con el rango de hoy (para coherencia con KPIs)
  useEffect(() => {
    const loadTrends = async () => {
      try {
        if (!companyId) return
        const today = new Date().toISOString().split('T')[0]
        const res = await fetch(`/api/reports/attendance-trends?startDate=${today}&endDate=${today}`)
        const json = await res.json()
        if (json?.success) setTrends(json.data)
      } catch {
        setTrends([])
      }
    }
    loadTrends()
  }, [companyId])

  const handlePresetChange = (p: string) => setPreset(p)

  const handleExport = async (format: string) => {
    await fetch(`/api/attendance/export?format=${format}&preset=${preset}`)
  }

  const handleEmployeeClick = async (id: string, name: string) => {
    const res = await fetch(`/api/attendance/employee/${id}?preset=${preset}`)
    const events = await res.json()
    setDrawer({open:true, name, events})
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <FiltersBar preset={preset} onPresetChange={handlePresetChange} />
          <KpiCards presentes={kpis?.presentes ?? 0} ausentes={kpis?.ausentes ?? 0} temprano={kpis?.tempranos ?? 0} tarde={kpis?.tardes ?? 0} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AbsenceTable data={absent} title="Ausentes hoy" onSelect={handleEmployeeClick} />
            <PunctualityTable data={early} type='early' onSelect={handleEmployeeClick} />
            <PunctualityTable data={late} type='late' onSelect={handleEmployeeClick} />
          </div>
          <ExportButton onExport={handleExport} />
          {/* Tendencias de asistencia al final */}
          <Card variant="glass" className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Tendencias de Asistencia (Hoy)</h3>
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


