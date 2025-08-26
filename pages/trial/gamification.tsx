import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

interface LeaderboardRow {
  rank: number
  employee_id: string
  name: string
  employee_code: string
  department_id: string | null
  total_points: number
}

interface TrialGamificationResponse {
  company: { id: string; name: string; subdomain: string }
  leaderboard: LeaderboardRow[]
  departmentPoints: { department_id: string; points: number }[]
}

export default function TrialGamificationPage() {
  const router = useRouter()
  const { tenant } = router.query
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrialGamificationResponse | null>(null)

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
        const res = await fetch(`/api/trial/gamification?tenant=${encodeURIComponent(t)}&limit=20`)
        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || 'Error cargando datos')
        }
        const json = (await res.json()) as TrialGamificationResponse
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
          <p className="mt-4 text-gray-600">Cargando gamificación...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error cargando gamificación</h1>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar el leaderboard'}</p>
          <Button onClick={goBackToTrial}>Volver al Trial</Button>
        </div>
      </div>
    )
  }

  const empresa = data.company.name

  return (
    <>
      <Head>
        <title>Gamificación (Trial) - {empresa} | SISU</title>
        <meta name="description" content="Gamificación demo para entorno de prueba SISU" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🏆 Gamificación (Trial)</h1>
                <p className="text-gray-600">Empresa: <strong>{empresa}</strong></p>
              </div>
              <div>
                <Button variant="outline" onClick={goBackToTrial}>Volver al Trial</Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Leaderboard */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>Top empleados por puntos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Empleado</th>
                      <th className="py-2 pr-4">Código</th>
                      <th className="py-2 pr-4">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    {data.leaderboard.map((r) => (
                      <tr key={r.employee_id} className="border-t">
                        <td className="py-2 pr-4">{r.rank}</td>
                        <td className="py-2 pr-4">{r.name}</td>
                        <td className="py-2 pr-4">{r.employee_code}</td>
                        <td className="py-2 pr-4 font-semibold">{r.total_points}</td>
                      </tr>
                    ))}
                    {data.leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-500">Sin datos de gamificación</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Department Points */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Puntos por departamento</CardTitle>
              <CardDescription>Acumulado de puntos por equipo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.departmentPoints.map((d) => (
                  <div key={d.department_id} className="p-4 border rounded">
                    <div className="text-gray-600 text-sm">Departamento</div>
                    <div className="text-lg font-semibold">{d.department_id || 'Sin Departamento'}</div>
                    <div className="text-gray-600 text-sm mt-2">Puntos</div>
                    <div className="text-xl font-bold text-blue-700">{d.points}</div>
                  </div>
                ))}
                {data.departmentPoints.length === 0 && (
                  <div className="text-center text-gray-500">Sin datos</div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  )
}


