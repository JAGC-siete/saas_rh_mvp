import { useEffect, useState } from 'react'
import { useAuth } from '../../../lib/auth'
import { useRouter } from 'next/router'
import Head from 'next/head'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { 
  FileText, 
  Filter, 
  Download,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'

interface LogEntry {
  id: string
  level: string
  message: string
  timestamp: string
  metadata?: any
}

interface LogsData {
  logs: LogEntry[]
  statistics: {
    total: number
    last24Hours: Record<string, number>
    filters: any
  }
}

export default function AdminLogs() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<LogsData | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    level: '',
    limit: 100,
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    if (!loading && (!user || !userProfile)) {
      router.push('/auth/start')
      return
    }

    if (!loading && userProfile && !['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
      router.push('/app/dashboard')
      return
    }
  }, [user, userProfile, loading, router])

  useEffect(() => {
    if (userProfile && ['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
      fetchLogs()
    }
  }, [userProfile])

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters.level) params.append('level', filters.level)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const response = await fetch(`/api/admin/logs?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch logs')
      }
      
      const data = await response.json()
      setLogs(data.data)
    } catch (error: any) {
      console.error('Error fetching logs:', error)
      setError(error.message || 'Failed to load logs')
    } finally {
      setLoadingLogs(false)
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getLevelBadgeColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'destructive'
      case 'warn':
        return 'secondary'
      case 'info':
        return 'default'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !userProfile || !['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
    return null
  }

  return (
    <>
      <Head>
        <title>Logs del Sistema - Panel de Administración</title>
        <meta name="description" content="Visualiza y analiza los logs del sistema" />
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Logs del Sistema</h1>
              <p className="text-gray-600">Monitorea la actividad y errores del sistema</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={fetchLogs}
                disabled={loadingLogs}
                variant="outline"
                size="sm"
              >
                {loadingLogs ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualizar
              </Button>
            </div>
          </div>

          {/* Statistics */}
          {logs && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{logs.statistics.total}</div>
                  <div className="text-sm text-gray-600">Total de logs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {logs.statistics.last24Hours?.error || 0}
                  </div>
                  <div className="text-sm text-gray-600">Errores (24h)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {logs.statistics.last24Hours?.warn || 0}
                  </div>
                  <div className="text-sm text-gray-600">Advertencias (24h)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {logs.statistics.last24Hours?.info || 0}
                  </div>
                  <div className="text-sm text-gray-600">Info (24h)</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Nivel</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md"
                    value={filters.level}
                    onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    <option value="error">Error</option>
                    <option value="warn">Advertencia</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Límite</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md"
                    value={filters.limit}
                    onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                  >
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="500">500</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha Inicio</label>
                  <input 
                    type="datetime-local"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha Fin</label>
                  <input 
                    type="datetime-local"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={fetchLogs} disabled={loadingLogs}>
                  Aplicar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Error al cargar logs:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Entradas de Log
              </CardTitle>
              <CardDescription>
                {loadingLogs ? 'Cargando logs...' : `Mostrando ${logs?.logs?.length || 0} entradas`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : logs?.logs?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron logs para los filtros seleccionados
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs?.logs?.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0 mt-0.5">
                        {getLevelIcon(log.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getLevelBadgeColor(log.level) as any}>
                            {log.level?.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString('es-HN')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 break-words">
                          {log.message}
                        </p>
                        {log.metadata && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer">
                              Ver detalles
                            </summary>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  )
}

