import { useEffect, useState, useCallback } from 'react'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import FiltersBar from '../../components/attendance/FiltersBar'
import KpiCards from '../../components/attendance/KpiCards'
import AbsenceTable from '../../components/attendance/AbsenceTable'
import PunctualityTable from '../../components/attendance/PunctualityTable'
import EmployeeDrawer from '../../components/attendance/EmployeeDrawer'
import ExportButton from '../../components/attendance/ExportButton'

export default function AttendanceDashboard() {
  const [preset, setPreset] = useState('today')
  const [kpis, setKpis] = useState({ presentes: 0, ausentes: 0, tempranos: 0, tardes: 0 })
  const [absent, setAbsent] = useState<any[]>([])
  const [early, setEarly] = useState<any[]>([])
  const [late, setLate] = useState<any[]>([])
  const [drawer, setDrawer] = useState<{open:boolean; name:string; events:any[]}>({open:false,name:'',events:[]})

  const loadData = useCallback(async () => {
    // Nota: por ahora dashboard-stats retorna "hoy"; si agregamos soporte de preset, pasar ?preset=...
    const res = await fetch(`/api/attendance/dashboard-stats`)
    if (!res.ok) return
    const data = await res.json()
    setKpis({
      presentes: data.presentToday || 0,
      ausentes: data.absentToday || 0,
      tempranos: (data.earlyList?.length) || 0,
      tardes: (data.lateList?.length) || 0,
    })
    setAbsent(data.absentList || [])
    setEarly(data.earlyList || [])
    setLate(data.lateList || [])
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, preset])

  const handlePresetChange = (p: string) => {
    setPreset(p)
  }

  const handleExport = async (format: string) => {
    await fetch(`/api/attendance/export?format=${format}`)
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
          <KpiCards presentes={kpis.presentes||0} ausentes={kpis.ausentes||0} temprano={kpis.tempranos||0} tarde={kpis.tardes||0} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AbsenceTable data={absent} title="Ausentes hoy" onSelect={handleEmployeeClick} />
            <PunctualityTable data={early} type='early' onSelect={handleEmployeeClick} />
            <PunctualityTable data={late} type='late' onSelect={handleEmployeeClick} />
          </div>
          <ExportButton onExport={handleExport} />
        </div>
        <EmployeeDrawer open={drawer.open} onClose={() => setDrawer({open:false,name:'',events:[]})} name={drawer.name} events={drawer.events} />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
