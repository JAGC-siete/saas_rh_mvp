import { useState, useEffect, useCallback, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { markdownToHtml } from '../../../lib/recursos/markdown'
import { normalizeSlug, type RecursoStatus, type RecursoCategory } from '../../../lib/recursos/validation'
import { RECURSO_CATEGORY_META } from '../../../lib/recursos/categories'
import type { RecursoAdminItem } from '../../../lib/recursos/admin'
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ExternalLink,
  AlertCircle,
  Eye,
  FileText,
} from 'lucide-react'

type StatusFilter = 'all' | RecursoStatus

interface RecursoFormData {
  slug: string
  title: string
  description: string
  content: string
  datePublished: string
  image: string
  author: string
  status: RecursoStatus
  category: RecursoCategory
}

const emptyForm = (): RecursoFormData => ({
  slug: '',
  title: '',
  description: '',
  content: '',
  datePublished: new Date().toISOString().slice(0, 10),
  image: '',
  author: 'Licenciado Jorge Arturo Gómez Coello',
  status: 'draft',
  category: 'rrhh',
})

function toFormData(recurso: RecursoAdminItem): RecursoFormData {
  return {
    slug: recurso.slug,
    title: recurso.title,
    description: recurso.description,
    content: recurso.content,
    datePublished: recurso.datePublished.slice(0, 10),
    image: recurso.image ?? '',
    author: recurso.author ?? '',
    status: recurso.status,
    category: recurso.category,
  }
}

function StatusBadge({ status }: { status: RecursoStatus }) {
  if (status === 'published') {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40">
        Publicado
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/40">
      Borrador
    </Badge>
  )
}

