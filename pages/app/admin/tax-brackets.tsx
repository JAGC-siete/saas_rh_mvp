import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useAuth } from '../../../lib/auth'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { useNotificationContext } from '../../../components/NotificationProvider'
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Calculator,
  AlertCircle,
  Save,
  X,
  Info
} from 'lucide-react'

interface TaxBracket {
  id: string
  year: number
  country_code: string
  is_active: boolean
  minimum_wage: number
  ihss_ceiling: number
  ihss_employee_rate: number
  rap_rate: number
  isr_brackets: Array<{
    limit: number
    rate: number
    base: number
    lower: number
  }>
  source: string
  notes?: string
  created_at: string
  updated_at: string
}

interface TaxBracketFormData {
  year: number
  minimum_wage: number
  ihss_ceiling: number
  ihss_employee_rate: number
  rap_rate: number
  isr_brackets: Array<{
    limit: number
    rate: number
    base: number
    lower: number
  }>
  source: string
  notes: string
}

export default function TaxBracketsPage() {
  const { userProfile } = useAuth()
  const { addNotification } = useNotificationContext()
  const [brackets, setBrackets] = useState<TaxBracket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<TaxBracketFormData | null>(null)
  const [previewSalary, setPreviewSalary] = useState<number>(30000)
  const [previewResult, setPreviewResult] = useState<{
    isr: number
    ihss: number
    rap: number
    total: number
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchBrackets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/tax-brackets/list', { credentials: 'include' })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar tablas')
      }
      
      setBrackets(data.brackets || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBrackets()
  }, [fetchBrackets])

  const handleEdit = (bracket: TaxBracket) => {
    setFormData({
      year: bracket.year,
      minimum_wage: bracket.minimum_wage,
      ihss_ceiling: bracket.ihss_ceiling,
      ihss_employee_rate: bracket.ihss_employee_rate,
      rap_rate: bracket.rap_rate,
      isr_brackets: bracket.isr_brackets.map(b => ({
        ...b,
        limit: b.limit === 999999999 ? Infinity : b.limit
      })),
      source: bracket.source,
      notes: bracket.notes || ''
    })
    setEditingYear(bracket.year)
    setIsCreating(false)
  }

  const handleCreate = () => {
    // Default values for new bracket
    setFormData({
      year: new Date().getFullYear() + 1,
      minimum_wage: 11903.13,
      ihss_ceiling: 11903.13,
      ihss_employee_rate: 0.05,
      rap_rate: 0.015,
      isr_brackets: [
        { limit: 21457.76, rate: 0.00, base: 0, lower: 0 },
        { limit: 30969.88, rate: 0.15, base: 0, lower: 21457.76 },
        { limit: 67604.36, rate: 0.20, base: 1428.32, lower: 30969.88 },
        { limit: Infinity, rate: 0.25, base: 8734.32, lower: 67604.36 }
      ],
      source: 'manual',
      notes: ''
    })
    setEditingYear(null)
    setIsCreating(true)
  }

  const handleCancel = () => {
    setFormData(null)
    setEditingYear(null)
    setIsCreating(false)
    setPreviewResult(null)
  }

  const calculatePreview = () => {
    if (!formData) return
    
    // Calculate ISR
    let isr = 0
    for (const bracket of formData.isr_brackets) {
      if (previewSalary <= bracket.limit) {
        if (bracket.rate === 0) {
          isr = 0
        } else if (bracket.base === 0) {
          isr = Math.max(0, (previewSalary - bracket.lower) * bracket.rate)
        } else {
          isr = bracket.base + Math.max(0, (previewSalary - bracket.lower) * bracket.rate)
        }
        break
      }
    }
    
    // Calculate IHSS
    const ihssBase = Math.min(previewSalary, formData.ihss_ceiling)
    const ihss = ihssBase * formData.ihss_employee_rate
    
    // Calculate RAP
    const rap = Math.max(0, previewSalary - formData.minimum_wage) * formData.rap_rate
    
    setPreviewResult({
      isr: Math.round(isr * 100) / 100,
      ihss: Math.round(ihss * 100) / 100,
      rap: Math.round(rap * 100) / 100,
      total: Math.round((isr + ihss + rap) * 100) / 100
    })
  }

  const handleSave = async () => {
    if (!formData) return
    
    try {
      setSaving(true)
      setError(null)
      const url = isCreating 
        ? '/api/admin/tax-brackets/create'
        : `/api/admin/tax-brackets/update?year=${editingYear}`
      
      const method = isCreating ? 'POST' : 'PUT'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar')
      }
      
      await fetchBrackets()
      handleCancel()
      addNotification({
        type: 'success',
        title: isCreating ? 'Tabla creada' : 'Tabla actualizada',
        message: `Tabla ISR ${formData.year} ${isCreating ? 'creada' : 'actualizada'} exitosamente`
      })
    } catch (err: any) {
      setError(err.message)
      addNotification({
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al guardar la tabla'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddBracket = () => {
    if (!formData) return
    
    const lastBracket = formData.isr_brackets[formData.isr_brackets.length - 1]
    const newBracket = {
      limit: lastBracket.limit === Infinity ? lastBracket.limit : lastBracket.limit * 1.5,
      rate: 0.25,
      base: 0,
      lower: lastBracket.limit === Infinity ? lastBracket.lower : lastBracket.limit
    }
    
    setFormData({
      ...formData,
      isr_brackets: [...formData.isr_brackets, newBracket]
    })
  }

  const handleRemoveBracket = (index: number) => {
    if (!formData || formData.isr_brackets.length <= 1) return
    
    setFormData({
      ...formData,
      isr_brackets: formData.isr_brackets.filter((_, i) => i !== index)
    })
  }

  const handleBracketChange = (index: number, field: string, value: number) => {
    if (!formData) return
    
    const updated = [...formData.isr_brackets]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, isr_brackets: updated })
  }

  return (
    <SuperAdminGuard redirectPath="/app/admin/tax-brackets">
      <SuperAdminLayout>
        <Head>
          <title>Tablas de Impuestos - Super Admin</title>
          <meta name="description" content="Gestión de tablas progresivas de ISR por año" />
        </Head>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Gestión fiscal</p>
              <h1 className="text-3xl font-semibold text-white flex items-center gap-3 mt-1">
                <FileText className="h-8 w-8" />
                Tablas de Impuestos (ISR)
              </h1>
              <p className="text-white/70 mt-2">
                Gestiona las tablas progresivas de impuestos por año para Honduras
              </p>
            </div>
            <Button 
              onClick={handleCreate} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tabla
            </Button>
          </div>

          {error && (
            <Card variant="glass" className="border-red-400/40 bg-red-500/10">
              <CardContent className="pt-4 flex items-center gap-3 text-red-100 text-sm">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : brackets.length === 0 ? (
            <Card variant="glass" className="border-white/10">
              <CardContent className="pt-6 text-center py-12">
                <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/70 text-lg mb-2">No hay tablas de impuestos configuradas</p>
                <p className="text-white/50 text-sm mb-4">
                  Crea la primera tabla para comenzar a gestionar los cálculos fiscales
                </p>
                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Tabla
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* List of existing brackets */}
              <div className="grid gap-4">
                {brackets.map((bracket) => (
                  <Card key={bracket.id} className="glass-strong border-white/10">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl">
                            Tabla ISR {bracket.year}
                          </CardTitle>
                          {bracket.is_active && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                              Activa
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(bracket)}
                          className="text-white/70 hover:text-white"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                      <CardDescription className="text-white/60">
                        {bracket.source === 'official' ? 'Oficial' : 'Manual'} • 
                        Creada: {new Date(bracket.created_at).toLocaleDateString()}
                        {bracket.notes && ` • ${bracket.notes}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div className="p-3 bg-white/5 rounded border border-white/10">
                          <span className="text-white/60 text-xs block mb-1">Salario Mínimo</span>
                          <p className="text-white font-semibold">L. {bracket.minimum_wage.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded border border-white/10">
                          <span className="text-white/60 text-xs block mb-1">Techo IHSS</span>
                          <p className="text-white font-semibold">L. {bracket.ihss_ceiling.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded border border-white/10">
                          <span className="text-white/60 text-xs block mb-1">IHSS Empleado</span>
                          <p className="text-white font-semibold">{(bracket.ihss_employee_rate * 100).toFixed(2)}%</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded border border-white/10">
                          <span className="text-white/60 text-xs block mb-1">RAP</span>
                          <p className="text-white font-semibold">{(bracket.rap_rate * 100).toFixed(2)}%</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <span className="text-white/70 text-sm font-medium block mb-3">Brackets ISR Progresivos:</span>
                        <div className="space-y-2">
                          {bracket.isr_brackets.map((b, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/10 text-sm">
                              <span className="text-white/60 w-20 text-xs">Tramo {idx + 1}:</span>
                              <span className="text-white/80 flex-1">
                                {b.limit === 999999999 ? '∞' : `Hasta L. ${b.limit.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`}
                              </span>
                              <span className="text-white font-semibold">
                                {b.rate === 0 ? 'Exento' : `${(b.rate * 100).toFixed(0)}%`}
                              </span>
                              {b.base > 0 && (
                                <span className="text-white/60 text-xs">
                                  (Base: L. {b.base.toLocaleString('es-HN', { minimumFractionDigits: 2 })})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Form for create/edit */}
              {formData && (
                <Card className="glass-strong border-white/10">
                  <CardHeader>
                    <CardTitle>
                      {isCreating ? 'Crear Nueva Tabla' : `Editar Tabla ${editingYear}`}
                    </CardTitle>
                    <CardDescription>
                      Completa los datos de la tabla de impuestos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Año</label>
                        <input
                          type="number"
                          value={formData.year}
                          onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!isCreating}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Salario Mínimo</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.minimum_wage}
                          onChange={(e) => setFormData({ ...formData, minimum_wage: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Techo IHSS</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.ihss_ceiling}
                          onChange={(e) => setFormData({ ...formData, ihss_ceiling: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Tasa IHSS (%)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.ihss_employee_rate * 100}
                          onChange={(e) => setFormData({ ...formData, ihss_employee_rate: parseFloat(e.target.value) / 100 })}
                          className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Tasa RAP (%)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.rap_rate * 100}
                          onChange={(e) => setFormData({ ...formData, rap_rate: parseFloat(e.target.value) / 100 })}
                          className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Fuente</label>
                        <select
                          value={formData.source}
                          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                          className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                        >
                          <option value="official">Oficial</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm text-white/70">Brackets ISR</label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAddBracket}
                          className="text-white/70 hover:text-white"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar Bracket
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {formData.isr_brackets.map((bracket, idx) => (
                          <div key={idx} className="grid grid-cols-5 gap-2 items-end p-3 bg-white/5 rounded">
                            <div>
                              <label className="block text-xs text-white/60 mb-1">Límite</label>
                              <input
                                type="number"
                                step="0.01"
                                value={bracket.limit === Infinity ? '' : bracket.limit}
                                onChange={(e) => handleBracketChange(idx, 'limit', e.target.value === '' ? Infinity : parseFloat(e.target.value))}
                                placeholder="∞"
                                className="w-full px-2 py-1 border border-white/20 rounded-md bg-white/10 text-white text-sm placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-white/60 mb-1">Tasa (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={bracket.rate * 100}
                                onChange={(e) => handleBracketChange(idx, 'rate', parseFloat(e.target.value) / 100)}
                                className="w-full px-2 py-1 border border-white/20 rounded-md bg-white/10 text-white text-sm placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-white/60 mb-1">Base</label>
                              <input
                                type="number"
                                step="0.01"
                                value={bracket.base}
                                onChange={(e) => handleBracketChange(idx, 'base', parseFloat(e.target.value))}
                                className="w-full px-2 py-1 border border-white/20 rounded-md bg-white/10 text-white text-sm placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-white/60 mb-1">Lower</label>
                              <input
                                type="number"
                                step="0.01"
                                value={bracket.lower}
                                onChange={(e) => handleBracketChange(idx, 'lower', parseFloat(e.target.value))}
                                className="w-full px-2 py-1 border border-white/20 rounded-md bg-white/10 text-white text-sm placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveBracket(idx)}
                              disabled={formData.isr_brackets.length <= 1}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-white/70 mb-1">Notas</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                        rows={3}
                        placeholder="Notas adicionales sobre esta tabla..."
                      />
                    </div>

                    {/* Preview Calculator */}
                    <div className="border-t border-white/10 pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Calculator className="h-5 w-5 text-white/70" />
                        <h3 className="text-lg font-semibold text-white">Preview de Cálculo</h3>
                      </div>
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="block text-sm text-white/70 mb-1">Salario Mensual</label>
                          <input
                            type="number"
                            step="0.01"
                            value={previewSalary}
                            onChange={(e) => setPreviewSalary(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300/50"
                            placeholder="30000"
                          />
                        </div>
                        <Button 
                          onClick={calculatePreview} 
                          variant="outline"
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Calcular
                        </Button>
                      </div>
                      {previewResult && (
                        <div className="mt-4 grid grid-cols-4 gap-3">
                          <div className="p-3 bg-white/5 rounded">
                            <div className="text-xs text-white/60">ISR</div>
                            <div className="text-lg font-semibold text-white">L. {previewResult.isr.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div className="p-3 bg-white/5 rounded">
                            <div className="text-xs text-white/60">IHSS</div>
                            <div className="text-lg font-semibold text-white">L. {previewResult.ihss.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div className="p-3 bg-white/5 rounded">
                            <div className="text-xs text-white/60">RAP</div>
                            <div className="text-lg font-semibold text-white">L. {previewResult.rap.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div className="p-3 bg-blue-500/20 rounded border border-blue-500/50">
                            <div className="text-xs text-blue-300">Total Deducciones</div>
                            <div className="text-lg font-semibold text-blue-200">L. {previewResult.total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/10">
                      <Button 
                        onClick={handleSave} 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={handleCancel} 
                        variant="ghost"
                        disabled={saving}
                        className="text-white/70 hover:text-white"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}

