import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'

interface UserRow {
  id: string
  email: string
  role: string
  company_id: string | null
  company_name?: string | null
  is_active: boolean
  last_login?: string | null
  created_at?: string
}

export default function UsersAdminPage() {
  const { addNotification } = useNotificationContext()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [state, setState] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({ email: '', password: '', role: 'company_admin', company_id: '' })

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        setError(null)
        const params = new URLSearchParams()
        if (search.trim()) params.set('q', search.trim())
        if (role) params.set('role', role)
        if (state) params.set('state', state)
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Error cargando usuarios')
        const data = await res.json()
        setUsers(data.users || [])
      } catch (err: any) {
        setError(err.message || 'Error cargando usuarios')
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [search, role, state, page, pageSize])

  const filtered = useMemo(() => {
    let items = users
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(u => u.email?.toLowerCase().includes(q))
    }
    if (role) items = items.filter(u => u.role === role)
    if (state) items = items.filter(u => (state === 'active' ? u.is_active : !u.is_active))
    return items
  }, [users, search, role, state])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => filtered, [filtered])

  const toggleActive = async (u: UserRow) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !u.is_active })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo actualizar')
      addNotification({ type: 'success', title: 'Usuario actualizado', message: data?.user?.email || u.email })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudo actualizar' })
    }
  }

  const resetPassword = async (u: UserRow) => {
    const newPass = prompt('Nueva contraseña (min 8 caracteres):')
    if (!newPass) return
    try {
      const res = await fetch(`/api/admin/users/${u.id}?action=reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_password: newPass })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo resetear')
      addNotification({ type: 'success', title: 'Contraseña actualizada', message: u.email })
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudo resetear' })
    }
  }

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const invite = async () => {
    try {
      setShowCreate(true)
      // load companies once
      if (companies.length === 0) {
        const res = await fetch('/api/admin/companies-improved?page=1&pageSize=100', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setCompanies((data.companies || []).map((c: any) => ({ id: c.id, name: c.name })))
        }
      }
    } catch (err) {
      console.error('Error loading companies list', err)
      addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar las empresas' })
    }
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo crear el usuario')
      addNotification({ type: 'success', title: 'Usuario creado', message: data?.user?.email || '' })
      setShowCreate(false)
      setForm({ email: '', password: '', role: 'company_admin', company_id: '' })
      // reload first page
      setPage(1)
      const reload = await fetch(`/api/admin/users?page=1&pageSize=${pageSize}`, { credentials: 'include' })
      const payload = await reload.json()
      setUsers(payload.users || [])
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudo crear el usuario' })
    }
  }

  return (
    <>
      <Head>
        <title>Usuarios - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Usuarios</h1>
              <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value) }}
                placeholder="Buscar por email"
                className="px-3 py-2 border rounded-md w-72"
              />
              <select className="border rounded-md px-2 py-2 text-sm" value={role} onChange={(e) => { setPage(1); setRole(e.target.value) }}>
                <option value="">Todos los roles</option>
                <option value="super_admin">Super admin</option>
                <option value="company_admin">Admin empresa</option>
                <option value="hr_manager">HR manager</option>
                <option value="manager">Manager</option>
                <option value="employee">Empleado</option>
              </select>
              <select className="border rounded-md px-2 py-2 text-sm" value={state} onChange={(e) => { setPage(1); setState(e.target.value) }}>
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <Button onClick={invite}>Invitar</Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Listado ({filtered.length})</CardTitle>
              </CardHeader>
              <CardContent>
              {error && (
                <div className="mb-4 border border-red-200 bg-red-50 text-sm text-red-700 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
              {showCreate && (
                <div className="mb-4 border rounded-md p-4 bg-gray-50">
                  <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm">Email</label>
                      <input type="email" required className="w-full border rounded px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm">Contraseña</label>
                      <input type="password" required minLength={8} className="w-full border rounded px-3 py-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm">Rol</label>
                      <select className="w-full border rounded px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                        <option value="company_admin">Administrador de Empresa</option>
                        <option value="hr_manager">HR Manager</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Empleado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm">Empresa</label>
                      <select required className="w-full border rounded px-3 py-2" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                        <option value="">Seleccionar...</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <Button type="submit">Crear usuario</Button>
                      <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
                    </div>
                  </form>
                </div>
              )}
              {loadingUsers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-md" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageItems.map((u) => (
                      <Card key={u.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base">
                            <span>{u.email}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Rol: {u.role}</div>
                            <div>Empresa: {u.company_name || u.company_id || '—'}</div>
                            <div>Último login: {u.last_login ? new Date(u.last_login).toLocaleString('es-HN') : '—'}</div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleActive(u)}>{u.is_active ? 'Desactivar' : 'Activar'}</Button>
                            <Button variant="outline" size="sm" onClick={() => resetPassword(u)}>Reset contraseña</Button>
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
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}


