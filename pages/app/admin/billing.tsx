import { useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { CreditCard, TrendingUp, DollarSign } from 'lucide-react'

interface CompanyMeter {
  id: string
  company_id: string
  company_name: string
  month: string
  pdfs_generated: number
  vouchers_sent: number
  attendances_recorded: number
  employees_created: number
  total_usage: number
  created_at: string
  updated_at: string
}

interface ManualPayment {
  id: string
  company_id: string
  company_name: string
  amount_hnl: number
  reference: string
  paid_at: string
  created_by: string
  created_by_email: string
}

interface Company {
  id: string
  name: string
}

export default function BillingPage() {
  const { addNotification } = useNotificationContext()
  const [activeTab, setActiveTab] = useState<'meters' | 'payments'>('meters')

  // Meters state
  const [meters, setMeters] = useState<CompanyMeter[]>([])
  const [loadingMeters, setLoadingMeters] = useState(true)
  const [metersError, setMetersError] = useState<string | null>(null)
  const [meterFilters, setMeterFilters] = useState({
    company_id: '',
    month: '',
    year: new Date().getFullYear().toString()
  })
  const [metersPage, setMetersPage] = useState(1)
  const [metersTotal, setMetersTotal] = useState(0)

  // Payments state
  const [payments, setPayments] = useState<ManualPayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [paymentFilters, setPaymentFilters] = useState({
    company_id: '',
    start_date: '',
    end_date: ''
  })
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [paymentsTotal, setPaymentsTotal] = useState(0)

  // Companies for filters
  const [companies, setCompanies] = useState<Company[]>([])

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    company_id: '',
    amount_hnl: '',
    reference: '',
    paid_at: new Date().toISOString().split('T')[0]
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const tabs = [
    { id: 'meters' as const, name: 'Uso Mensual', icon: TrendingUp },
    { id: 'payments' as const, name: 'Pagos Manuales', icon: DollarSign }
  ]

  // Load companies for filters
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch('/api/admin/companies', { credentials: 'include' })
        if (!res.ok) throw new Error('Error cargando empresas')
        const data = await res.json()
        setCompanies(data.companies || [])
      } catch (err: any) {
        console.error('Error loading companies:', err)
      }
    }
    loadCompanies()
  }, [])

  // Load meters
  useEffect(() => {
    if (activeTab !== 'meters') return
    const loadMeters = async () => {
      try {
        setLoadingMeters(true)
        setMetersError(null)
        const params = new URLSearchParams()
        if (meterFilters.company_id) params.set('company_id', meterFilters.company_id)
        if (meterFilters.month) params.set('month', meterFilters.month)
        if (meterFilters.year) params.set('year', meterFilters.year)
        params.set('page', String(metersPage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/billing/meters?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando métricas')
        const data = await res.json()
        setMeters(data.data || [])
        setMetersTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setMetersError(err.message || 'Error cargando métricas')
      } finally {
        setLoadingMeters(false)
      }
    }
    loadMeters()
  }, [activeTab, meterFilters, metersPage])

  // Load payments
  useEffect(() => {
    if (activeTab !== 'payments') return
    const loadPayments = async () => {
      try {
        setLoadingPayments(true)
        setPaymentsError(null)
        const params = new URLSearchParams()
        if (paymentFilters.company_id) params.set('company_id', paymentFilters.company_id)
        if (paymentFilters.start_date) params.set('start_date', paymentFilters.start_date)
        if (paymentFilters.end_date) params.set('end_date', paymentFilters.end_date)
        params.set('page', String(paymentsPage))
        params.set('pageSize', '20')

        const res = await fetch(`/api/admin/billing/payments?${params.toString()}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando pagos')
        const data = await res.json()
        setPayments(data.data || [])
        setPaymentsTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setPaymentsError(err.message || 'Error cargando pagos')
      } finally {
        setLoadingPayments(false)
      }
    }
    loadPayments()
  }, [activeTab, paymentFilters, paymentsPage])

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.company_id || !paymentForm.amount_hnl) {
      addNotification({ type: 'error', title: 'Error', message: 'Complete los campos requeridos' })
      return
    }

    try {
      setSubmittingPayment(true)
      const res = await fetch('/api/admin/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(paymentForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error creando pago')

      addNotification({ type: 'success', title: 'Pago creado', message: data.message })
      setShowPaymentForm(false)
      setPaymentForm({
        company_id: '',
        amount_hnl: '',
        reference: '',
        paid_at: new Date().toISOString().split('T')[0]
      })
      // Reload payments
      setPaymentsPage(1)
      setPaymentFilters({ ...paymentFilters })
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('¿Eliminar este pago?')) return

    try {
      const res = await fetch(`/api/admin/billing/payments?id=${paymentId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error eliminando pago')

      addNotification({ type: 'success', title: 'Pago eliminado', message: data.message })
      // Reload payments
      setPayments(prev => prev.filter(p => p.id !== paymentId))
      setPaymentsTotal(prev => prev - 1)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  return (
    <>
      <Head>
        <title>Facturación - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            {/* Header */}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Gestión de pagos</p>
              <h1 className="text-3xl font-semibold text-white">Facturación</h1>
              <p className="text-white/70">Administra el uso y pagos de las empresas</p>
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

            {/* Meters Tab */}
            {activeTab === 'meters' && (
              <div className="space-y-4">
                {/* Filters */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Empresa</label>
                        <select
                          value={meterFilters.company_id}
                          onChange={(e) => setMeterFilters({ ...meterFilters, company_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todas</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Año</label>
                        <input
                          type="number"
                          value={meterFilters.year}
                          onChange={(e) => setMeterFilters({ ...meterFilters, year: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                          placeholder="2025"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Mes</label>
                        <select
                          value={meterFilters.month}
                          onChange={(e) => setMeterFilters({ ...meterFilters, month: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todos</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m.toString()}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Uso Mensual ({metersTotal} registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingMeters ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : metersError ? (
                      <div className="text-center py-8 text-red-400">{metersError}</div>
                    ) : meters.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay datos de uso</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Empresa</th>
                              <th className="text-left py-3 px-2">Mes</th>
                              <th className="text-right py-3 px-2">PDFs</th>
                              <th className="text-right py-3 px-2">Vouchers</th>
                              <th className="text-right py-3 px-2">Asistencias</th>
                              <th className="text-right py-3 px-2">Empleados</th>
                              <th className="text-right py-3 px-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {meters.map((meter) => (
                              <tr key={meter.id} className="border-b border-white/10">
                                <td className="py-3 px-2">{meter.company_name}</td>
                                <td className="py-3 px-2">{formatDate(meter.month)}</td>
                                <td className="text-right py-3 px-2">{meter.pdfs_generated}</td>
                                <td className="text-right py-3 px-2">{meter.vouchers_sent}</td>
                                <td className="text-right py-3 px-2">{meter.attendances_recorded}</td>
                                <td className="text-right py-3 px-2">{meter.employees_created}</td>
                                <td className="text-right py-3 px-2 font-semibold">{meter.total_usage}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingMeters && meters.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMetersPage(prev => Math.max(1, prev - 1))}
                          disabled={metersPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {metersPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMetersPage(prev => prev + 1)}
                          disabled={meters.length < 20}
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                {/* Filters and Create Button */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-white">Filtros</CardTitle>
                      <Button onClick={() => setShowPaymentForm(true)}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Nuevo Pago
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Empresa</label>
                        <select
                          value={paymentFilters.company_id}
                          onChange={(e) => setPaymentFilters({ ...paymentFilters, company_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        >
                          <option value="">Todas</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Desde</label>
                        <input
                          type="date"
                          value={paymentFilters.start_date}
                          onChange={(e) => setPaymentFilters({ ...paymentFilters, start_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={paymentFilters.end_date}
                          onChange={(e) => setPaymentFilters({ ...paymentFilters, end_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Form Modal */}
                {showPaymentForm && (
                  <Card variant="glass" className="border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Registrar Pago Manual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreatePayment} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-white/70 mb-1">Empresa *</label>
                            <select
                              value={paymentForm.company_id}
                              onChange={(e) => setPaymentForm({ ...paymentForm, company_id: e.target.value })}
                              className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                              required
                            >
                              <option value="">Seleccionar...</option>
                              {companies.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-white/70 mb-1">Monto (HNL) *</label>
                            <input
                              type="number"
                              step="0.01"
                              value={paymentForm.amount_hnl}
                              onChange={(e) => setPaymentForm({ ...paymentForm, amount_hnl: e.target.value })}
                              className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-white/70 mb-1">Referencia</label>
                            <input
                              type="text"
                              value={paymentForm.reference}
                              onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                              className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                              placeholder="# transferencia, notas..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-white/70 mb-1">Fecha de Pago</label>
                            <input
                              type="date"
                              value={paymentForm.paid_at}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paid_at: e.target.value })}
                              className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPaymentForm(false)}
                            disabled={submittingPayment}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={submittingPayment}>
                            {submittingPayment ? 'Creando...' : 'Crear Pago'}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* Table */}
                <Card variant="glass" className="border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Pagos Manuales ({paymentsTotal} registros)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingPayments ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : paymentsError ? (
                      <div className="text-center py-8 text-red-400">{paymentsError}</div>
                    ) : payments.length === 0 ? (
                      <div className="text-center py-8 text-white/60">No hay pagos registrados</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/20">
                            <tr>
                              <th className="text-left py-3 px-2">Empresa</th>
                              <th className="text-right py-3 px-2">Monto</th>
                              <th className="text-left py-3 px-2">Referencia</th>
                              <th className="text-left py-3 px-2">Fecha Pago</th>
                              <th className="text-left py-3 px-2">Creado Por</th>
                              <th className="text-center py-3 px-2">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((payment) => (
                              <tr key={payment.id} className="border-b border-white/10">
                                <td className="py-3 px-2">{payment.company_name}</td>
                                <td className="text-right py-3 px-2 font-semibold">
                                  {formatCurrency(payment.amount_hnl)}
                                </td>
                                <td className="py-3 px-2 text-white/70">{payment.reference || '-'}</td>
                                <td className="py-3 px-2">{formatDate(payment.paid_at)}</td>
                                <td className="py-3 px-2 text-sm text-white/70">{payment.created_by_email}</td>
                                <td className="text-center py-3 px-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    Eliminar
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingPayments && payments.length > 0 && (
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaymentsPage(prev => Math.max(1, prev - 1))}
                          disabled={paymentsPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-white/70">Página {paymentsPage}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaymentsPage(prev => prev + 1)}
                          disabled={payments.length < 20}
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
