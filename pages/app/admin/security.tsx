import { useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { Shield, Activity } from 'lucide-react'

interface Session {
  id: string
  user_id: string
  email: string
  created_at: string
  last_sign_in_at?: string
  updated_at?: string
  refreshed_at?: string
  not_after?: string
  ip?: string | null
  user_agent?: string | null
}

export default function SecurityPage() {
  const { addNotification } = useNotificationContext()
  const [activeTab, setActiveTab] = useState<'sessions'>('sessions')

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsSearch, setSessionsSearch] = useState('')
  const [sessionsPage, setSessionsPage] = useState(1)
  const [sessionsTotal, setSessionsTotal] = useState(0)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  const tabs = [
    { id: 'sessions' as const, name: 'Sesiones Activas', icon: Activity }
  ]

  // Load sessions
  useEffect(() => {
    if (activeTab !== 'sessions') return
    const loadSessions = async () => {
      try {
        setLoadingSessions(true)
        setSessionsError(null)
        const params = new URLSearchParams()
        if (sessionsSearch) params.set('search', sessionsSearch)
        params.set('page', String(sessionsPage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/security/sessions?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando sesiones')
        const data = await res.json()
        setSessions(data.data || [])
        setSessionsTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setSessionsError(err.message || 'Error cargando sesiones')
      } finally {
        setLoadingSessions(false)
      }
    }
    loadSessions()
  }, [activeTab, sessionsSearch, sessionsPage])

  const handleRevokeSession = async (session: Session) => {
    if (!confirm(`¿Revocar sesión de ${session.email}?`)) return

    try {
      setRevokingSessionId(session.user_id)
      const res = await fetch(`/api/admin/security/sessions?user_id=${session.user_id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error revocando sesión')

      addNotification({ type: 'success', title: 'Sesión revocada', message: data.message })
      // Reload sessions
      setSessions(prev => prev.filter(s => s.user_id !== session.user_id))
      setSessionsTotal(prev => prev - 1)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setRevokingSessionId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatUserAgent = (ua: string | null | undefined) => {
    if (!ua) return '-'
    // Simplify user agent string
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Otro'
  }

  return (
    <>
      <Head>
        <title>Seguridad - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            {/* Header */}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Configuración de seguridad</p>
              <h1 className="text-3xl font-semibold text-white">Seguridad</h1>
              <p className="text-white/70">Monitoreo de sesiones y configuración de seguridad</p>
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

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                {/* Search and Stats */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Filtros y Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Buscar por email</label>
                        <input
                          type="text"
                          value={sessionsSearch}
                          onChange={(e) => {
                            setSessionsSearch(e.target.value)
                            setSessionsPage(1)
                          }}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                          placeholder="email@ejemplo.com"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="bg-brand-500/20 border border-brand-400/30 rounded-lg p-3 w-full">
                          <div className="text-xs text-white/60 uppercase tracking-wider">Total Sesiones Activas</div>
                          <div className="text-2xl font-bold text-white">{sessionsTotal}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Sesiones Activas ({sessionsTotal} sesiones)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingSessions ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : sessionsError ? (
                      <div className="text-center py-8 text-red-400">{sessionsError}</div>
                    ) : sessions.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay sesiones activas</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Usuario</th>
                              <th className="text-left py-3 px-2">Última Actividad</th>
                              <th className="text-left py-3 px-2">Creada</th>
                              <th className="text-left py-3 px-2">IP</th>
                              <th className="text-left py-3 px-2">Navegador</th>
                              <th className="text-center py-3 px-2">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.map((session) => (
                              <tr key={session.id} className="border-b border-white/10">
                                <td className="py-3 px-2">
                                  <div className="font-medium">{session.email}</div>
                                  <div className="text-xs text-white/50">{session.user_id.substring(0, 8)}...</div>
                                </td>
                                <td className="py-3 px-2 text-sm">
                                  {formatDate(session.last_sign_in_at || session.updated_at || session.refreshed_at || '')}
                                </td>
                                <td className="py-3 px-2 text-sm text-white/70">
                                  {formatDate(session.created_at)}
                                </td>
                                <td className="py-3 px-2 text-sm text-white/70">
                                  {session.ip || '-'}
                                </td>
                                <td className="py-3 px-2 text-sm text-white/70">
                                  {formatUserAgent(session.user_agent)}
                                </td>
                                <td className="text-center py-3 px-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRevokeSession(session)}
                                    disabled={revokingSessionId === session.user_id}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    {revokingSessionId === session.user_id ? 'Revocando...' : 'Revocar'}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingSessions && sessions.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionsPage(prev => Math.max(1, prev - 1))}
                          disabled={sessionsPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {sessionsPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionsPage(prev => prev + 1)}
                          disabled={sessions.length < 20}
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
