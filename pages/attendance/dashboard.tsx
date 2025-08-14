import { useEffect, useState } from 'react'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import FiltersBar from '../../components/attendance/FiltersBar'
import KpiCards from '../../components/attendance/KpiCards'
import AbsenceTable from '../../components/attendance/AbsenceTable'
import PunctualityTable from '../../components/attendance/PunctualityTable'
import EmployeeDrawer from '../../components/attendance/EmployeeDrawer'
import ExportButton from '../../components/attendance/ExportButton'
import { getDateRange } from '../../lib/attendance'
import { createAdminClient } from '../../lib/supabase/server'

interface DashboardProps {
  initialKpis: any
  initialLists: { absent: any[]; early: any[]; late: any[] }
}

const DEFAULT_KPIS = { presentes: 0, ausentes: 0, tempranos: 0, tardes: 0 }

export default function AttendanceDashboard({ initialKpis, initialLists }: DashboardProps) {
  const [preset, setPreset] = useState('today')
  const [kpis, setKpis] = useState(initialKpis ?? DEFAULT_KPIS)
  const [absent, setAbsent] = useState(Array.isArray(initialLists.absent) ? initialLists.absent : [])
  const [early, setEarly] = useState(Array.isArray(initialLists.early) ? initialLists.early : [])
  const [late, setLate] = useState(Array.isArray(initialLists.late) ? initialLists.late : [])
  const [drawer, setDrawer] = useState<{open:boolean; name:string; events:any[]}>({open:false,name:'',events:[]})

  const loadData = async (p: string) => {
    try {
      const kpiRes = await fetch(`/api/attendance/kpis?preset=${p}`)
      const kpiJson = await kpiRes.json().catch(() => null)
      setKpis(kpiJson ?? DEFAULT_KPIS)
    } catch {
      setKpis(DEFAULT_KPIS)
    }
    try {
      const absentRes = await fetch(`/api/attendance/lists?scope=today&type=absent`)
      const absentJson = await absentRes.json().catch(() => [])
      setAbsent(Array.isArray(absentJson) ? absentJson : [])
    } catch {
      setAbsent([])
    }
    try {
      const earlyRes = await fetch(`/api/attendance/lists?scope=today&type=early`)
      const earlyJson = await earlyRes.json().catch(() => [])
      setEarly(Array.isArray(earlyJson) ? earlyJson : [])
    } catch {
      setEarly([])
    }
    try {
      const lateRes = await fetch(`/api/attendance/lists?scope=today&type=late`)
      const lateJson = await lateRes.json().catch(() => [])
      setLate(Array.isArray(lateJson) ? lateJson : [])
    } catch {
      setLate([])
    }
  }

  const handlePresetChange = (p: string) => {
    setPreset(p)
    loadData(p)
  }

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
        </div>
        <EmployeeDrawer open={drawer.open} onClose={() => setDrawer({open:false,name:'',events:[]})} name={drawer.name} events={drawer.events} />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

export async function getServerSideProps() {
  try {
    const supabase = createAdminClient()
    const range = getDateRange('today')
    const { data: kpis } = await supabase.rpc('attendance_kpis', { from: range.from, to: range.to })
    const { data: absent } = await supabase.rpc('attendance_lists', { scope: 'today', type: 'absent' })
    const { data: early } = await supabase.rpc('attendance_lists', { scope: 'today', type: 'early' })
    const { data: late } = await supabase.rpc('attendance_lists', { scope: 'today', type: 'late' })
    return { props: { initialKpis: kpis ?? null, initialLists: { absent: absent ?? [], early: early ?? [], late: late ?? [] } } }
  } catch (e) {
    console.error('attendance/dashboard SSR error', e)
    return { props: { initialKpis: null, initialLists: { absent: [], early: [], late: [] } } }
  }
}
