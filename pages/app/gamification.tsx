import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import GamificationLeaderboard from '../../components/RealtimeGamificationLeaderboard'
import EmployeeAchievements from '../../components/RealtimeEmployeeAchievements'
import AchievementTypesGrid from '../../components/AchievementTypesGrid'
import PointHistoryPanel from '../../components/PointHistoryPanel'
import { useCompanyContext } from '../../lib/useCompanyContext'

interface GamificationStats {
  totalPoints: number
  totalAchievements: number
  activeEmployees: number
  topScore: number
  averageScore: number
}

export default function GamificationDashboard() {
  const router = useRouter()
  const { companyId, loading: companyLoading } = useCompanyContext()
  const [stats, setStats] = useState<GamificationStats>({
    totalPoints: 0,
    totalAchievements: 0,
    activeEmployees: 0,
    topScore: 0,
    averageScore: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (companyId && !companyLoading) {
      fetchGamificationStats(companyId)
    }
  }, [companyId, companyLoading])

  const fetchGamificationStats = async (companyId: string) => {
    try {
      setLoading(true)
      
      // Fetch stats using unified endpoint - company_id now comes from auth context
      const response = await fetch(`/api/gamification?action=stats`)
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      } else {
        console.error('Error fetching stats:', data.error)
      }
    } catch (error) {
      console.error('Error fetching gamification stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Loading State */}
          {(companyLoading || loading) && (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-white font-medium">Cargando gamificación...</div>
            </div>
          )}

          {/* Error State */}
          {!companyLoading && !loading && !companyId && (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-white font-medium">Error: No se pudo cargar la información de la empresa</div>
            </div>
          )}

          {/* Main Content */}
          {!companyLoading && !loading && companyId && (
            <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard de Gamificación</h1>
              <p className="text-gray-300">Sistema de motivación y reconocimiento de empleados</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="border-brand-600 bg-white/10 text-white hover:bg-brand-800 hover:text-white font-medium"
              >
                ← Volver al Dashboard
              </Button>
            </div>
          </div>

          {/* Gamification Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Puntos</CardTitle>
                <span className="text-2xl">⭐</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalPoints.toLocaleString()}</div>
                <p className="text-xs text-gray-300">
                  Puntos totales ganados
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Logros</CardTitle>
                <span className="text-2xl"></span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalAchievements}</div>
                <p className="text-xs text-gray-300">
                  Logros obtenidos
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Empleados Activos</CardTitle>
                <span className="text-2xl"></span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.activeEmployees}</div>
                <p className="text-xs text-gray-300">
                  Participando en gamificación
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Mejor Puntaje</CardTitle>
                <span className="text-2xl"></span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.topScore.toLocaleString()}</div>
                <p className="text-xs text-gray-300">
                  Puntos del líder
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Promedio</CardTitle>
                <span className="text-2xl"></span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{Math.round(stats.averageScore)}</div>
                <p className="text-xs text-gray-300">
                  Puntos promedio
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gamification Components */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employee Leaderboard */}
            {companyId && (
              <GamificationLeaderboard companyId={companyId} limit={10} />
            )}

            {/* Employee Achievements */}
            {companyId && (
              <EmployeeAchievements companyId={companyId} limit={8} />
            )}
          </div>

          {/* Point history */}
          <PointHistoryPanel leaderboard={[]} />

          {/* How It Works */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">¿Cómo Funciona la Gamificación?</CardTitle>
              <CardDescription className="text-gray-300">
                Sistema de puntos y logros para motivar la puntualidad y asistencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-3"></div>
                  <h3 className="font-semibold text-white mb-2">Registro de Asistencia</h3>
                  <p className="text-sm text-gray-300">
                    Cada check-in puntual otorga puntos. Llegar temprano da bonificación extra.
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3"></div>
                  <h3 className="font-semibold text-white mb-2">Logros Automáticos</h3>
                  <p className="text-sm text-gray-300">
                    El sistema detecta patrones y otorga logros por consistencia y mejora.
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3"></div>
                  <h3 className="font-semibold text-white mb-2">Competencia Saludable</h3>
                  <p className="text-sm text-gray-300">
                    Los empleados compiten por el primer lugar en el leaderboard mensual.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Types (DB-backed) */}
          <AchievementTypesGrid />
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
