import { useState, useEffect } from 'react'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import MailListStats from '../../../components/admin/MailListStats'
import { Mail, CheckCircle, Clock, XCircle, Download, Search } from 'lucide-react'

interface Subscription {
  id: string
  email: string
  status: 'pending' | 'confirmed' | 'unsubscribed'
  source: string | null
  created_at: string
  confirmed_at: string | null
  unsubscribed_at: string | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function MailListPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'unsubscribed'>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page on search
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    fetchSubscriptions()
  }, [statusFilter, sourceFilter, debouncedSearch, pagination.page])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (sourceFilter !== 'all') {
        params.append('source', sourceFilter)
      }

      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }

      const res = await fetch(`/api/admin/mail-list?${params.toString()}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setSubscriptions(data.data.subscriptions || [])
          setPagination(data.data.pagination || pagination)
        } else {
          setError(data.error || 'Formato de respuesta inválido')
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setError(errorData.error || 'No se pudo cargar la lista de suscriptores.')
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err)
      setError('Ocurrió un error de red.')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Email', 'Estado', 'Fuente', 'Fecha de Suscripción', 'Fecha de Confirmación']
    const rows = subscriptions.map(sub => [
      sub.email,
      sub.status === 'confirmed' ? 'Confirmado' : sub.status === 'pending' ? 'Pendiente' : 'Desuscrito',
      sub.source || 'N/A',
      new Date(sub.created_at).toLocaleDateString(),
      sub.confirmed_at ? new Date(sub.confirmed_at).toLocaleDateString() : '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `mail-list-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'unsubscribed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Mail className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">Confirmado</Badge>
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>
      case 'unsubscribed':
        return <Badge variant="destructive">Desuscrito</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get unique sources
  const uniqueSources = Array.from(new Set(subscriptions.map(s => s.source).filter((s): s is string => s !== null && s !== undefined)))

  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <div className="space-y-6 p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Mail List</h1>
              <p className="text-muted-foreground mt-2">
                Gestiona suscripciones y suscriptores
              </p>
            </div>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Statistics */}
          <MailListStats />

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Filtra y busca suscriptores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="unsubscribed">Desuscritos</option>
                </select>

                {/* Source Filter */}
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">Todas las fuentes</option>
                  {uniqueSources.map(source => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Suscriptores</CardTitle>
              <CardDescription>
                Total: {pagination.total} suscriptores
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
                  <p className="text-red-500">{error}</p>
                </div>
              )}

              {!loading && !error && (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fuente
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha de Suscripción
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha de Confirmación
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subscriptions.map(sub => (
                          <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                {sub.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(sub.status)}
                                <span className="ml-2">
                                  {getStatusBadge(sub.status)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sub.source || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(sub.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sub.confirmed_at ? (
                                new Date(sub.confirmed_at).toLocaleDateString()
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {subscriptions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay suscriptores que coincidan con los filtros
                    </div>
                  )}

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-gray-500">
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

