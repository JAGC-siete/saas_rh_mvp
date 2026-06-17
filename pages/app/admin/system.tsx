import { useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { Zap, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Job {
  name: string
  status: string
}

interface JobExecution {
  id: string
  job_name: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  result: any
  error_message: string | null
  created_at: string
}

export default function SystemPage() {
  const { addNotification } = useNotificationContext()
  const [activeTab, setActiveTab] = useState<'jobs' | 'executions'>('jobs')

  // Available jobs state
  const [jobs, setJobs] = useState<Job[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [executingJob, setExecutingJob] = useState<string | null>(null)

  // Job executions state
  const [executions, setExecutions] = useState<JobExecution[]>([])
  const [loadingExecutions, setLoadingExecutions] = useState(true)
  const [executionsError, setExecutionsError] = useState<string | null>(null)
  const [executionsFilters, setExecutionsFilters] = useState({
    job_name: '',
    status: '',
    start_date: '',
    end_date: ''
  })
  const [executionsPage, setExecutionsPage] = useState(1)
  const [executionsTotal, setExecutionsTotal] = useState(0)

  const tabs = [
    { id: 'jobs' as const, name: 'Jobs Disponibles', icon: Zap },
    { id: 'executions' as const, name: 'Historial de Ejecuciones', icon: Clock }
  ]

  // Load available jobs
  useEffect(() => {
    if (activeTab !== 'jobs') return
    const loadJobs = async () => {
      try {
        setLoadingJobs(true)
        setJobsError(null)
        const res = await fetch('/api/admin/jobs', { credentials: 'include' })
        if (!res.ok) throw new Error('Error cargando jobs')
        const data = await res.json()
        setJobs(data.data?.jobs || [])
      } catch (err: any) {
        setJobsError(err.message || 'Error cargando jobs')
      } finally {
        setLoadingJobs(false)
      }
    }
    loadJobs()
  }, [activeTab])

  // Load job executions
  useEffect(() => {
    if (activeTab !== 'executions') return
    const loadExecutions = async () => {
      try {
        setLoadingExecutions(true)
        setExecutionsError(null)
        const params = new URLSearchParams()
        if (executionsFilters.job_name) params.set('job_name', executionsFilters.job_name)
        if (executionsFilters.status) params.set('status', executionsFilters.status)
        if (executionsFilters.start_date) params.set('start_date', executionsFilters.start_date)
        if (executionsFilters.end_date) params.set('end_date', executionsFilters.end_date)
        params.set('page', String(executionsPage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/system/job-executions?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando ejecuciones')
        const data = await res.json()
        setExecutions(data.data || [])
        setExecutionsTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setExecutionsError(err.message || 'Error cargando ejecuciones')
      } finally {
        setLoadingExecutions(false)
      }
    }
    loadExecutions()
  }, [activeTab, executionsFilters, executionsPage])

  const handleExecuteJob = async (jobName: string) => {
    if (!confirm(`¿Ejecutar el job "${jobName}"?`)) return

    try {
      setExecutingJob(jobName)
      const res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobName })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error ejecutando job')

      addNotification({ type: 'success', title: 'Job ejecutado', message: data.message })
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setExecutingJob(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    const seconds = (ms / 1000).toFixed(2)
    return `${seconds}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />
      case 'running':
        return <Clock className="h-5 w-5 text-blue-400 animate-pulse" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-blue-500/20 text-blue-300',
      completed: 'bg-green-500/20 text-green-300',
      failed: 'bg-red-500/20 text-red-300'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center space-x-1 ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
        {getStatusIcon(status)}
        <span>{status}</span>
      </span>
    )
  }

  return (
    <>
      <Head>
        <title>Sistema - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            {/* Header */}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Estado del sistema</p>
              <h1 className="text-3xl font-semibold text-white">Estado del Sistema</h1>
              <p className="text-white/70">Gestión de jobs programados y monitoreo de ejecuciones</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/20">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-brand-400 text-white'
                          : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <div className="space-y-4">
                <Card variant="liquid" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Jobs Programados ({jobs.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingJobs ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : jobsError ? (
                      <div className="text-center py-8 text-red-400">{jobsError}</div>
                    ) : jobs.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay jobs disponibles</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {jobs.map((job) => (
                          <div
                            key={job.name}
                            className="input-glass text-white"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-white mb-1">{job.name}</div>
                                <div className="text-xs text-white/60">Estado: {job.status}</div>
                              </div>
                              <Zap className="h-5 w-5 text-brand-400" />
                            </div>
                            <div className="mt-4">
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleExecuteJob(job.name)}
                                disabled={executingJob === job.name}
                              >
                                {executingJob === job.name ? 'Ejecutando...' : 'Ejecutar Ahora'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Executions Tab */}
            {activeTab === 'executions' && (
              <div className="space-y-4">
                {/* Filters */}
                <Card variant="liquid" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Job</label>
                        <select
                          value={executionsFilters.job_name}
                          onChange={(e) => setExecutionsFilters({ ...executionsFilters, job_name: e.target.value })}
                          className="input-glass w-full text-white"
                        >
                          <option value="">Todos</option>
                          {jobs.map((j) => (
                            <option key={j.name} value={j.name}>{j.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Estado</label>
                        <select
                          value={executionsFilters.status}
                          onChange={(e) => setExecutionsFilters({ ...executionsFilters, status: e.target.value })}
                          className="input-glass w-full text-white"
                        >
                          <option value="">Todos</option>
                          <option value="completed">Completado</option>
                          <option value="failed">Fallido</option>
                          <option value="running">Ejecutando</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Desde</label>
                        <input
                          type="date"
                          value={executionsFilters.start_date}
                          onChange={(e) => setExecutionsFilters({ ...executionsFilters, start_date: e.target.value })}
                          className="input-glass w-full text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={executionsFilters.end_date}
                          onChange={(e) => setExecutionsFilters({ ...executionsFilters, end_date: e.target.value })}
                          className="input-glass w-full text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card variant="liquid" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Historial de Ejecuciones ({executionsTotal} registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingExecutions ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : executionsError ? (
                      <div className="text-center py-8 text-red-400">{executionsError}</div>
                    ) : executions.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay ejecuciones registradas</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Job</th>
                              <th className="text-center py-3 px-2">Estado</th>
                              <th className="text-left py-3 px-2">Inicio</th>
                              <th className="text-left py-3 px-2">Fin</th>
                              <th className="text-right py-3 px-2">Duración</th>
                              <th className="text-left py-3 px-2">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {executions.map((execution) => (
                              <tr key={execution.id} className="border-b border-white/10">
                                <td className="py-3 px-2 font-medium">{execution.job_name}</td>
                                <td className="text-center py-3 px-2">{getStatusBadge(execution.status)}</td>
                                <td className="py-3 px-2 text-sm">{formatDate(execution.started_at)}</td>
                                <td className="py-3 px-2 text-sm">{formatDate(execution.completed_at)}</td>
                                <td className="text-right py-3 px-2 font-mono">{formatDuration(execution.duration_ms)}</td>
                                <td className="py-3 px-2 text-sm text-red-400">
                                  {execution.error_message ? (
                                    <span className="truncate max-w-xs block" title={execution.error_message}>
                                      {execution.error_message.substring(0, 50)}...
                                    </span>
                                  ) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingExecutions && executions.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExecutionsPage(prev => Math.max(1, prev - 1))}
                          disabled={executionsPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {executionsPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExecutionsPage(prev => prev + 1)}
                          disabled={executions.length < 20}
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}
