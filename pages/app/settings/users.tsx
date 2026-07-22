import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { useAuth } from '../../../lib/auth'
import {
  ADMIN_PASSWORD_POLICY_MESSAGE_ES,
  computePasswordStrength,
  generateSecurePassword,
  passwordStrengthLabel,
  validateAdminPassword,
} from '../../../lib/auth/password-policy'
import {
  COMPANY_MANAGED_ROLES,
  COMPANY_MODULE_DEFS,
  COMPANY_ROLE_LABELS,
  canManageCompanyUsers,
  isModuleEnabledByFeatures,
  roleCanEditSalary,
  type CompanyManagedRole,
  type CompanyModuleKey,
  type ModuleGrant,
} from '../../../lib/company/users'
import { normalizeRole } from '../../../lib/auth/role-access'

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
  is_active: boolean
  last_login?: string | null
  created_at?: string
}

const ROLE_LABELS = COMPANY_ROLE_LABELS

function emptyModuleGrants(features: Record<string, boolean>): Record<CompanyModuleKey, ModuleGrant> {
  const out = {} as Record<CompanyModuleKey, ModuleGrant>
  for (const def of COMPANY_MODULE_DEFS) {
    const enabled = isModuleEnabledByFeatures(def.key, features)
    out[def.key] = {
      view: enabled && (def.key === 'employees' || def.key === 'attendance' || def.key === 'leave'),
      manage: false,
    }
  }
  return out
}

