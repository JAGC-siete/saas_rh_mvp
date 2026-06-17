import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { 
  FileText, 
  Filter, 
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

const DEFAULT_FILTERS = {
  level: '',
  limit: 100,
  startDate: '',
  endDate: ''
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogsData | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const fetchLogs = useCallback(async (activeFilters: typeof DEFAULT_FILTERS) => {
    try {
      setLoadingLogs(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (activeFilters.level) params.append('level', activeFilters.level)
      if (activeFilters.limit) params.append('limit', activeFilters.limit.toString())
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate)
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate)
      
      const response = await fetch(`/api/admin/logs?${params.toString()}`, {
        credentials: 'include'
      })
      
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
  }, [])

  useEffect(() => {
    fetchLogs(DEFAULT_FILTERS)
  }, [fetchLogs])

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

  return (
    <>
      <Head>
        <title>Logs del Sistema - Panel de Administración</title>
        <meta name="description" content="Visualiza y analiza los logs del sistema" />
      </Head>

      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Registros del sistema</p>
              <h1 className="text-3xl font-semibold text-white">Logs del Sistema</h1>
              <p className="text-white/70">Monitorea la actividad y errores del sistema</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => fetchLogs(filters)}
                disabled={loadingLogs}
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
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
              <Card variant="liquid" className="border-white/10">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-white">{logs.statistics.total}</div>
                  <div className="text-sm text-white/70">Total de logs</div>
                </CardContent>
              </Card>
              <Card variant="liquid" className="border-white/10">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-300">
                    {logs.statistics.last24Hours?.error || 0}
                  </div>
                  <div className="text-sm text-white/70">Errores (24h)</div>
                </CardContent>
              </Card>
              <Card variant="liquid" className="border-white/10">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-300">
                    {logs.statistics.last24Hours?.warn || 0}
                  </div>
                  <div className="text-sm text-white/70">Advertencias (24h)</div>
                </CardContent>
              </Card>
              <Card variant="liquid" className="border-white/10">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-300">
                    {logs.statistics.last24Hours?.info || 0}
                  </div>
                  <div className="text-sm text-white/70">Info (24h)</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card variant="liquid" className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-1 block">Nivel</label>
                  <select 
                    className="input-glass w-full text-white focus:ring-amber-300/50"
                    value={filters.level}
                    onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                  >
                    <option value="" className="bg-slate-800">Todos</option>
                    <option value="error" className="bg-slate-800">Error</option>
                    <option value="warn" className="bg-slate-800">Advertencia</option>
                    <option value="info" className="bg-slate-800">Info</option>
                    <option value="debug" className="bg-slate-800">Debug</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-1 block">Límite</label>
                  <select 
                    className="input-glass w-full text-white focus:ring-amber-300/50"
                    value={filters.limit}
                    onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                  >
                    <option value="50" className="bg-slate-800">50</option>
                    <option value="100" className="bg-slate-800">100</option>
                    <option value="200" className="bg-slate-800">200</option>
                    <option value="500" className="bg-slate-800">500</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-1 block">Fecha Inicio</label>
                  <input 
                    type="datetime-local"
                    className="input-glass w-full text-white focus:ring-amber-300/50"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-1 block">Fecha Fin</label>
                  <input 
                    type="datetime-local"
                    className="input-glass w-full text-white focus:ring-amber-300/50"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={() => fetchLogs(filters)} disabled={loadingLogs}>
                  Aplicar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card variant="liquid" className="border-red-400/40 bg-red-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-100">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Error al cargar logs:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logs */}
          <Card variant="liquid" className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5" />
                Entradas de Log
              </CardTitle>
              <CardDescription className="text-white/70">
                {loadingLogs ? 'Cargando logs...' : `Mostrando ${logs?.logs?.length || 0} entradas`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
                </div>
              ) : logs?.logs?.length === 0 ? (
                <div className="text-center py-8 text-white/70">
                  No se encontraron logs para los filtros seleccionados
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs?.logs?.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="flex-shrink-0 mt-0.5">
                        {getLevelIcon(log.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getLevelBadgeColor(log.level) as any}>
                            {log.level?.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-white/60">
                            {new Date(log.timestamp).toLocaleString('es-HN')}
                          </span>
                        </div>
                        <p className="text-sm text-white/90 break-words">
                          {log.message}
                        </p>
                        {log.metadata && (
                          <details className="mt-2">
                            <summary className="text-xs text-amber-300 cursor-pointer hover:text-amber-200">
                              Ver detalles
                            </summary>
                            <pre className="text-xs bg-white/5 border border-white/10 p-2 rounded mt-1 overflow-x-auto text-white/80">
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
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}

