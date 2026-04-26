import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import {
  ADMIN_PASSWORD_POLICY_MESSAGE_ES,
  computePasswordStrength,
  generateSecurePassword,
  passwordStrengthLabel,
  validateAdminPassword
} from '../../../lib/auth/password-policy'

function PasswordStrengthHint({ password }: { password: string }) {
  const score = computePasswordStrength(password)
  if (!password) return null
  const label = passwordStrengthLabel(score)
  const barClass =
    score <= 1
      ? 'bg-red-400'
      : score === 2
        ? 'bg-amber-400'
        : score === 3
          ? 'bg-lime-400'
          : 'bg-emerald-400'
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-white/10">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm transition-colors ${i <= score ? barClass : 'bg-white/5'}`}
          />
        ))}
      </div>
      <p className="text-xs text-white/60">
        Fortaleza: <span className="text-white/90">{label}</span>
      </p>
    </div>
  )
}

interface UserRow {
  id: string
  email: string
  name?: string | null
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
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [state, setState] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'company_admin',
    company_id: ''
  })
  /** Por defecto invitación por correo (sin contraseña en el panel). */
  const [useManualPasswordOnCreate, setUseManualPasswordOnCreate] = useState(false)

  const [resetModalUser, setResetModalUser] = useState<UserRow | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetShowManual, setResetShowManual] = useState(false)

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const buildUsersListQueryString = useCallback(
    (pageNum: number, size: number) => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (role) params.set('role', role)
      if (state) params.set('state', state)
      if (companyFilter) params.set('company_id', companyFilter)
      params.set('page', String(pageNum))
      params.set('pageSize', String(size))
      return params.toString()
    },
    [search, role, state, companyFilter]
  )

  useEffect(() => {
    let cancelled = false
    const loadCompaniesForFilters = async () => {
      try {
        const res = await fetch(
          '/api/admin/companies-improved?page=1&pageSize=100&orderBy=name&orderDir=asc',
          { credentials: 'include' }
        )
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        setCompanies((data.companies || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      } catch {
        // El modal Invitar reintenta si sigue vacío
      }
    }
    loadCompaniesForFilters()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        setError(null)
        const res = await fetch(`/api/admin/users?${buildUsersListQueryString(page, pageSize)}`, {
          credentials: 'include'
        })
        if (!res.ok) throw new Error('Error cargando usuarios')
        const data = await res.json()
        setUsers(data.users || [])
        setTotalUsers(data.metadata?.total || 0)
      } catch (err: any) {
        setError(err.message || 'Error cargando usuarios')
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [buildUsersListQueryString, page, pageSize])

  // No need for client-side filtering - API handles it
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
  const pageItems = users

  const toggleActive = async (u: UserRow) => {
    try {
      setProcessingUserId(u.id)
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
    } finally {
      setProcessingUserId(null)
    }
  }

  const openResetPasswordModal = (u: UserRow) => {
    setResetModalUser(u)
    setResetPassword('')
    setResetPasswordConfirm('')
    setResetShowManual(false)
  }

  const closeResetPasswordModal = (force?: boolean) => {
    if (!force && resetSubmitting) return
    setResetModalUser(null)
    setResetPassword('')
    setResetPasswordConfirm('')
    setResetShowManual(false)
  }

  const fillGeneratedPassword = (setterPass: (v: string) => void, setterConfirm: (v: string) => void) => {
    try {
      const p = generateSecurePassword()
      setterPass(p)
      setterConfirm(p)
    } catch {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo generar una contraseña en este entorno.'
      })
    }
  }

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetModalUser) return
    if (resetPassword !== resetPasswordConfirm) {
      addNotification({ type: 'error', title: 'Error', message: 'Las contraseñas no coinciden.' })
      return
    }
    const pw = validateAdminPassword(resetPassword)
    if (!pw.ok) {
      addNotification({ type: 'error', title: 'Contraseña', message: pw.message })
      return
    }
    try {
      setResetSubmitting(true)
      const res = await fetch(`/api/admin/users/${resetModalUser.id}?action=reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_password: resetPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo resetear')
      addNotification({ type: 'success', title: 'Contraseña actualizada', message: resetModalUser.email })
      closeResetPasswordModal(true)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudo resetear' })
    } finally {
      setResetSubmitting(false)
    }
  }

  const submitSendRecoveryLink = async () => {
    if (!resetModalUser) return
    try {
      setResetSubmitting(true)
      const res = await fetch(
        `/api/admin/users/${resetModalUser.id}?action=send-recovery-link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({})
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo enviar el enlace')
      addNotification({
        type: 'success',
        title: 'Correo enviado',
        message: data?.message || 'Revisa que el usuario tenga bandeja disponible.'
      })
      closeResetPasswordModal(true)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudo enviar' })
    } finally {
      setResetSubmitting(false)
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
    if (useManualPasswordOnCreate) {
      if (form.password !== form.passwordConfirm) {
        addNotification({ type: 'error', title: 'Error', message: 'Las contraseñas no coinciden.' })
        return
      }
      const pw = validateAdminPassword(form.password)
      if (!pw.ok) {
        addNotification({ type: 'error', title: 'Contraseña', message: pw.message })
        return
      }
    }
    try {
      const body: Record<string, unknown> = {
        email: form.email,
        role: form.role,
        company_id: form.company_id,
        mode: useManualPasswordOnCreate ? 'password' : 'invite'
      }
      if (useManualPasswordOnCreate) {
        body.password = form.password
      }
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo crear el usuario')
      addNotification({
        type: 'success',
        title: data?.invite_sent ? 'Invitación enviada' : 'Usuario creado',
        message: data?.message || data?.user?.email || ''
      })
      setShowCreate(false)
      setUseManualPasswordOnCreate(false)
      setForm({ email: '', password: '', passwordConfirm: '', role: 'company_admin', company_id: '' })
      // reload first page
      setPage(1)
      const reload = await fetch(`/api/admin/users?${buildUsersListQueryString(1, pageSize)}`, {
        credentials: 'include'
      })
      const payload = await reload.json()
      setUsers(payload.users || [])
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudo crear el usuario' })
    }
  }

  const openUserDetails = async (user: UserRow) => {
    setSelectedUser(user)
    setLoadingDetails(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error cargando detalles')
      const data = await res.json()
      setUserDetails(data.user)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message || 'No se pudieron cargar los detalles' })
      setUserDetails(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeUserDetails = () => {
    setSelectedUser(null)
    setUserDetails(null)
  }

  return (
    <>
      <Head>
        <title>Usuarios - Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Gestión de usuarios</p>
                <h1 className="text-3xl font-semibold text-white">Usuarios</h1>
                <p className="text-white/70">
                  Administra usuarios del sistema y sus permisos
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value) }}
                  placeholder="Buscar por email, nombre o empresa"
                  className="px-3 py-2 border border-white/20 rounded-md w-72 min-w-[12rem] bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                />
                <select
                  className="border border-white/20 rounded-md px-2 py-2 text-sm max-w-[14rem] truncate bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                  value={companyFilter}
                  onChange={(e) => {
                    setPage(1)
                    setCompanyFilter(e.target.value)
                  }}
                  title="Filtrar por empresa"
                >
                  <option value="" className="bg-slate-800">
                    Todas las empresas
                  </option>
                  <option value="none" className="bg-slate-800">
                    Sin empresa
                  </option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-800">
                      {c.name}
                    </option>
                  ))}
                </select>
                <select 
                  className="border border-white/20 rounded-md px-2 py-2 text-sm bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                  value={role} 
                  onChange={(e) => { setPage(1); setRole(e.target.value) }}
                >
                  <option value="" className="bg-slate-800">Todos los roles</option>
                  <option value="super_admin" className="bg-slate-800">Super admin</option>
                  <option value="company_admin" className="bg-slate-800">Admin empresa</option>
                  <option value="hr_manager" className="bg-slate-800">HR manager</option>
                  <option value="manager" className="bg-slate-800">Manager</option>
                  <option value="employee" className="bg-slate-800">Empleado</option>
                </select>
                <select 
                  className="border border-white/20 rounded-md px-2 py-2 text-sm bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                  value={state} 
                  onChange={(e) => { setPage(1); setState(e.target.value) }}
                >
                  <option value="" className="bg-slate-800">Todos</option>
                  <option value="active" className="bg-slate-800">Activos</option>
                  <option value="inactive" className="bg-slate-800">Inactivos</option>
                </select>
                <Button onClick={invite}>Invitar</Button>
              </div>
            </div>

            <Card variant="glass" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-base text-white">
                  Listado ({totalUsers})
                  {companyFilter === 'none' && (
                    <span className="block text-xs font-normal text-white/60 mt-0.5">Filtrado: sin empresa</span>
                  )}
                  {companyFilter && companyFilter !== 'none' && (
                    <span className="block text-xs font-normal text-white/60 mt-0.5 truncate">
                      Filtrado: {companies.find((c) => c.id === companyFilter)?.name || 'empresa'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
              {error && (
                <Card variant="glass" className="mb-4 border-red-400/40 bg-red-500/10">
                  <CardContent className="pt-4 text-red-100 text-sm">{error}</CardContent>
                </Card>
              )}
              {showCreate && (
                <Card variant="glass" className="mb-4 border-white/20">
                  <CardContent className="pt-4">
                    <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80">
                        Por defecto se envía una <strong className="text-white/90">invitación por correo</strong>; el
                        usuario define su contraseña en una página segura. Active la opción avanzada solo para soporte o
                        entornos sin correo.
                      </div>
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Email</label>
                        <input 
                          type="email" 
                          required 
                          className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                          value={form.email} 
                          onChange={(e) => setForm({ ...form, email: e.target.value })} 
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-white/30 bg-white/10"
                            checked={useManualPasswordOnCreate}
                            onChange={(e) => setUseManualPasswordOnCreate(e.target.checked)}
                          />
                          Establecer contraseña manualmente (avanzado)
                        </label>
                      </div>
                      {useManualPasswordOnCreate && (
                        <>
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Contraseña</label>
                        <input
                          type="password"
                          required={useManualPasswordOnCreate}
                          minLength={8}
                          autoComplete="new-password"
                          className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        <p className="text-xs text-white/50 mt-1">{ADMIN_PASSWORD_POLICY_MESSAGE_ES}</p>
                        <PasswordStrengthHint password={form.password} />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 border-white/30 text-white hover:bg-white/10 text-xs h-8"
                          onClick={() =>
                            fillGeneratedPassword(
                              (v) => setForm((f) => ({ ...f, password: v })),
                              (v) => setForm((f) => ({ ...f, passwordConfirm: v }))
                            )
                          }
                        >
                          Generar contraseña segura
                        </Button>
                      </div>
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Confirmar contraseña</label>
                        <input
                          type="password"
                          required={useManualPasswordOnCreate}
                          minLength={8}
                          autoComplete="new-password"
                          className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                          value={form.passwordConfirm}
                          onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                        />
                      </div>
                        </>
                      )}
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Rol</label>
                        <select 
                          className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                          value={form.role} 
                          onChange={(e) => setForm({ ...form, role: e.target.value })}
                        >
                          <option value="company_admin" className="bg-slate-800">Administrador de Empresa</option>
                          <option value="hr_manager" className="bg-slate-800">HR Manager</option>
                          <option value="manager" className="bg-slate-800">Manager</option>
                          <option value="employee" className="bg-slate-800">Empleado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Empresa</label>
                        <select 
                          required 
                          className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50" 
                          value={form.company_id} 
                          onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                        >
                          <option value="" className="bg-slate-800">Seleccionar...</option>
                          {companies.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2">
                        <Button type="submit">{useManualPasswordOnCreate ? 'Crear usuario' : 'Enviar invitación'}</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setUseManualPasswordOnCreate(false) }} className="border-white/30 text-white hover:bg-white/10">Cancelar</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
              {loadingUsers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <div key={i} className="h-24 bg-white/5 animate-pulse rounded-md border border-white/10" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageItems.map((u) => (
                      <Card 
                        key={u.id} 
                        variant="glass" 
                        className="border-white/10 cursor-pointer hover:border-white/30 transition-colors"
                        onClick={() => openUserDetails(u)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base text-white">
                            <span className="truncate">{u.name || u.email}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40' : 'bg-gray-500/20 text-gray-300 border border-gray-400/40'}`}>
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-white/70 space-y-1">
                            {u.name && <div>Nombre: <span className="text-white/90">{u.name}</span></div>}
                            <div>Email: <span className="text-white/90">{u.email || '—'}</span></div>
                            <div>Rol: <span className="text-white/90">{u.role}</span></div>
                            <div>Empresa: <span className="text-white/90">{u.company_name || u.company_id || '—'}</span></div>
                            <div>Último login: <span className="text-white/90">{u.last_login ? new Date(u.last_login).toLocaleString('es-HN') : '—'}</span></div>
                          </div>
                          <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => toggleActive(u)} 
                              disabled={processingUserId === u.id}
                              className="border-white/30 text-white hover:bg-white/10 disabled:opacity-50"
                            >
                              {processingUserId === u.id ? 'Procesando...' : (u.is_active ? 'Desactivar' : 'Activar')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openResetPasswordModal(u)}
                              disabled={processingUserId === u.id || resetSubmitting}
                              className="border-white/30 text-white hover:bg-white/10 disabled:opacity-50"
                            >
                              Restablecer acceso
                            </Button>
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

      {/* Loading overlay with glass effect */}
      {processingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass border border-white/20 rounded-lg shadow-2xl p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Procesando...</p>
            <p className="text-white/70 text-sm mt-2">Por favor espera</p>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => closeResetPasswordModal()}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal
            aria-labelledby="reset-password-title"
            className="relative z-[61] w-full max-w-md glass border border-white/20 rounded-lg shadow-2xl"
          >
            <div className="p-6">
              <h2 id="reset-password-title" className="text-xl font-semibold text-white mb-1">
                Restablecer acceso
              </h2>
              <p className="text-sm text-white/70 mb-4 break-all">{resetModalUser.email}</p>
              <p className="text-sm text-white/60 mb-4">
                Lo recomendado es enviar un enlace por correo (Supabase); el usuario define la contraseña sin exponerla a
                administradores.
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={resetSubmitting}
                onClick={() => submitSendRecoveryLink()}
              >
                {resetSubmitting ? 'Enviando…' : 'Enviar enlace por correo'}
              </Button>
              <button
                type="button"
                className="mt-3 w-full text-left text-xs text-amber-200/90 hover:text-amber-100 underline-offset-2 hover:underline"
                onClick={() => setResetShowManual((v) => !v)}
              >
                {resetShowManual ? 'Ocultar opción avanzada' : 'Establecer contraseña manualmente (soporte)'}
              </button>
              {resetShowManual && (
                <form onSubmit={submitResetPassword} className="mt-4 space-y-4 border-t border-white/10 pt-4">
                  <div>
                    <label className="block text-sm text-white/80 mb-1">Nueva contraseña</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      disabled={resetSubmitting}
                      className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50 disabled:opacity-50"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                    <p className="text-xs text-white/50 mt-1">{ADMIN_PASSWORD_POLICY_MESSAGE_ES}</p>
                    <PasswordStrengthHint password={resetPassword} />
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2 border-white/30 text-white hover:bg-white/10 text-xs h-8"
                      disabled={resetSubmitting}
                      onClick={() =>
                        fillGeneratedPassword(setResetPassword, setResetPasswordConfirm)
                      }
                    >
                      Generar contraseña segura
                    </Button>
                  </div>
                  <div>
                    <label className="block text-sm text-white/80 mb-1">Confirmar contraseña</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      disabled={resetSubmitting}
                      className="w-full border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50 disabled:opacity-50"
                      value={resetPasswordConfirm}
                      onChange={(e) => setResetPasswordConfirm(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                      disabled={resetSubmitting}
                      onClick={() => closeResetPasswordModal()}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={resetSubmitting}>
                      {resetSubmitting ? 'Guardando…' : 'Guardar contraseña'}
                    </Button>
                  </div>
                </form>
              )}
              {!resetShowManual && (
                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    disabled={resetSubmitting}
                    onClick={() => closeResetPasswordModal()}
                  >
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeUserDetails}
          />
          <div className="relative z-50 w-full max-w-2xl mx-4 glass border border-white/20 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-1">
                    Detalles del Usuario
                  </h2>
                  <p className="text-sm text-white/70">
                    Información completa del usuario
                  </p>
                </div>
                <button
                  onClick={closeUserDetails}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : userDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Email</label>
                      <p className="text-white">{userDetails.email || '—'}</p>
                    </div>
                    {(userDetails.name || selectedUser.name) && (
                      <div>
                        <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Nombre</label>
                        <p className="text-white">{userDetails.name || selectedUser.name}</p>
                      </div>
                    )}
                    {userDetails.employee && (
                      <>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">ID Empleado</label>
                          <p className="text-white font-mono text-sm">{userDetails.employee.id}</p>
                        </div>
                        {userDetails.employee.email && (
                          <div>
                            <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Email Empleado</label>
                            <p className="text-white">{userDetails.employee.email}</p>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Rol</label>
                      <p className="text-white">{userDetails.role || selectedUser.role}</p>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Estado</label>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${userDetails.is_active ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40' : 'bg-gray-500/20 text-gray-300 border border-gray-400/40'}`}>
                        {userDetails.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Empresa</label>
                      <p className="text-white">{userDetails.company?.name || selectedUser.company_name || '—'}</p>
                    </div>
                    {userDetails.company?.subdomain && (
                      <div>
                        <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Subdominio</label>
                        <p className="text-white">{userDetails.company.subdomain}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Último Login</label>
                      <p className="text-white">
                        {userDetails.last_login 
                          ? new Date(userDetails.last_login).toLocaleString('es-HN', { 
                              dateStyle: 'medium', 
                              timeStyle: 'short',
                              timeZone: 'America/Tegucigalpa'
                            })
                          : 'Nunca'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Fecha de Creación</label>
                      <p className="text-white">
                        {userDetails.created_at 
                          ? new Date(userDetails.created_at).toLocaleString('es-HN', { 
                              dateStyle: 'medium', 
                              timeStyle: 'short',
                              timeZone: 'America/Tegucigalpa'
                            })
                          : '—'}
                      </p>
                    </div>
                    {userDetails.updated_at && (
                      <div>
                        <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">Última Actualización</label>
                        <p className="text-white">
                          {new Date(userDetails.updated_at).toLocaleString('es-HN', { 
                            dateStyle: 'medium', 
                            timeStyle: 'short',
                            timeZone: 'America/Tegucigalpa'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  {userDetails.permissions && (
                    <div>
                      <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">Permisos</label>
                      <div className="bg-white/5 rounded-md p-4 border border-white/10">
                        <pre className="text-xs text-white/80 overflow-x-auto">
                          {JSON.stringify(userDetails.permissions, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-white/70">
                  No se pudieron cargar los detalles del usuario
                </div>
              )}
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={closeUserDetails}
                className="border-white/30 text-white hover:bg-white/10"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


