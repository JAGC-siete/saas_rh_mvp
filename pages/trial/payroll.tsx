import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

interface TrialPayrollRecord {
  employee_id: string
  name: string
  department_id: string | null
  monthly_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  gross_salary: number
  ihss: number
  rap: number
  isr: number
  total_deductions: number
  net_salary: number
}

interface TrialPayrollResponse {
  company: { id: string; name: string; subdomain: string }
  period: { startDate: string; endDate: string }
  summary: {
    employees: number
    totalGross: number
    totalIHSS: number
    totalRAP: number
    totalISR: number
    totalDeductions: number
    totalNet: number
    totalDaysWorked: number
    totalDaysAbsent: number
    totalLateDays: number
  }
  records: TrialPayrollRecord[]
}

export default function TrialPayrollPage() {
  const router = useRouter()
  const { tenant } = router.query
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrialPayrollResponse | null>(null)

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
        const res = await fetch(`/api/trial/payroll?tenant=${encodeURIComponent(t)}`)
        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || 'Error cargando datos')
        }
        const json = (await res.json()) as TrialPayrollResponse
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
          <p className="mt-4 text-gray-600">Cargando nómina de agosto 2025...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error cargando nómina</h1>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar la información de nómina'}</p>
          <Button onClick={goBackToTrial}>Volver al Trial</Button>
        </div>
      </div>
    )
  }

  const empresa = data.company.name
  const periodo = `${new Date(data.period.startDate).toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}`

  return (
    <>
      <Head>
        <title>Nómina (Trial) - {empresa} | SISU</title>
        <meta name="description" content="Nómina de agosto 2025 para entorno de prueba SISU" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">💰 Nómina (Trial)</h1>
                <p className="text-gray-600">Empresa: <strong>{empresa}</strong> • Periodo: {periodo}</p>
              </div>
              <div>
                <Button variant="outline" onClick={goBackToTrial}>Volver al Trial</Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Summary */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">Resumen de Agosto 2025</CardTitle>
              <CardDescription className="text-green-700">Cifras agregadas del período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><div className="text-gray-500">Empleados</div><div className="text-xl font-semibold text-gray-800">{data.summary.employees}</div></div>
                <div><div className="text-gray-500">Bruto Total</div><div className="text-xl font-semibold text-emerald-700">L {data.summary.totalGross.toFixed(2)}</div></div>
                <div><div className="text-gray-500">Deducciones</div><div className="text-xl font-semibold text-orange-700">L {data.summary.totalDeductions.toFixed(2)}</div></div>
                <div><div className="text-gray-500">Neto Total</div><div className="text-xl font-semibold text-blue-700">L {data.summary.totalNet.toFixed(2)}</div></div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Detalle por empleado</CardTitle>
              <CardDescription>Base en datos de asistencia de agosto 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="py-2 pr-4">Empleado</th>
                      <th className="py-2 pr-4">Salario</th>
                      <th className="py-2 pr-4">Trabajados</th>
                      <th className="py-2 pr-4">Ausentes</th>
                      <th className="py-2 pr-4">Tardes</th>
                      <th className="py-2 pr-4">Bruto</th>
                      <th className="py-2 pr-4">IHSS</th>
                      <th className="py-2 pr-4">RAP</th>
                      <th className="py-2 pr-4">ISR</th>
                      <th className="py-2 pr-4">Deducciones</th>
                      <th className="py-2 pr-4">Neto</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    {data.records.map((r) => (
                      <tr key={r.employee_id} className="border-t">
                        <td className="py-2 pr-4">{r.name}</td>
                        <td className="py-2 pr-4">L {r.monthly_salary.toFixed(2)}</td>
                        <td className="py-2 pr-4">{r.days_worked}</td>
                        <td className="py-2 pr-4">{r.days_absent}</td>
                        <td className="py-2 pr-4">{r.late_days}</td>
                        <td className="py-2 pr-4">L {r.gross_salary.toFixed(2)}</td>
                        <td className="py-2 pr-4">L {r.ihss.toFixed(2)}</td>
                        <td className="py-2 pr-4">L {r.rap.toFixed(2)}</td>
                        <td className="py-2 pr-4">L {r.isr.toFixed(2)}</td>
                        <td className="py-2 pr-4">L {r.total_deductions.toFixed(2)}</td>
                        <td className="py-2 pr-4 font-semibold">L {r.net_salary.toFixed(2)}</td>
                      </tr>
                    ))}
                    {data.records.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-6 text-center text-gray-500">Sin registros de nómina para el período</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Note */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Sobre este entorno</CardTitle>
              <CardDescription className="text-blue-700">Cálculos basados en datos de asistencia de agosto 2025 del entorno demo.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    </>
  )
}

