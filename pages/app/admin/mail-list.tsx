import { useState, useEffect, useCallback } from 'react'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import MailListStats from '../../../components/admin/MailListStats'
import {
  MARKETING_STATUS_LABELS,
  marketingStepLabel,
  type MarketingLeadStatus,
} from '../../../lib/marketing/admin-present'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { Mail, CheckCircle, Clock, XCircle, Download, Search, Trash2, UserX } from 'lucide-react'

interface MarketingLead {
  id: string
  email: string
  status: MarketingLeadStatus
  source: string | null
  current_step: number
  emails_sent_count: number
  created_at: string
  last_mail_sent_at: string | null
  unsubscribed_at: string | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type StatusFilter = 'all' | MarketingLeadStatus

export default function MailListPage() {
  const { addNotification } = useNotificationContext()
  const [leads, setLeads] = useState<MarketingLead[]>([])
  const [availableSources, setAvailableSources] = useState<string[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null)
  const [unsubscribingLeadId, setUnsubscribingLeadId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      })

      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)
      if (debouncedSearch) params.append('search', debouncedSearch)

      const res = await fetch(`/api/admin/mail-list?${params.toString()}`, {
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setLeads(data.data.leads || data.data.subscriptions || [])
          setAvailableSources(data.data.availableSources || [])
          setPagination(data.data.pagination || pagination)
        } else {
          setError(data.error || 'Formato de respuesta inválido')
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setError(errorData.error || 'No se pudo cargar la lista de leads.')
      }
    } catch (err) {
      console.error('Error fetching marketing leads:', err)
      setError('Ocurrió un error de red.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sourceFilter, debouncedSearch, pagination.page, pagination.pageSize])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleUnsubscribeLead = async (lead: MarketingLead) => {
    if (
      !confirm(
        `¿Desuscribir "${lead.email}"?\n\nDejará de recibir emails de la secuencia. El registro se conserva en el listado.`
      )
    ) {
      return
    }

    try {
      setUnsubscribingLeadId(lead.id)
      setError(null)

      const res = await fetch(`/api/admin/mail-list/${encodeURIComponent(lead.id)}`, {
        method: 'PATCH',
        credentials: 'include',
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo desuscribir el lead')
      }

      const unsubscribedAt =
        data.data?.unsubscribed_at ?? new Date().toISOString()

      setLeads(prev =>
        prev.map(item =>
          item.id === lead.id
            ? { ...item, status: 'unsubscribed', unsubscribed_at: unsubscribedAt }
            : item
        )
      )

      addNotification({
        type: 'success',
        title: 'Lead desuscrito',
        message: `${lead.email} ya no recibirá emails de la secuencia`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo desuscribir el lead'
      setError(message)
      addNotification({ type: 'error', title: 'Error', message })
    } finally {
      setUnsubscribingLeadId(null)
    }
  }

  const handleDeleteLead = async (lead: MarketingLead) => {
    if (
      !confirm(
        `¿Eliminar el lead "${lead.email}"?\n\nSe borrará el registro y su historial de emails. Esta acción no se puede deshacer.`
      )
    ) {
      return
    }

    try {
      setDeletingLeadId(lead.id)
      setError(null)

      const res = await fetch(`/api/admin/mail-list/${encodeURIComponent(lead.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el lead')
      }

      setLeads(prev => prev.filter(item => item.id !== lead.id))
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }))

      addNotification({
        type: 'success',
        title: 'Lead eliminado',
        message: `${lead.email} fue eliminado de la secuencia`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el lead'
      setError(message)
      addNotification({ type: 'error', title: 'Error', message })
    } finally {
      setDeletingLeadId(null)
    }
  }

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)
      if (debouncedSearch) params.append('search', debouncedSearch)

      const res = await fetch(`/api/admin/mail-list/export?${params.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `marketing-leads-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setError('No se pudo exportar el CSV.')
    } finally {
      setExporting(false)
    }
  }

  const getStatusIcon = (status: MarketingLeadStatus) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-400" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'unsubscribed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Mail className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: MarketingLeadStatus) => {
    const variant =
      status === 'active' ? 'default' : status === 'completed' ? 'outline' : 'destructive'
    return <Badge variant={variant}>{MARKETING_STATUS_LABELS[status]}</Badge>
  }

  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Leads de marketing</h1>
              <p className="text-muted-foreground mt-2">
                Secuencia de email (welcome + pasos 1–5 vía watchman)
              </p>
            </div>
            <Button onClick={handleExportCSV} variant="outline" disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exportando…' : 'Exportar CSV'}
            </Button>
          </div>

          <MailListStats />

          <Card variant="liquid" className="border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Filtros</CardTitle>
              <CardDescription className="text-white/70">Filtra y busca leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="completed">Completados</option>
                  <option value="unsubscribed">Desuscritos</option>
                </select>

                <select
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value)}
                  className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">Todas las fuentes</option>
                  {availableSources.map(source => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card variant="liquid" className="border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Leads</CardTitle>
              <CardDescription className="text-white/70">
                Total: {pagination.total} registros
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="text-center py-8">
                  <p>Cargando...</p>
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {!loading && !error && (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                            Secuencia
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                            Enviados
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                            Fuente
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                            Alta
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                            Último email
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white/80 uppercase">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/5 divide-y divide-white/10">
                        {leads.map(lead => (
                          <tr key={lead.id} className="input-glass text-white">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white/90">
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-white/60" />
                                {lead.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(lead.status)}
                                <span className="ml-2">{getStatusBadge(lead.status)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                              {marketingStepLabel(lead.current_step)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                              {lead.emails_sent_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                              {lead.source || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                              {lead.last_mail_sent_at ? (
                                new Date(lead.last_mail_sent_at).toLocaleDateString()
                              ) : (
                                <span className="text-white/40">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                {lead.status !== 'unsubscribed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnsubscribeLead(lead)}
                                    disabled={
                                      unsubscribingLeadId === lead.id || deletingLeadId === lead.id
                                    }
                                    className="border-amber-400/40 text-amber-100 hover:bg-amber-500/20"
                                    title="Desuscribir lead"
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteLead(lead)}
                                  disabled={
                                    deletingLeadId === lead.id || unsubscribingLeadId === lead.id
                                  }
                                  className="border-red-400/40 text-red-100 hover:bg-red-500/20"
                                  title="Eliminar lead"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {leads.length === 0 && (
                    <div className="text-center py-8 text-white/70">
                      No hay leads que coincidan con los filtros
                    </div>
                  )}

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                      <div className="text-sm text-white/70">
                        Mostrando {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
                        {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{' '}
                        {pagination.total}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page === 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page >= pagination.totalPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
