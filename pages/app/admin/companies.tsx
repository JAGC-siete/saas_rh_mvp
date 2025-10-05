import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../../../lib/auth'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'

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
  const { userProfile, loading } = useAuth()
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const { addNotification } = useNotificationContext()

  // UI state
  const [search, setSearch] = useState('')
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Guard: only admins
  useEffect(() => {
    if (!loading && userProfile && !['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
      router.push('/app/dashboard')
    }
  }, [userProfile, loading, router])

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
    }
  }

  const totalPages = Math.max(1, Math.ceil((showOnlyActive || search ? filtered.length : total) / pageSize))
  const pageItems = useMemo(() => filtered, [filtered])

  // Keep page in range when filters change
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Empresas - Admin</title>
      </Head>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Empresas</h1>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value) }}
                placeholder="Buscar por nombre, subdominio o plan"
                className="px-3 py-2 border rounded-md w-72"
              />
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={showOnlyActive} onChange={(e) => { setPage(1); setShowOnlyActive(e.target.checked) }} />
                Sólo activas
              </label>
            </div>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 text-red-800 text-sm">{error}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Listado ({showOnlyActive || search ? filtered.length : total})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>Seleccionar todos</Button>
                <Button variant="outline" size="sm" disabled={!selectedIds.length} onClick={() => bulk('activate')}>Activar</Button>
                <Button variant="outline" size="sm" disabled={!selectedIds.length} onClick={() => bulk('deactivate')}>Desactivar</Button>
                <Button variant="outline" size="sm" disabled={!selectedIds.length} onClick={() => bulk('delete')}>Eliminar</Button>
                {selectedIds.length > 0 && <span className="text-sm text-gray-600">{selectedIds.length} seleccionadas</span>}
              </div>
              {loadingCompanies ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-md" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageItems.map((company) => (
                      <Card key={company.id} className={`${!company.is_active ? 'opacity-60' : ''}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                              <input type="checkbox" checked={!!selected[company.id]} onChange={() => toggleSelect(company.id)} />
                              {company.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${company.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                              {company.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Subdominio: {company.subdomain}</div>
                            <div>Plan: {company.plan_type}</div>
                            <div>Empleados: {company.employee_count ?? 0}</div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/app/admin/companies/${company.id}`)}>Ver</Button>
                            <Button variant="outline" size="sm" onClick={() => router.push(`/app/admin/companies/${company.id}?edit=1`)}>Editar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">Página {page} de {totalPages}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente</Button>
                      <select className="border rounded-md text-sm px-2 py-1" value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)) }}>
                        <option value={6}>6</option>
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  )
}