export default function RecursosAdminPage() {
  const { addNotification } = useNotificationContext()
  const [recursos, setRecursos] = useState<RecursoAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<RecursoFormData | null>(null)
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const fetchRecursos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/recursos', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar artículos')
      }
      setRecursos(data.recursos ?? [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar artículos'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecursos()
  }, [fetchRecursos])

  const filteredRecursos = useMemo(() => {
    if (statusFilter === 'all') return recursos
    return recursos.filter((r) => r.status === statusFilter)
  }, [recursos, statusFilter])

  const previewHtml = useMemo(() => {
    if (!formData?.content) return ''
    try {
      return markdownToHtml(formData.content)
    } catch {
      return '<p>Error al renderizar preview</p>'
    }
  }, [formData?.content])

  const handleCreate = () => {
    setIsCreating(true)
    setEditingSlug(null)
    setFormData(emptyForm())
    setPreviewMode('edit')
    setSlugTouched(false)
  }

  const handleEdit = (recurso: RecursoAdminItem) => {
    setIsCreating(false)
    setEditingSlug(recurso.slug)
    setFormData(toFormData(recurso))
    setPreviewMode('edit')
    setSlugTouched(true)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingSlug(null)
    setFormData(null)
    setPreviewMode('edit')
    setSlugTouched(false)
  }

  const handleTitleChange = (title: string) => {
    if (!formData) return
    const next: RecursoFormData = { ...formData, title }
    if (isCreating && !slugTouched) {
      next.slug = normalizeSlug(title)
    }
    setFormData(next)
  }

  const handleSave = async (statusOverride?: RecursoStatus) => {
    if (!formData) return

    setSaving(true)
    setError(null)

    const payload = {
      ...formData,
      status: statusOverride ?? formData.status,
      datePublished: new Date(formData.datePublished).toISOString(),
      image: formData.image.trim() || undefined,
      author: formData.author.trim() || undefined,
    }

    try {
      const url = isCreating
        ? '/api/admin/recursos'
        : `/api/admin/recursos/${encodeURIComponent(editingSlug!)}`
      const method = isCreating ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar')
      }

      await fetchRecursos()
      handleCancel()
      addNotification({
        type: 'success',
        title: isCreating ? 'Artículo creado' : 'Artículo actualizado',
        message: `"${payload.title}" guardado correctamente`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      setError(message)
      addNotification({ type: 'error', title: 'Error', message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (recurso: RecursoAdminItem) => {
    if (!confirm(`¿Eliminar "${recurso.title}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/recursos/${encodeURIComponent(recurso.slug)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar')
      }
      await fetchRecursos()
      if (editingSlug === recurso.slug) {
        handleCancel()
      }
      addNotification({
        type: 'success',
        title: 'Artículo eliminado',
        message: `"${recurso.title}" fue eliminado`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar'
      addNotification({ type: 'error', title: 'Error', message })
    }
  }

  const showForm = isCreating || editingSlug !== null

  return (
    <SuperAdminGuard redirectPath="/app/admin/recursos">
      <SuperAdminLayout>
        <Head>
          <title>Recursos SEO - Super Admin</title>
          <meta name="description" content="Gestión de artículos públicos en /recursos" />
        </Head>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Contenido SEO</p>
              <h1 className="text-3xl font-semibold text-white flex items-center gap-3 mt-1">
                <BookOpen className="h-8 w-8" />
                Recursos SEO
              </h1>
              <p className="text-white/70 mt-2">
                Artículos públicos en <code className="text-white/90">/recursos</code> para posicionamiento orgánico
              </p>
            </div>
            {!showForm && (
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo artículo
              </Button>
            )}
          </div>

          {error && (
            <Card variant="liquid" className="border-red-400/40 bg-red-500/10">
              <CardContent className="pt-4 flex items-center gap-3 text-red-100 text-sm">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          {showForm && formData && (
            <Card variant="liquid" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">
                  {isCreating ? 'Nuevo artículo' : `Editar: ${formData.title}`}
                </CardTitle>
                <CardDescription className="text-white/60">
                  El contenido se guarda en Markdown. Los borradores no son visibles en el sitio público.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Título</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                      placeholder="Cómo automatizar la nómina..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Slug (URL)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      readOnly={!isCreating}
                      onChange={(e) => {
                        setSlugTouched(true)
                        setFormData({ ...formData, slug: normalizeSlug(e.target.value) })
                      }}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-60"
                      placeholder="automatizacion-nomina-honduras"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Descripción (meta SEO)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                    placeholder="Resumen breve para buscadores y listado..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Colección</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as RecursoCategory,
                      })
                    }
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                  >
                    <option value="rrhh" className="bg-slate-900">
                      {RECURSO_CATEGORY_META.rrhh.hubTitle}
                    </option>
                    <option value="responsabilidad-individual" className="bg-slate-900">
                      {RECURSO_CATEGORY_META['responsabilidad-individual'].hubTitle}
                    </option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Autor</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Fecha de publicación</label>
                    <input
                      type="date"
                      value={formData.datePublished}
                      onChange={(e) => setFormData({ ...formData, datePublished: e.target.value })}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Imagen OG (URL)</label>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex gap-2 border-b border-white/10 pb-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('edit')}
                    className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 ${
                      previewMode === 'edit'
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('preview')}
                    className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 ${
                      previewMode === 'preview'
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>
                </div>

                {previewMode === 'edit' ? (
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={16}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white font-mono text-sm"
                    placeholder="## Introducción&#10;&#10;Escribe el artículo en Markdown..."
                  />
                ) : (
                  <div
                    className="prose prose-invert prose-lg max-w-none min-h-[320px] rounded-lg border border-white/10 bg-white/5 p-4 text-brand-200"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={() => handleSave('draft')}
                    disabled={saving}
                    variant="outline"
                    className="input-glass text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar borrador
                  </Button>
                  <Button
                    onClick={() => handleSave('published')}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Publicar
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={saving}
                    variant="outline"
                    className="input-glass text-white"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!showForm && (
            <>
              <div className="flex flex-wrap gap-2">
                {(['all', 'draft', 'published'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      statusFilter === filter
                        ? 'bg-blue-600/30 border-blue-400/50 text-white'
                        : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'
                    }`}
                  >
                    {filter === 'all' ? 'Todos' : filter === 'draft' ? 'Borradores' : 'Publicados'}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              ) : filteredRecursos.length === 0 ? (
                <Card variant="liquid" className="border-white/10">
                  <CardContent className="pt-6 text-center py-12">
                    <BookOpen className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/70 text-lg mb-2">No hay artículos</p>
                    <p className="text-white/50 text-sm mb-4">
                      Crea el primer artículo para la sección /recursos
                    </p>
                    <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear artículo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredRecursos.map((recurso) => (
                    <Card key={recurso.id} variant="liquid" className="border-white/10">
                      <CardContent className="pt-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h2 className="text-lg font-semibold text-white">{recurso.title}</h2>
                              <StatusBadge status={recurso.status} />
                              <Badge className="bg-white/10 text-white/80 border-white/20">
                                {RECURSO_CATEGORY_META[recurso.category].hubTitle}
                              </Badge>
                            </div>
                            <p className="text-white/50 text-sm font-mono mb-2">/recursos/{recurso.slug}</p>
                            <p className="text-white/70 text-sm line-clamp-2">{recurso.description}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/50">
                              {recurso.author && <span>{recurso.author}</span>}
                              <time dateTime={recurso.datePublished}>
                                {new Date(recurso.datePublished).toLocaleDateString('es-HN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </time>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recurso.status === 'published' && (
                              <Link
                                href={`/recursos/${recurso.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="input-glass text-white"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                              </Link>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(recurso)}
                              className="input-glass text-white"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(recurso)}
                              className="border-red-400/40 text-red-200 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
