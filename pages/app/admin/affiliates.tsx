import { useState, useEffect } from 'react'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import AffiliateStats from '../../../components/admin/AffiliateStats'
import { DollarSign, Building2, Calendar } from 'lucide-react'

interface Affiliate {
  id: string
  user_id: string
  referral_code: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user_email: string
  user_name: string
  companies_referred: number
  commissions_total: number
  commissions_pending: number
  commissions_paid: number
  last_commission: string | null
}

interface Commission {
  id: string
  affiliate_id: string
  referred_company_id: string
  amount: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
  paid_at: string | null
  affiliate_name?: string
  company_name?: string
}

interface AffiliateRequest {
  id: string
  email: string
  status: 'pending_email_confirmation' | 'pending_approval' | 'approved' | 'rejected'
  questionnaire_data: any
  terms_accepted: boolean
  terms_accepted_at: string | null
  created_at: string
  updated_at: string
}

export default function ManageAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [requests, setRequests] = useState<AffiliateRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'requests' | 'affiliates' | 'commissions'>('requests')
  const [commissionFilter, setCommissionFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all')

  useEffect(() => {
    fetchAffiliates()
    fetchCommissions()
    fetchRequests()
  }, [])

  const fetchAffiliates = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/affiliates', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data && Array.isArray(data.data.affiliates)) {
          setAffiliates(data.data.affiliates)
        } else {
          setError(data.error || 'Formato de respuesta inválido')
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setError(errorData.error || 'No se pudo cargar la lista de afiliados.')
      }
    } catch (err: any) {
      setError('Ocurrió un error de red.')
      console.error('Error fetching affiliates:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCommissions = async () => {
    try {
      const res = await fetch('/api/admin/affiliates/commissions', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data && Array.isArray(data.data.commissions)) {
          setCommissions(data.data.commissions)
        } else {
          console.warn('Invalid commissions response format:', data)
          setCommissions([])
        }
      }
    } catch (err) {
      console.error('Error fetching commissions:', err)
    }
  }

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/affiliates/requests', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data && Array.isArray(data.data.requests)) {
          setRequests(data.data.requests)
        } else {
          console.warn('Invalid requests response format:', data)
          setRequests([])
        }
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    if (!confirm('¿Estás seguro de que deseas aprobar esta solicitud? Se creará un usuario y se enviarán las credenciales por email.')) {
      return
    }

    try {
      const res = await fetch('/api/admin/affiliates/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          alert('Solicitud aprobada exitosamente. Se han enviado las credenciales por email.')
          fetchRequests()
          fetchAffiliates()
        } else {
          alert(data.error || 'No se pudo aprobar la solicitud.')
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(data.error || 'No se pudo aprobar la solicitud.')
      }
    } catch {
      alert('Ocurrió un error de red.')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const reason = prompt('Ingresa la razón del rechazo (opcional):')
    if (reason === null) return // User cancelled

    if (!confirm('¿Estás seguro de que deseas rechazar esta solicitud?')) {
      return
    }

    try {
      const res = await fetch('/api/admin/affiliates/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, reason }),
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          alert('Solicitud rechazada exitosamente.')
          fetchRequests()
        } else {
          alert(data.error || 'No se pudo rechazar la solicitud.')
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(data.error || 'No se pudo rechazar la solicitud.')
      }
    } catch {
      alert('Ocurrió un error de red.')
    }
  }

  const handleStatusChange = async (affiliateId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setAffiliates(prev =>
            prev.map(aff => (aff.id === affiliateId ? { ...aff, status } : aff))
          )
        } else {
          alert(data.error || 'No se pudo actualizar el estado del afiliado.')
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(data.error || 'No se pudo actualizar el estado del afiliado.')
      }
    } catch {
      alert('Ocurrió un error de red.')
    }
  }

  const handleMarkPaid = async (commissionId: string) => {
    try {
      const res = await fetch(`/api/admin/affiliates/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setCommissions(prev =>
            prev.map(comm => (comm.id === commissionId ? { ...comm, status: 'paid' as const, paid_at: new Date().toISOString() } : comm))
          )
          // Refresh affiliates to update commission totals
          fetchAffiliates()
        } else {
          alert(data.error || 'No se pudo marcar la comisión como pagada.')
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(data.error || 'No se pudo marcar la comisión como pagada.')
      }
    } catch {
      alert('Ocurrió un error de red.')
    }
  }

  const filteredCommissions = commissionFilter === 'all'
    ? commissions
    : commissions.filter(c => c.status === commissionFilter)

  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <div className="space-y-6 p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Programa de Afiliados</h1>
              <p className="text-muted-foreground mt-2">
                Gestiona afiliados, comisiones y empresas referidas
              </p>
            </div>
          </div>

          {/* Statistics */}
          <AffiliateStats />

          {/* Tabs */}
          <div className="flex space-x-4 border-b">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'requests'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Solicitudes ({requests.filter(r => r.status === 'pending_approval').length})
            </button>
            <button
              onClick={() => setActiveTab('affiliates')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'affiliates'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Afiliados ({affiliates.length})
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'commissions'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Comisiones ({commissions.length})
            </button>
          </div>

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de Afiliación</CardTitle>
                <CardDescription>
                  {requests.filter(r => r.status === 'pending_approval').length} solicitudes pendientes de aprobación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Información Profesional
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Términos Aceptados
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requests
                        .filter(r => r.status === 'pending_approval')
                        .map(req => (
                          <tr key={req.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {req.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {req.questionnaire_data?.full_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {req.questionnaire_data?.professional_info || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {req.terms_accepted ? (
                                <span className="text-green-600">✓ Sí</span>
                              ) : (
                                <span className="text-red-600">✗ No</span>
                              )}
                              {req.terms_accepted_at && (
                                <div className="text-xs text-gray-400">
                                  {new Date(req.terms_accepted_at).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  req.status === 'approved'
                                    ? 'default'
                                    : req.status === 'rejected'
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {req.status === 'pending_email_confirmation' && 'Pendiente Email'}
                                {req.status === 'pending_approval' && 'Pendiente Aprobación'}
                                {req.status === 'approved' && 'Aprobado'}
                                {req.status === 'rejected' && 'Rechazado'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(req.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {req.status === 'pending_approval' && (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveRequest(req.id)}
                                  >
                                    Aprobar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectRequest(req.id)}
                                  >
                                    Rechazar
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {requests.filter(r => r.status === 'pending_approval').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay solicitudes pendientes de aprobación
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affiliates Tab */}
          {activeTab === 'affiliates' && (
            <Card>
              <CardHeader>
                <CardTitle>Lista de Afiliados</CardTitle>
                <CardDescription>
                  Total: {affiliates.length} afiliados registrados
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nombre
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Empresas
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Comisiones
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Última Comisión
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {affiliates.map(aff => (
                          <tr key={aff.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {aff.user_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {aff.user_email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {aff.referral_code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <Building2 className="h-4 w-4 mr-1" />
                                {aff.companies_referred}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex flex-col">
                                <span className="font-medium">L. {aff.commissions_total.toLocaleString()}</span>
                                <span className="text-xs text-gray-400">
                                  Pendiente: L. {aff.commissions_pending.toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {aff.last_commission ? (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(aff.last_commission).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  aff.status === 'approved'
                                    ? 'default'
                                    : aff.status === 'rejected'
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {aff.status === 'approved' ? 'Aprobado' : aff.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {aff.status === 'pending' && (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(aff.id, 'approved')}
                                  >
                                    Aprobar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleStatusChange(aff.id, 'rejected')}
                                  >
                                    Rechazar
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {affiliates.length === 0 && !loading && !error && (
                      <div className="text-center py-8 text-gray-500">
                        No hay afiliados registrados
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Comisiones</CardTitle>
                    <CardDescription>
                      Total: {commissions.length} comisiones registradas
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant={commissionFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommissionFilter('all')}
                    >
                      Todas
                    </Button>
                    <Button
                      variant={commissionFilter === 'pending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommissionFilter('pending')}
                    >
                      Pendientes
                    </Button>
                    <Button
                      variant={commissionFilter === 'paid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommissionFilter('paid')}
                    >
                      Pagadas
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Afiliado
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empresa Referida
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCommissions.map(comm => (
                        <tr key={comm.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {comm.affiliate_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {comm.company_name || comm.referred_company_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              L. {comm.amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={
                                comm.status === 'paid'
                                  ? 'default'
                                  : comm.status === 'cancelled'
                                  ? 'destructive'
                                  : 'outline'
                              }
                            >
                              {comm.status === 'paid' ? 'Pagada' : comm.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(comm.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {comm.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkPaid(comm.id)}
                              >
                                Marcar como Pagada
                              </Button>
                            )}
                            {comm.status === 'paid' && comm.paid_at && (
                              <span className="text-xs text-gray-400">
                                Pagada: {new Date(comm.paid_at).toLocaleDateString()}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCommissions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {commissionFilter !== 'all' 
                        ? `No hay comisiones con estado ${commissionFilter === 'pending' ? 'pendiente' : commissionFilter === 'paid' ? 'pagada' : 'cancelada'}`
                        : 'No hay comisiones registradas'
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
