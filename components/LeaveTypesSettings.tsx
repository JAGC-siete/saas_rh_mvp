import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import type { LeaveType } from '../lib/types/leave'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'

type LeaveTypeDraft = Pick<
  LeaveType,
  | 'id'
  | 'name'
  | 'max_days_per_year'
  | 'is_paid'
  | 'requires_approval'
  | 'color'
  | 'employee_self_service'
  | 'is_statutory_art95'
  | 'is_statutory'
>

function toDraft(t: LeaveType): LeaveTypeDraft {
  return {
    id: t.id,
    name: t.name,
    max_days_per_year: t.max_days_per_year,
    is_paid: t.is_paid !== false,
    requires_approval: t.requires_approval !== false,
    color: t.color || '#3498db',
    employee_self_service: t.employee_self_service === true,
    is_statutory_art95: t.is_statutory_art95 === true,
    is_statutory: t.is_statutory === true,
  }
}

interface LeaveTypesSettingsProps {
  companyId: string | null
}

export default function LeaveTypesSettings({ companyId }: LeaveTypesSettingsProps) {
  const { userProfile } = useAuth()
  const [rows, setRows] = useState<LeaveType[]>([])
  const [drafts, setDrafts] = useState<Record<string, LeaveTypeDraft>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [newRow, setNewRow] = useState({
    name: '',
    max_days_per_year: '' as string | number,
    is_paid: true,
    is_statutory: false,
    requires_approval: true,
    employee_self_service: false,
    is_statutory_art95: false,
  })

  const canEdit = useMemo(() => {
    const r = userProfile?.role
    return r === 'super_admin' || r === 'company_admin' || r === 'hr_manager'
  }, [userProfile?.role])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/leave/types')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'Error al cargar tipos')
      let list: LeaveType[] = json.data || []
      if (companyId && userProfile?.role !== 'super_admin') {
        list = list.filter((t) => t.company_id === companyId)
      } else if (companyId && userProfile?.role === 'super_admin') {
        list = list.filter((t) => t.company_id === companyId)
      }
      setRows(list)
      const next: Record<string, LeaveTypeDraft> = {}
      for (const t of list) next[t.id] = toDraft(t)
      setDrafts(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [companyId, userProfile?.role])

  useEffect(() => {
    void load()
  }, [load])

  const updateDraft = (id: string, partial: Partial<LeaveTypeDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...partial },
    }))
  }

  const saveOne = async (id: string) => {
    const d = drafts[id]
    if (!d || !canEdit) return
    setSavingId(id)
    setError(null)
    try {
      const res = await fetch('/api/leave/types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: d.name,
          max_days_per_year:
            d.max_days_per_year === undefined || d.max_days_per_year === null
              ? null
              : Number(d.max_days_per_year),
          is_paid: d.is_paid,
          requires_approval: d.requires_approval,
          color: d.color,
          employee_self_service: d.employee_self_service,
          is_statutory_art95: d.is_statutory_art95,
          is_statutory: d.is_statutory,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'No se pudo guardar')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingId(null)
    }
  }

  const createType = async () => {
    if (!canEdit || !newRow.name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const body = {
        name: newRow.name.trim(),
        max_days_per_year:
          newRow.max_days_per_year === '' || newRow.max_days_per_year === undefined
            ? null
            : Number(newRow.max_days_per_year),
        is_paid: newRow.is_paid,
        requires_approval: newRow.requires_approval,
        color: '#3498db',
        employee_self_service: newRow.employee_self_service,
        is_statutory_art95: newRow.is_statutory_art95,
        is_statutory: newRow.is_statutory,
      }
      const res = await fetch('/api/leave/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'No se pudo crear')
      await load()
      setNewRow({
        name: '',
        max_days_per_year: '',
        is_paid: true,
        is_statutory: false,
        requires_approval: true,
        employee_self_service: false,
        is_statutory_art95: false,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear')
    } finally {
      setCreating(false)
    }
  }

  if (!companyId) {
    return (
      <Card variant="liquid" className="p-6">
        <CardContent className="text-center text-gray-300 text-sm">
          Se requiere una empresa en el perfil para administrar tipos de permiso.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-6 w-6 text-brand-400" />
            Parámetros de permisos
          </h3>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Defina tipos por ley o por política de la empresa, si son pagados, límites anuales y si el empleado puede
            solicitarlos desde el portal. Art. 95 CT marca cupos especiales de licencia con goce.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading} className="text-white border-white/20">
          {loading ? 'Actualizando…' : 'Recargar'}
        </Button>
      </div>

      {!canEdit && (
        <Card variant="liquid" className="p-4 border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">
            Solo administrador de empresa o RRHH pueden crear o editar tipos. Puede revisar el catálogo actual.
          </p>
        </Card>
      )}

      {error && (
        <Card variant="liquid" className="p-4 border border-red-500/30 bg-red-500/10">
          <p className="text-red-200 text-sm">{error}</p>
        </Card>
      )}

      {canEdit && (
        <Card variant="liquid" className="p-5 border border-white/15">
          <h4 className="text-md font-medium text-white mb-3">Nuevo tipo de permiso</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Nombre</label>
              <Input
                value={newRow.name}
                onChange={(e) => setNewRow((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Permiso por duelo"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tope anual (días)</label>
              <Input
                type="number"
                min={0}
                value={newRow.max_days_per_year === '' ? '' : String(newRow.max_days_per_year)}
                onChange={(e) =>
                  setNewRow((p) => ({
                    ...p,
                    max_days_per_year: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="Vacío = sin tope"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newRow.is_statutory}
                onChange={(e) => setNewRow((p) => ({ ...p, is_statutory: e.target.checked }))}
                className="rounded border-white/30 bg-white/10"
              />
              Tipo por ley / normativa
            </label>
            <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newRow.is_paid}
                onChange={(e) => setNewRow((p) => ({ ...p, is_paid: e.target.checked }))}
                className="rounded border-white/30 bg-white/10"
              />
              Pagado (con goce de salario)
            </label>
            <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newRow.requires_approval}
                onChange={(e) => setNewRow((p) => ({ ...p, requires_approval: e.target.checked }))}
                className="rounded border-white/30 bg-white/10"
              />
              Requiere aprobación
            </label>
            <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newRow.employee_self_service}
                onChange={(e) => setNewRow((p) => ({ ...p, employee_self_service: e.target.checked }))}
                className="rounded border-white/30 bg-white/10"
              />
              Visible en portal del empleado
            </label>
            <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newRow.is_statutory_art95}
                onChange={(e) => setNewRow((p) => ({ ...p, is_statutory_art95: e.target.checked }))}
                className="rounded border-white/30 bg-white/10"
              />
              Cupo Art. 95 CT (HN)
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => void createType()}
              disabled={creating || !newRow.name.trim()}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {creating ? 'Creando…' : 'Agregar tipo'}
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-gray-400 text-sm">Cargando tipos de permiso…</div>
      ) : rows.length === 0 ? (
        <Card variant="liquid" className="p-6">
          <p className="text-gray-300 text-sm text-center">
            No hay tipos configurados para esta empresa. Cree el catálogo desde el formulario superior o ejecute las
            migraciones / datos iniciales.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rows.map((t) => {
            const d = drafts[t.id]
            if (!d) return null
            const dirty =
              d.name !== t.name ||
              (d.max_days_per_year ?? null) !== (t.max_days_per_year ?? null) ||
              d.is_paid !== (t.is_paid !== false) ||
              d.requires_approval !== (t.requires_approval !== false) ||
              d.color !== (t.color || '#3498db') ||
              d.employee_self_service !== (t.employee_self_service === true) ||
              d.is_statutory_art95 !== (t.is_statutory_art95 === true) ||
              d.is_statutory !== (t.is_statutory === true)
            return (
              <Card key={t.id} variant="liquid" className="p-5 border border-white/15">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: d.color || '#3498db' }}
                      aria-hidden
                    />
                    <span className="text-xs text-gray-500 font-mono truncate max-w-[12rem]">{t.id.slice(0, 8)}…</span>
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveOne(t.id)}
                      disabled={!dirty || savingId === t.id}
                      className="bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40"
                    >
                      {savingId === t.id ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                    <Input
                      value={d.name}
                      disabled={!canEdit}
                      onChange={(e) => updateDraft(t.id, { name: e.target.value })}
                      className="bg-white/5 border-white/20 text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tope anual (días)</label>
                    <Input
                      type="number"
                      min={0}
                      disabled={!canEdit}
                      value={d.max_days_per_year === undefined || d.max_days_per_year === null ? '' : String(d.max_days_per_year)}
                      onChange={(e) =>
                        updateDraft(t.id, {
                          max_days_per_year: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className="bg-white/5 border-white/20 text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Color (hex)</label>
                    <Input
                      value={d.color}
                      disabled={!canEdit}
                      onChange={(e) => updateDraft(t.id, { color: e.target.value })}
                      className="bg-white/5 border-white/20 text-white disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={d.is_statutory}
                      onChange={(e) => updateDraft(t.id, { is_statutory: e.target.checked })}
                      className="rounded border-white/30 bg-white/10"
                    />
                    Por ley / normativa
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={d.is_paid}
                      onChange={(e) => updateDraft(t.id, { is_paid: e.target.checked })}
                      className="rounded border-white/30 bg-white/10"
                    />
                    Pagado
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={d.requires_approval}
                      onChange={(e) => updateDraft(t.id, { requires_approval: e.target.checked })}
                      className="rounded border-white/30 bg-white/10"
                    />
                    Requiere aprobación
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={d.employee_self_service}
                      onChange={(e) => updateDraft(t.id, { employee_self_service: e.target.checked })}
                      className="rounded border-white/30 bg-white/10"
                    />
                    Portal empleado
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={d.is_statutory_art95}
                      onChange={(e) => updateDraft(t.id, { is_statutory_art95: e.target.checked })}
                      className="rounded border-white/30 bg-white/10"
                    />
                    Art. 95 CT
                  </label>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
