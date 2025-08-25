import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import KpiCards from '../../components/attendance/KpiCards'
import AbsenceTable from '../../components/attendance/AbsenceTable'
import PunctualityTable from '../../components/attendance/PunctualityTable'

interface TrialAttendanceResponse {
  company: { id: string; name: string; subdomain: string }
  period: { startDate: string; endDate: string }
  kpis: {
    totalEmployees: number
    present: number
    absent: number
    late: number
    onTime: number
    attendanceRate: number
    punctualityRate: number
  }
  dailyStats: { date: string; attendanceCount: number; attendanceRate: number }[]
  absentList: { id: string; name: string; team?: string | null; absentDays: number }[]
  earlyList: { id: string; name: string; team?: string | null; delta_min: number; check_in_time: string }[]
  lateList: { id: string; name: string; team?: string | null; delta_min: number; check_in_time: string }[]
  employeeStats: { employee_id: string; name: string; presentDays: number; absentDays: number; lateDays: number }[]
}

export default function TrialAttendancePage() {
  const router = useRouter()
  const { tenant } = router.query
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrialAttendanceResponse | null>(null)

  useEffect(() => {
    if (!router.isReady) return
    const t = typeof tenant === 'string' ? tenant : Array.isArray(tenant) ? tenant[0] : ''
    if (!t) {
      setError('Falta el parámetro tenant')
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/trial/attendance?tenant=${encodeURIComponent(t)}`)
        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || 'Error cargando datos')
        }
        const json = (await res.json()) as TrialAttendanceResponse
        setData(json)
      } catch (e: any) {
        setError(e?.message || 'Error interno')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router.isReady, tenant])

  const goBackToTrial = () => {
    const t = typeof tenant === 'string' ? tenant : Array.isArray(tenant) ? tenant[0] : ''
    router.push(`/trial-dashboard?tenant=${encodeURIComponent(t)}&trial=true`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando asistencia de agosto 2025...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error cargando asistencia</h1>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar la información de asistencia'}</p>
          <Button onClick={goBackToTrial}>Volver al Trial</Button>
        </div>
      </div>
    )
  }

  const empresa = data.company.name
  const presentes = data.kpis.present
  const ausentes = data.kpis.absent
  const temprano = data.earlyList.length
  const tarde = data.kpis.late
  const earlyRows = (data.earlyList || []).map((r) => ({ ...r, team: r.team || undefined }))
  const lateRows = (data.lateList || []).map((r) => ({ ...r, team: r.team || undefined }))

  return (
    <>
      <Head>
        <title>Asistencia (Trial) - {empresa} | SISU</title>
        <meta name="description" content="Asistencia de agosto 2025 para entorno de prueba SISU" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">⏰ Asistencia (Trial)</h1>
                <p className="text-gray-600">Empresa: <strong>{empresa}</strong> • Periodo: 01-31 agosto 2025</p>
              </div>
              <div>
                <Button variant="outline" onClick={goBackToTrial}>Volver al Trial</Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* KPIs */}
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">Resumen de Agosto 2025</CardTitle>
              <CardDescription className="text-green-700">Indicadores principales de asistencia</CardDescription>
            </CardHeader>
            <CardContent>
              <KpiCards presentes={presentes} ausentes={ausentes} temprano={temprano} tarde={tarde} />
            </CardContent>
          </Card>

          {/* Lists */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AbsenceTable
              title="Ausentes en el mes"
              data={(data.absentList || []).map((r) => ({ id: r.id, name: r.name, team: r.team || undefined }))}
            />
            <PunctualityTable data={earlyRows} type="early" />
            <PunctualityTable data={lateRows} type="late" />
          </div>

          {/* Notes */}
          <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Sobre este entorno</CardTitle>
              <CardDescription className="text-blue-700">Datos filtrados por tu empresa del trial y periodo fijo agosto 2025.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    </>
  )
}


