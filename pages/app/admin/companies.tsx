import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { COMMERCIAL_PLAN_TYPES, COMMERCIAL_PLAN_LABELS, type CommercialPlanType } from '../../../lib/billing/plans'

const PLAN_BADGE_CLASS: Record<CommercialPlanType, string> = {
  trial: 'bg-amber-500/15 text-amber-200 border border-amber-300/40',
  basic: 'bg-sky-500/15 text-sky-100 border border-sky-300/40',
  premium: 'bg-violet-500/15 text-violet-100 border border-violet-300/40',
  enterprise: 'bg-emerald-500/15 text-emerald-100 border border-emerald-300/40',
}

function planBadgeClass(plan: string): string {
  return (
    PLAN_BADGE_CLASS[(plan || '').toLowerCase() as CommercialPlanType] ||
    'bg-white/10 text-white/80 border border-white/30'
  )
}

interface Company {
  id: string
  name: string
  subdomain: string
  plan_type: string
  is_active: boolean
  created_at: string
  employee_count?: number
}

export default function CompaniesAdminPage() {
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [processingBulk, setProcessingBulk] = useState(false)
  const { addNotification } = useNotificationContext()

  // UI state
  const [search, setSearch] = useState('')
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<{
    name: string
    subdomain: string
    plan_type: CommercialPlanType
    admin_email: string
    admin_password: string
  }>({
    name: '',
    subdomain: '',
    plan_type: 'basic',
    admin_email: '',
    admin_password: ''
  })

  // Load companies with server pagination and filters
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoadingCompanies(true)
        setError(null)
        const params = new URLSearchParams()
        if (search.trim()) params.set('q', search.trim())
        if (showOnlyActive) params.set('active', 'true')
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        const res = await fetch(`/api/admin/companies-improved?${params.toString()}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Error cargando empresas')
        const data = await res.json()
        setCompanies(data.companies || [])
        setTotal(data.metadata?.total || 0)
      } catch (err: any) {
        setError(err.message || 'Error cargando empresas')
      } finally {
        setLoadingCompanies(false)
      }
    }
    loadCompanies()
  }, [search, showOnlyActive, page, pageSize])

  const filtered = useMemo(() => {
    let items = companies
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.subdomain?.toLowerCase().includes(q) ||
        c.plan_type?.toLowerCase().includes(q)
      )
    }
    if (showOnlyActive) items = items.filter(c => c.is_active)
    return items
  }, [companies, search, showOnlyActive])

  const selectedIds = useMemo(() => Object.keys(selected).filter(id => selected[id]), [selected])

  const toggleSelect = (id: string) => setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleSelectAll = () => {
    const next: Record<string, boolean> = {}
    filtered.forEach(c => { next[c.id] = !selectedIds.length || !selected[c.id] })
    setSelected(next)
  }

  const bulk = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (!selectedIds.length) return
    if (action === 'delete' && !confirm('¿Eliminar empresas seleccionadas? Esta acción no se puede deshacer.')) return
    try {
      setProcessingBulk(true)
      setLoadingCompanies(true)
      const res = await fetch('/api/admin/companies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ids: selectedIds })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Acción fallida')
      addNotification({ type: 'success', title: 'Acción completada', message: `Acción "${action}" aplicada` })
      setSelected({})
      // reload
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (showOnlyActive) params.set('active', 'true')
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      const reload = await fetch(`/api/admin/companies-improved?${params.toString()}`, { credentials: 'include' })
      const payload = await reload.json()
      setCompanies(payload.companies || [])
      setTotal(payload.metadata?.total || 0)
    } catch (err: any) {
      setError(err.message || 'Acción fallida')
      addNotification({ type: 'error', title: 'Error', message: err.message || 'Acción fallida' })
    } finally {
      setLoadingCompanies(false)
      setProcessingBulk(false)
    }
  }

  const createCompany = async () => {
    try {
      if (!createForm.name || !createForm.subdomain || !createForm.admin_email || !createForm.admin_password) {
        addNotification({ type: 'error', title: 'Campos requeridos', message: 'Completa todos los campos' })
        return
      }
      setLoadingCompanies(true)
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(createForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error creando empresa')
      addNotification({ type: 'success', title: 'Empresa creada', message: 'Se creó la empresa y el admin' })
      setShowCreate(false)
      setCreateForm({ name: '', subdomain: '', plan_type: 'basic', admin_email: '', admin_password: '' })
      // reload list first page
      setPage(1)
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (showOnlyActive) params.set('active', 'true')
      params.set('page', '1')
      params.set('pageSize', String(pageSize))
      const reload = await fetch(`/api/admin/companies-improved?${params.toString()}`, { credentials: 'include' })
      const payload = await reload.json()
      setCompanies(payload.companies || [])
      setTotal(payload.metadata?.total || 0)
    } catch (err: any) {
      setError(err.message || 'Error creando empresa')
      addNotification({ type: 'error', title: 'Error', message: err.message || 'Error creando empresa' })
    } finally {
      setLoadingCompanies(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil((showOnlyActive || search ? filtered.length : total) / pageSize))
  const pageItems = useMemo(() => filtered, [filtered])

  // Keep page in range when filters change
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  return (
    <>
      <Head>
        <title>Empresas - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Gestión de empresas</p>
                <h1 className="text-3xl font-semibold text-white">Empresas</h1>
                <p className="text-white/70">
                  Administra empresas, suscripciones y planes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value) }}
                  placeholder="Buscar por nombre, subdominio o plan"
                  className="px-3 py-2 border border-white/20 rounded-md w-72 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                />
                <label className="text-sm flex items-center gap-2 text-white/80">
                  <input 
                    type="checkbox" 
                    checked={showOnlyActive} 
                    onChange={(e) => { setPage(1); setShowOnlyActive(e.target.checked) }}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-amber-300 focus:ring-amber-300/50"
                  />
                  Sólo activas
                </label>
                <Button onClick={() => setShowCreate(true)}>Nueva empresa</Button>
              </div>
            </div>

            {error && (
              <Card variant="glass" className="border-red-400/40 bg-red-500/10">
                <CardContent className="pt-4 text-red-100 text-sm">{error}</CardContent>
              </Card>
            )}

            <Card variant="glass" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-base text-white">Listado ({showOnlyActive || search ? filtered.length : total})</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Button variant="outline" size="sm" onClick={toggleSelectAll} className="border-white/30 text-white hover:bg-white/10">Seleccionar todos</Button>
                <Button variant="outline" size="sm" disabled={!selectedIds.length} onClick={() => bulk('activate')} className="border-white/30 text-white hover:bg-white/10">Activar</Button>
                <Button variant="outline" size="sm" disabled={!selectedIds.length} onClick={() => bulk('deactivate')} className="border-white/30 text-white hover:bg-white/10">Desactivar</Button>
                <Button variant="outline" size="sm" disabled={!selectedIds.length} onClick={() => bulk('delete')} className="border-red-400/40 text-red-100 hover:bg-red-500/20">Eliminar</Button>
                {selectedIds.length > 0 && <span className="text-sm text-white/70">{selectedIds.length} seleccionadas</span>}
              </div>
              {loadingCompanies ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <div key={i} className="h-28 bg-white/5 animate-pulse rounded-md border border-white/10" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageItems.map((company) => (
                      <Card key={company.id} variant="glass" className={`border-white/10 ${!company.is_active ? 'opacity-60' : ''}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base text-white">
                            <span className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={!!selected[company.id]} 
                                onChange={() => toggleSelect(company.id)}
                                className="w-4 h-4 rounded border-white/20 bg-white/10 text-amber-300 focus:ring-amber-300/50"
                              />
                              {company.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${company.is_active ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40' : 'bg-gray-500/20 text-gray-300 border border-gray-400/40'}`}>
                              {company.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-white/70 space-y-1">
                            <div>Subdominio: <span className="text-white/90">{company.subdomain}</span></div>
                            <div className="flex items-center gap-2">
                              <span>Plan:</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${planBadgeClass(company.plan_type)}`}>
                                {COMMERCIAL_PLAN_LABELS[(company.plan_type || '').toLowerCase() as CommercialPlanType] || company.plan_type}
                              </span>
                            </div>
                            <div>Empleados: <span className="text-white/90">{company.employee_count ?? 0}</span></div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/app/admin/companies/${company.id}`)} className="border-white/30 text-white hover:bg-white/10">Ver</Button>
                            <Button variant="outline" size="sm" onClick={() => router.push(`/app/admin/companies/${company.id}?edit=1`)} className="border-white/30 text-white hover:bg-white/10">Editar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                    <div className="text-sm text-white/70">Página {page} de {totalPages}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-white/30 text-white hover:bg-white/10">Anterior</Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-white/30 text-white hover:bg-white/10">Siguiente</Button>
                      <select 
                        className="border border-white/20 rounded-md text-sm px-2 py-1 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                        value={pageSize} 
                        onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)) }}
                      >
                        <option value={6} className="bg-slate-800">6</option>
                        <option value={12} className="bg-slate-800">12</option>
                        <option value={24} className="bg-slate-800">24</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card variant="glass" className="w-full max-w-lg border-white/20 shadow-glass">
            <CardHeader>
              <CardTitle className="text-white">Crear empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-white/80 mb-1">Nombre</label>
                  <input 
                    className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                    value={createForm.name} 
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-1">Subdominio</label>
                  <input 
                    className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                    placeholder="ej: acme" 
                    value={createForm.subdomain} 
                    onChange={(e) => setCreateForm({ ...createForm, subdomain: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-1">Plan</label>
                  <select
                    className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                    value={createForm.plan_type}
                    onChange={(e) => setCreateForm({ ...createForm, plan_type: e.target.value as CommercialPlanType })}
                  >
                    {COMMERCIAL_PLAN_TYPES.map((p) => (
                      <option key={p} value={p} className="bg-slate-800">
                        {COMMERCIAL_PLAN_LABELS[p]} ({p})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-white/50">
                    Los módulos incluidos por cada plan se configuran en{' '}
                    <span className="text-amber-200/90">Admin → Planes y módulos</span>.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-1">Correo admin</label>
                  <input 
                    className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                    type="email" 
                    value={createForm.admin_email} 
                    onChange={(e) => setCreateForm({ ...createForm, admin_email: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-1">Contraseña admin</label>
                  <input 
                    className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                    type="password" 
                    value={createForm.admin_password} 
                    onChange={(e) => setCreateForm({ ...createForm, admin_password: e.target.value })} 
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowCreate(false)} className="border-white/30 text-white hover:bg-white/10">Cancelar</Button>
                  <Button onClick={createCompany}>Crear</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading overlay with glass effect for bulk operations */}
      {processingBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass border border-white/20 rounded-lg shadow-2xl p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Procesando...</p>
            <p className="text-white/70 text-sm mt-2">Por favor espera</p>
          </div>
        </div>
      )}
    </>
  )
}