export default function CompanyUsersPage() {
  const { addNotification } = useNotificationContext()
  const { userProfile, loading: authLoading } = useAuth()

  const actorRole = normalizeRole(userProfile?.role)
  const canManage = canManageCompanyUsers(actorRole)

  const [users, setUsers] = useState<UserRow[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'employee' as CompanyManagedRole,
  })
  const [useManualPasswordOnCreate, setUseManualPasswordOnCreate] = useState(false)
  const [createCanViewSalary, setCreateCanViewSalary] = useState(false)
  const [createModuleGrants, setCreateModuleGrants] = useState<
    Record<CompanyModuleKey, ModuleGrant>
  >(() => emptyModuleGrants({}))

  const [resetModalUser, setResetModalUser] = useState<UserRow | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetShowManual, setResetShowManual] = useState(false)

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [editRole, setEditRole] = useState<CompanyManagedRole>('employee')
  const [editCanViewSalary, setEditCanViewSalary] = useState(false)
  const [editModuleGrants, setEditModuleGrants] = useState<
    Record<CompanyModuleKey, ModuleGrant>
  >(() => emptyModuleGrants({}))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/features', { credentials: 'include' })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        const f = (data.features || {}) as Record<string, boolean>
        setFeatures(f)
        setCreateModuleGrants(emptyModuleGrants(f))
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const buildQuery = useCallback(
    (pageNum: number, size: number) => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (roleFilter) params.set('role', roleFilter)
      if (stateFilter) params.set('state', stateFilter)
      params.set('page', String(pageNum))
      params.set('pageSize', String(size))
      return params.toString()
    },
    [search, roleFilter, stateFilter]
  )

  const reloadUsers = useCallback(
    async (pageNum = page, size = pageSize) => {
      setLoadingUsers(true)
      setError(null)
      try {
        const res = await fetch(`/api/company/users?${buildQuery(pageNum, size)}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.message || data?.error || 'Error cargando usuarios')
        }
        const data = await res.json()
        setUsers(data.users || [])
        setTotalUsers(data.metadata?.total || 0)
      } catch (err: any) {
        setError(err.message || 'Error cargando usuarios')
      } finally {
        setLoadingUsers(false)
      }
    },
    [buildQuery, page, pageSize]
  )

  useEffect(() => {
    if (!canManage) return
    reloadUsers()
  }, [canManage, reloadUsers])

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const createEditSalaryLocked = roleCanEditSalary(form.role)

  const toggleActive = async (u: UserRow) => {
    try {
      setProcessingUserId(u.id)
      const res = await fetch(`/api/company/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !u.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo actualizar')
      addNotification({
        type: 'success',
        title: 'Usuario actualizado',
        message: u.email,
      })
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x))
      )
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setProcessingUserId(null)
    }
  }

  const fillGeneratedPassword = (
    setterPass: (v: string) => void,
    setterConfirm: (v: string) => void
  ) => {
    try {
      const p = generateSecurePassword()
      setterPass(p)
      setterConfirm(p)
    } catch {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo generar una contraseña en este entorno.',
      })
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
        mode: useManualPasswordOnCreate ? 'password' : 'invite',
        can_view_salary: createEditSalaryLocked ? true : createCanViewSalary,
        module_grants: createModuleGrants,
      }
      if (useManualPasswordOnCreate) body.password = form.password

      const res = await fetch('/api/company/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo crear')
      addNotification({
        type: 'success',
        title: data?.invite_sent ? 'Invitación enviada' : 'Usuario creado',
        message: data?.message || form.email,
      })
      setShowCreate(false)
      setUseManualPasswordOnCreate(false)
      setForm({ email: '', password: '', passwordConfirm: '', role: 'employee' })
      setCreateCanViewSalary(false)
      setCreateModuleGrants(emptyModuleGrants(features))
      setPage(1)
      await reloadUsers(1, pageSize)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const openUserDetails = async (user: UserRow) => {
    setSelectedUser(user)
    setLoadingDetails(true)
    try {
      const res = await fetch(`/api/company/users/${user.id}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error cargando detalles')
      setUserDetails(data.user)
      if (data.features) setFeatures(data.features)
      const role = (data.user.role || 'employee') as CompanyManagedRole
      setEditRole(isManaged(role) ? role : 'employee')
      const perms = data.user.permissions || {}
      setEditCanViewSalary(perms.can_view_salary === true)
      setEditModuleGrants(
        data.user.module_grants || emptyModuleGrants(data.features || features)
      )
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
      setUserDetails(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const isManaged = (r: string): r is CompanyManagedRole =>
    (COMPANY_MANAGED_ROLES as readonly string[]).includes(r)

  const saveUserDetails = async () => {
    if (!selectedUser) return
    setSavingDetails(true)
    try {
      const res = await fetch(`/api/company/users/${selectedUser.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          can_view_salary: roleCanEditSalary(editRole) ? true : editCanViewSalary,
          module_grants: editModuleGrants,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo guardar')
      addNotification({ type: 'success', title: 'Guardado', message: 'Rol y permisos actualizados' })
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: editRole } : u))
      )
      setUserDetails((prev: any) =>
        prev ? { ...prev, role: editRole, permissions: data.user?.permissions } : prev
      )
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setSavingDetails(false)
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
      const res = await fetch(
        `/api/company/users/${resetModalUser.id}?action=reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ new_password: resetPassword }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo resetear')
      addNotification({
        type: 'success',
        title: 'Contraseña actualizada',
        message: resetModalUser.email,
      })
      setResetModalUser(null)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setResetSubmitting(false)
    }
  }

  const submitSendRecoveryLink = async () => {
    if (!resetModalUser) return
    try {
      setResetSubmitting(true)
      const res = await fetch(
        `/api/company/users/${resetModalUser.id}?action=send-recovery-link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo enviar')
      addNotification({
        type: 'success',
        title: 'Correo enviado',
        message: data?.message || '',
      })
      setResetModalUser(null)
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setResetSubmitting(false)
    }
  }

  const ModuleToggles = useMemo(() => {
    const ModuleTogglesInner = ({
      grants,
      onChange,
      disabled,
    }: {
      grants: Record<CompanyModuleKey, ModuleGrant>
      onChange: (next: Record<CompanyModuleKey, ModuleGrant>) => void
      disabled?: boolean
    }) => (
      <div className="space-y-2">
        <p className="text-sm text-white/80 font-medium">Módulos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COMPANY_MODULE_DEFS.map((def) => {
            const enabled = isModuleEnabledByFeatures(def.key, features)
            const g = grants[def.key] || { view: false, manage: false }
            return (
              <div
                key={def.key}
                className={`rounded-md border px-3 py-2 text-sm ${
                  enabled ? 'border-white/15 bg-white/5' : 'border-white/10 bg-white/[0.02] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/90">{def.label}</span>
                  {!enabled && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-200/80">
                      Plan
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-white/70">
                    <input
                      type="checkbox"
                      disabled={disabled || !enabled}
                      checked={!!g.view}
                      onChange={(e) =>
                        onChange({
                          ...grants,
                          [def.key]: {
                            ...g,
                            view: e.target.checked,
                            manage: e.target.checked ? g.manage : false,
                          },
                        })
                      }
                    />
                    Ver
                  </label>
                  {def.manageKey && (
                    <label className="flex items-center gap-1.5 text-xs text-white/70">
                      <input
                        type="checkbox"
                        disabled={disabled || !enabled || !g.view}
                        checked={!!g.manage}
                        onChange={(e) =>
                          onChange({
                            ...grants,
                            [def.key]: {
                              ...g,
                              manage: e.target.checked,
                              view: e.target.checked ? true : g.view,
                            },
                          })
                        }
                      />
                      Gestionar
                    </label>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
    return ModuleTogglesInner
  }, [features])

  if (authLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!canManage) {
    return (
      <ProtectedRoute>
        <Head>
          <title>Usuarios de la empresa</title>
        </Head>
        <DashboardLayout>
          <div className="p-6 space-y-4">
            <Card variant="liquid" className="border-white/15">
              <CardContent className="pt-6 space-y-3">
                <h1 className="text-xl font-semibold text-white">Usuarios</h1>
                <p className="text-white/70 text-sm">
                  Solo <strong className="text-white/90">Admin empresa</strong> y{' '}
                  <strong className="text-white/90">HR Manager</strong> pueden gestionar usuarios.
                  Tu rol actual: {ROLE_LABELS[actorRole || ''] || actorRole || 'sin rol'}.
                </p>
                <Link href="/app/settings" className="inline-block text-sm text-white/80 hover:text-white underline">
                  Volver a Parámetros
                </Link>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>Usuarios de la empresa</title>
      </Head>
      <DashboardLayout>
        <div className="p-6 space-y-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/app/settings"
                className="text-xs text-white/60 hover:text-white/90 transition-colors"
              >
                ← Parámetros
              </Link>
              <h1 className="text-2xl font-bold mt-1">Usuarios</h1>
              <p className="text-gray-300 text-sm">
                Crea y gestiona usuarios de tu empresa (roles, módulos y acceso a salarios)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setPage(1)
                  setSearch(e.target.value)
                }}
                placeholder="Buscar email o nombre"
                className="input-glass w-56 text-white placeholder:text-white/50"
              />
              <select
                className="input-glass text-sm text-white"
                value={roleFilter}
                onChange={(e) => {
                  setPage(1)
                  setRoleFilter(e.target.value)
                }}
              >
                <option value="">Todos los roles</option>
                {COMPANY_MANAGED_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <select
                className="input-glass text-sm text-white"
                value={stateFilter}
                onChange={(e) => {
                  setPage(1)
                  setStateFilter(e.target.value)
                }}
              >
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <Button
                type="button"
                onClick={() => {
                  setShowCreate(true)
                  setCreateModuleGrants(emptyModuleGrants(features))
                }}
              >
                Nuevo usuario
              </Button>
            </div>
          </div>

          {error && (
            <Card variant="liquid" className="border-red-400/40 bg-red-500/10">
              <CardContent className="pt-4 text-red-100 text-sm">{error}</CardContent>
            </Card>
          )}

          {showCreate && (
            <Card variant="liquid" className="border-white/20">
              <CardHeader>
                <CardTitle className="text-base text-white">Crear usuario</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createUser} className="space-y-4">
                  <div className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80">
                    Por defecto se envía invitación por correo. La empresa se asigna automáticamente
                    a la tuya.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/80 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        className="input-glass w-full text-white"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/80 mb-1">Rol</label>
                      <select
                        className="input-glass w-full text-white"
                        value={form.role}
                        onChange={(e) => {
                          const role = e.target.value as CompanyManagedRole
                          setForm({ ...form, role })
                          if (roleCanEditSalary(role)) setCreateCanViewSalary(true)
                        }}
                      >
                        {COMPANY_MANAGED_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useManualPasswordOnCreate}
                      onChange={(e) => setUseManualPasswordOnCreate(e.target.checked)}
                    />
                    Establecer contraseña manualmente (avanzado)
                  </label>

                  {useManualPasswordOnCreate && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Contraseña</label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          className="input-glass w-full text-white"
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
                        <label className="block text-sm text-white/80 mb-1">Confirmar</label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          className="input-glass w-full text-white"
                          value={form.passwordConfirm}
                          onChange={(e) =>
                            setForm({ ...form, passwordConfirm: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}

                  <ModuleToggles
                    grants={createModuleGrants}
                    onChange={setCreateModuleGrants}
                  />

                  <div className="rounded-md border border-white/15 bg-white/5 px-3 py-3 space-y-2">
                    <p className="text-sm text-white/80 font-medium">Salarios</p>
                    {createEditSalaryLocked ? (
                      <p className="text-xs text-white/60">
                        Este rol puede ver y editar salarios por definición.
                      </p>
                    ) : (
                      <label className="flex items-center gap-2 text-sm text-white/80">
                        <input
                          type="checkbox"
                          checked={createCanViewSalary}
                          onChange={(e) => setCreateCanViewSalary(e.target.checked)}
                        />
                        Puede ver salarios
                      </label>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {useManualPasswordOnCreate ? 'Crear usuario' : 'Enviar invitación'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                      onClick={() => setShowCreate(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card variant="liquid" className="border-white/10">
            <CardHeader>
              <CardTitle className="text-base text-white">Listado ({totalUsers})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 bg-white/5 animate-pulse rounded-md border border-white/10"
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((u) => (
                      <Card
                        key={u.id}
                        variant="liquid"
                        className="border-white/10 cursor-pointer hover:border-white/30 transition-colors"
                        onClick={() => openUserDetails(u)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base text-white">
                            <span className="truncate">{u.name || u.email}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                u.is_active
                                  ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40'
                                  : 'bg-gray-500/20 text-gray-300 border border-gray-400/40'
                              }`}
                            >
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-white/70 space-y-1">
                            <div>
                              Email: <span className="text-white/90">{u.email || '—'}</span>
                            </div>
                            <div>
                              Rol:{' '}
                              <span className="text-white/90">
                                {ROLE_LABELS[u.role] || u.role}
                              </span>
                            </div>
                            <div>
                              Último login:{' '}
                              <span className="text-white/90">
                                {u.last_login
                                  ? new Date(u.last_login).toLocaleString('es-HN')
                                  : '—'}
                              </span>
                            </div>
                          </div>
                          <div
                            className="mt-3 flex gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleActive(u)}
                              disabled={processingUserId === u.id}
                              className="border-white/30 text-white hover:bg-white/10"
                            >
                              {u.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResetModalUser(u)
                                setResetPassword('')
                                setResetPasswordConfirm('')
                                setResetShowManual(false)
                              }}
                              className="border-white/30 text-white hover:bg-white/10"
                            >
                              Restablecer acceso
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                    <div className="text-sm text-white/70">
                      Página {page} de {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        Siguiente
                      </Button>
                      <select
                        className="input-glass text-sm text-white"
                        value={pageSize}
                        onChange={(e) => {
                          setPage(1)
                          setPageSize(Number(e.target.value))
                        }}
                      >
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

          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <Card variant="liquid" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-white/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white text-lg">
                    {selectedUser.name || selectedUser.email}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white"
                    onClick={() => {
                      setSelectedUser(null)
                      setUserDetails(null)
                    }}
                  >
                    Cerrar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingDetails ? (
                    <p className="text-white/70 text-sm">Cargando…</p>
                  ) : (
                    <>
                      <p className="text-sm text-white/70">
                        Email:{' '}
                        <span className="text-white/90">
                          {userDetails?.email || selectedUser.email}
                        </span>
                      </p>
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Rol</label>
                        <select
                          className="input-glass w-full text-white"
                          value={editRole}
                          onChange={(e) => {
                            const role = e.target.value as CompanyManagedRole
                            setEditRole(role)
                            if (roleCanEditSalary(role)) setEditCanViewSalary(true)
                          }}
                          disabled={selectedUser.id === userProfile?.id}
                        >
                          {COMPANY_MANAGED_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <ModuleToggles
                        grants={editModuleGrants}
                        onChange={setEditModuleGrants}
                        disabled={savingDetails}
                      />

                      <div className="rounded-md border border-white/15 bg-white/5 px-3 py-3 space-y-2">
                        <p className="text-sm text-white/80 font-medium">Salarios</p>
                        {roleCanEditSalary(editRole) ? (
                          <p className="text-xs text-white/60">
                            Ver y editar salarios (por rol).
                          </p>
                        ) : (
                          <label className="flex items-center gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={editCanViewSalary}
                              onChange={(e) => setEditCanViewSalary(e.target.checked)}
                            />
                            Puede ver salarios
                          </label>
                        )}
                      </div>

                      <Button type="button" onClick={saveUserDetails} disabled={savingDetails}>
                        {savingDetails ? 'Guardando…' : 'Guardar cambios'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {resetModalUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <Card variant="liquid" className="w-full max-w-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Restablecer acceso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-white/70">{resetModalUser.email}</p>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={resetSubmitting}
                    onClick={submitSendRecoveryLink}
                  >
                    Enviar enlace de recuperación
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-white/50 hover:text-white/80 underline"
                    onClick={() => setResetShowManual((v) => !v)}
                  >
                    {resetShowManual ? 'Ocultar' : 'Establecer contraseña manualmente'}
                  </button>
                  {resetShowManual && (
                    <form onSubmit={submitResetPassword} className="space-y-3">
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Nueva contraseña</label>
                        <input
                          type="password"
                          required
                          className="input-glass w-full text-white"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                        />
                        <PasswordStrengthHint password={resetPassword} />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 border-white/30 text-white text-xs h-8"
                          onClick={() =>
                            fillGeneratedPassword(setResetPassword, setResetPasswordConfirm)
                          }
                        >
                          Generar
                        </Button>
                      </div>
                      <div>
                        <label className="block text-sm text-white/80 mb-1">Confirmar</label>
                        <input
                          type="password"
                          required
                          className="input-glass w-full text-white"
                          value={resetPasswordConfirm}
                          onChange={(e) => setResetPasswordConfirm(e.target.value)}
                        />
                      </div>
                      <Button type="submit" disabled={resetSubmitting} className="w-full">
                        Guardar contraseña
                      </Button>
                    </form>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/30 text-white"
                    disabled={resetSubmitting}
                    onClick={() => setResetModalUser(null)}
                  >
                    Cancelar
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
