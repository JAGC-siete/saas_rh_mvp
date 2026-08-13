import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { Info, Loader2, Save } from 'lucide-react'

type FieldRow = {
  field_key: string
  module_key: string
  name: string
  description: string | null
  default_display_mode: string
}

type PermissionRow = {
  role: string
  field_key: string
  access_level: 'none' | 'read' | 'write'
  display_mode: 'hidden' | 'masked' | 'locked'
}

const ROLE_ORDER = ['super_admin', 'admin', 'company_admin', 'hr_manager', 'manager', 'employee'] as const

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  company_admin: 'Admin Empresa',
  hr_manager: 'RRHH',
  manager: 'Supervisor',
  employee: 'Empleado',
}

const ACCESS_OPTIONS = [
  { value: 'none', label: 'Ninguno' },
  { value: 'read', label: 'Ver' },
  { value: 'write', label: 'Editar' },
] as const

const DISPLAY_OPTIONS = [
  { value: 'masked', label: 'Enmascarar' },
  { value: 'hidden', label: 'Ocultar' },
  { value: 'locked', label: 'Bloqueado' },
] as const

export default function RoleFieldPermissionsAdminPage() {
  const { addNotification } = useNotificationContext()
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<FieldRow[]>([])
  const [links, setLinks] = useState<PermissionRow[]>([])
  const [draft, setDraft] = useState<Record<string, Record<string, { access_level: string; display_mode: string }>>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/role-field-permissions', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar')
      setFields(data.fields || [])
      setLinks(data.role_field_permissions || [])
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const next: Record<string, Record<string, { access_level: string; display_mode: string }>> = {}
    for (const role of ROLE_ORDER) {
      next[role] = {}
    }
    for (const l of links) {
      if (!next[l.role]) next[l.role] = {}
      next[l.role][l.field_key] = {
        access_level: l.access_level,
        display_mode: l.display_mode,
      }
    }
    setDraft(next)
  }, [links])

  const orderedFields = useMemo(() => fields, [fields])

  const cellKey = (role: string, fieldKey: string) => `${role}::${fieldKey}`

  const setCell = (role: string, fieldKey: string, patch: Partial<{ access_level: string; display_mode: string }>) => {
    setDraft((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [fieldKey]: {
          access_level: patch.access_level ?? prev[role]?.[fieldKey]?.access_level ?? 'none',
          display_mode: patch.display_mode ?? prev[role]?.[fieldKey]?.display_mode ?? 'masked',
        },
      },
    }))
  }

  const isDirty = (role: string, fieldKey: string) => {
    const d = draft[role]?.[fieldKey]
    const prev = links.find((l) => l.role === role && l.field_key === fieldKey)
    if (!d && !prev) return false
    if (!prev) return !!d
    return d.access_level !== prev.access_level || d.display_mode !== prev.display_mode
  }

  const saveCell = async (role: string, fieldKey: string) => {
    const d = draft[role]?.[fieldKey]
    if (!d) return
    const key = cellKey(role, fieldKey)
    setSavingKey(key)
    try {
      const res = await fetch('/api/admin/role-field-permissions', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          field_key: fieldKey,
          access_level: d.access_level,
          display_mode: d.display_mode,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      addNotification({ type: 'success', title: 'Guardado', message: `${ROLE_LABEL[role] || role} · ${fieldKey}` })
      await load()
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Error', message: e.message || 'No se pudo guardar' })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <>
      <Head>
        <title>Permisos de campo - Super Admin</title>
      </Head>
      <SuperAdminGuard>
        <SuperAdminLayout>
          <div className="space-y-6 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Seguridad</p>
              <h1 className="text-2xl font-bold mt-1">Permisos de campo por rol</h1>
              <p className="text-white/70 mt-1 max-w-3xl">
                Define qué roles pueden ver o editar campos sensibles (ej. salario). Los overrides por usuario
                en Usuarios tienen prioridad sobre esta matriz.
              </p>
            </div>

            <Card variant="liquid">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-amber-300" />
                  Matriz rol × campo
                </CardTitle>
                <CardDescription className="text-white/60">
                  Cuando el acceso es Ninguno, el modo visual controla cómo se presenta en la UI (enmascarado por defecto).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-white/70 py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cargando…
                  </div>
                ) : error ? (
                  <p className="text-red-300">{error}</p>
                ) : orderedFields.length === 0 ? (
                  <p className="text-white/60">No hay campos registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[900px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-2 text-white/60 font-medium">Campo</th>
                          {ROLE_ORDER.map((role) => (
                            <th key={role} className="text-left py-3 px-2 text-white/60 font-medium whitespace-nowrap">
                              {ROLE_LABEL[role] || role}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orderedFields.map((field) => (
                          <tr key={field.field_key} className="border-b border-white/5 align-top">
                            <td className="py-4 px-2">
                              <div className="font-medium text-white">{field.name}</div>
                              <div className="text-xs text-white/50 font-mono">{field.field_key}</div>
                            </td>
                            {ROLE_ORDER.map((role) => {
                              const cell = draft[role]?.[field.field_key] || {
                                access_level: 'none',
                                display_mode: field.default_display_mode || 'masked',
                              }
                              const dirty = isDirty(role, field.field_key)
                              const saving = savingKey === cellKey(role, field.field_key)
                              return (
                                <td key={`${field.field_key}-${role}`} className="py-4 px-2">
                                  <div className="space-y-2 min-w-[140px]">
                                    <select
                                      value={cell.access_level}
                                      onChange={(e) =>
                                        setCell(role, field.field_key, { access_level: e.target.value })
                                      }
                                      className="input-glass w-full text-white"
                                    >
                                      {ACCESS_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value} className="text-black">
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                    {cell.access_level === 'none' && (
                                      <select
                                        value={cell.display_mode}
                                        onChange={(e) =>
                                          setCell(role, field.field_key, { display_mode: e.target.value })
                                        }
                                        className="input-glass w-full text-white"
                                      >
                                        {DISPLAY_OPTIONS.map((o) => (
                                          <option key={o.value} value={o.value} className="text-black">
                                            {o.label}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!dirty || saving}
                                      onClick={() => saveCell(role, field.field_key)}
                                      className="input-glass w-full text-white"
                                    >
                                      {saving ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Save className="h-3 w-3 mr-1" />
                                          Guardar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </SuperAdminLayout>
      </SuperAdminGuard>
    </>
  )
}
