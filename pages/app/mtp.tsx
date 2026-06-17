import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Plus, Save, Sparkles, Trash2, Wand2 } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import AppRoleGate from '../../components/AppRoleGate'
import DashboardLayout from '../../components/DashboardLayout'
import { PAYROLL_NAV_ROLES } from '../../lib/auth/role-access'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { generateFinalFunction } from '../../lib/mtp/generator'
import type { MTPDraft, MTPItem } from '../../lib/mtp/schema'

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createEmptyItem(): MTPItem {
  return {
    id: newId(),
    rawIdea: '',
    actionVerb: '',
    task: '',
    standard: '',
    indicator: '',
    finalFunction: '',
    status: 'draft'
  }
}

const emptyDraft = {
  title: 'Nuevo perfil MTP',
  role_name: '',
  items: [createEmptyItem()]
}

export default function MTPPage() {
  const [drafts, setDrafts] = useState<MTPDraft[]>([])
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [title, setTitle] = useState(emptyDraft.title)
  const [roleName, setRoleName] = useState(emptyDraft.role_name)
  const [items, setItems] = useState<MTPItem[]>(emptyDraft.items)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [improvingId, setImprovingId] = useState<string | null>(null)

  const readyCount = useMemo(
    () => items.filter((item) => item.finalFunction.trim().length > 0).length,
    [items]
  )

  const fetchDrafts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mtp/drafts')
      if (!response.ok) {
        throw new Error('No se pudieron cargar los borradores MTP')
      }
      const data = await response.json()
      setDrafts(data.drafts ?? [])
    } catch (err: any) {
      setError(err?.message || 'Error cargando borradores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDrafts()
  }, [fetchDrafts])

  const loadDraft = (draft: MTPDraft) => {
    setSelectedDraftId(draft.id)
    setTitle(draft.title)
    setRoleName(draft.role_name)
    setItems((draft.items?.length ? draft.items : [createEmptyItem()]).map((item) => ({
      ...createEmptyItem(),
      ...item,
      id: item.id || newId()
    })))
    setMessage(`Borrador cargado: ${draft.title}`)
    setError(null)
  }

  const startNewDraft = () => {
    setSelectedDraftId(null)
    setTitle(emptyDraft.title)
    setRoleName('')
    setItems([createEmptyItem()])
    setMessage('Nuevo borrador listo')
    setError(null)
  }

  const updateItem = (id: string, patch: Partial<MTPItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const addItem = () => {
    setItems((current) => [...current, createEmptyItem()])
  }

  const removeItem = (id: string) => {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)))
  }

  const generateItem = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, finalFunction: generateFinalFunction(item), status: 'ready' }
          : item
      )
    )
  }

  const generateAll = () => {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        finalFunction: generateFinalFunction(item),
        status: generateFinalFunction(item) ? 'ready' : 'draft'
      }))
    )
  }

  const improveItem = async (item: MTPItem) => {
    try {
      setImprovingId(item.id)
      setMessage(null)
      setError(null)

      const response = await fetch('/api/mtp/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: roleName, item })
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setMessage(data.message || 'La mejora por IA no está disponible; se mantiene la función guiada.')
        return
      }

      updateItem(item.id, {
        finalFunction: data.improvedFunction,
        status: 'ready'
      })
      setMessage('Función mejorada con IA')
    } catch (err: any) {
      setError(err?.message || 'No se pudo mejorar la función con IA')
    } finally {
      setImprovingId(null)
    }
  }

  const saveDraft = async () => {
    try {
      setSaving(true)
      setMessage(null)
      setError(null)

      const payload = {
        title,
        role_name: roleName,
        department_id: null,
        status: 'draft',
        items
      }

      const response = await fetch('/api/mtp/drafts', {
        method: selectedDraftId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedDraftId ? { id: selectedDraftId, ...payload } : payload)
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo guardar el borrador')
      }

      const savedDraft = data.draft as MTPDraft
      setSelectedDraftId(savedDraft.id)
      setDrafts((current) => {
        const exists = current.some((draft) => draft.id === savedDraft.id)
        return exists
          ? current.map((draft) => (draft.id === savedDraft.id ? savedDraft : draft))
          : [savedDraft, ...current]
      })
      setMessage('Borrador guardado')
    } catch (err: any) {
      setError(err?.message || 'Error guardando borrador')
    } finally {
      setSaving(false)
    }
  }

  const deleteDraft = async () => {
    if (!selectedDraftId) return
    if (!window.confirm('¿Eliminar este borrador MTP?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/mtp/drafts?id=${selectedDraftId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'No se pudo eliminar el borrador')
      }
      setDrafts((current) => current.filter((draft) => draft.id !== selectedDraftId))
      startNewDraft()
      setMessage('Borrador eliminado')
    } catch (err: any) {
      setError(err?.message || 'Error eliminando borrador')
    } finally {
      setSaving(false)
    }
  }

  const copyFunctions = async () => {
    const text = items
      .map((item, index) => `${index + 1}. ${item.finalFunction}`)
      .filter((line) => !line.endsWith('. '))
      .join('\n')

    await navigator.clipboard.writeText(text)
    setMessage('Funciones copiadas al portapapeles')
  }

  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={PAYROLL_NAV_ROLES}>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-brand-500/20 p-2.5">
                <ClipboardList className="h-7 w-7 text-brand-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Matriz de Transformación de Puestos
                </h1>
                <p className="mt-1 max-w-3xl text-gray-300">
                  Convierte ideas crudas en funciones claras, accionables y evaluables para job descriptions.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={startNewDraft}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo
              </Button>
              <Button variant="secondary" onClick={generateAll}>
                <Wand2 className="mr-2 h-4 w-4" />
                Generar todo
              </Button>
              <Button onClick={saveDraft} disabled={saving || !title.trim() || !roleName.trim()}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>

          {(message || error) && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                error
                  ? 'border-red-500/40 bg-red-500/10 text-red-200'
                  : 'border-brand-400/40 bg-brand-500/10 text-brand-100'
              }`}
            >
              {error || message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
            <Card variant="liquid">
              <CardHeader>
                <CardTitle className="text-white">Borradores</CardTitle>
                <CardDescription className="text-gray-300">
                  {loading ? 'Cargando...' : `${drafts.length} borradores guardados`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {drafts.length === 0 && !loading && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                    Aún no hay borradores MTP guardados.
                  </div>
                )}
                {drafts.map((draft) => (
                  <button
                    key={draft.id}
                    onClick={() => loadDraft(draft)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedDraftId === draft.id
                        ? 'border-brand-400 bg-brand-500/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium text-white">{draft.title}</div>
                    <div className="mt-1 text-xs text-gray-300">
                      {draft.role_name} · v{draft.version}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card variant="liquid">
                <CardHeader>
                  <CardTitle className="text-white">Datos del perfil</CardTitle>
                  <CardDescription className="text-gray-300">
                    Define el rol antes de redactar funciones evaluables.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-200">Título del borrador</label>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="border-white/20 bg-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-200">Rol / puesto</label>
                    <Input
                      value={roleName}
                      onChange={(event) => setRoleName(event.target.value)}
                      placeholder="Ej. Cocinero de línea"
                      className="border-white/20 bg-white/10 text-white"
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap items-center gap-3 text-sm text-gray-300">
                    <span>{items.length} filas MTP</span>
                    <span>{readyCount} funciones listas</span>
                    <Button variant="outline" size="sm" onClick={copyFunctions} disabled={readyCount === 0}>
                      Copiar funciones
                    </Button>
                    {selectedDraftId && (
                      <Button variant="destructive" size="sm" onClick={deleteDraft} disabled={saving}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={item.id} variant="liquid">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg text-white">Función {index + 1}</CardTitle>
                          <CardDescription className="text-gray-300">
                            Idea + verbo + estándar + KR = función evaluable.
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-200">1. Idea cruda</label>
                        <Textarea
                          value={item.rawIdea}
                          onChange={(event) => updateItem(item.id, { rawIdea: event.target.value })}
                          placeholder="Ej. Que la comida salga rápido."
                          className="border-white/20 bg-white/10 text-white"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-200">2. Verbo de acción</label>
                          <Input
                            value={item.actionVerb}
                            onChange={(event) => updateItem(item.id, { actionVerb: event.target.value })}
                            placeholder="Ej. Ensamblar"
                            className="border-white/20 bg-white/10 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-200">Tarea específica</label>
                          <Input
                            value={item.task}
                            onChange={(event) => updateItem(item.id, { task: event.target.value })}
                            placeholder="Ej. y despachar órdenes"
                            className="border-white/20 bg-white/10 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-200">3. Estándar / frecuencia</label>
                          <Textarea
                            value={item.standard}
                            onChange={(event) => updateItem(item.id, { standard: event.target.value })}
                            placeholder="Ej. en menos de 12 minutos tras la impresión de la comanda"
                            className="border-white/20 bg-white/10 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-200">4. Indicador / KR</label>
                          <Textarea
                            value={item.indicator}
                            onChange={(event) => updateItem(item.id, { indicator: event.target.value })}
                            placeholder="Ej. mantener el tiempo promedio de despacho por debajo de 12 minutos"
                            className="border-white/20 bg-white/10 text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <label className="block text-sm font-medium text-gray-200">Función final</label>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => generateItem(item.id)}>
                              <Wand2 className="mr-2 h-4 w-4" />
                              Generar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => improveItem(item)}
                              disabled={improvingId === item.id}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              {improvingId === item.id ? 'Mejorando...' : 'Mejorar IA'}
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={item.finalFunction}
                          onChange={(event) => updateItem(item.id, { finalFunction: event.target.value })}
                          placeholder="La función final aparecerá aquí."
                          className="min-h-[110px] border-white/20 bg-black/20 text-white"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button variant="outline" onClick={addItem} disabled={items.length >= 50}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar función
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
