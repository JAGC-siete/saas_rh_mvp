import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DocumentChartBarIcon } from '@heroicons/react/24/outline'
import CompanyLogoUpload from '../settings/CompanyLogoUpload'
import {
  REPORT_TYPE_OPTIONS,
  type ReportConfig,
  type ReportType
} from '../../lib/reports/report-config-schema'

interface ReportParamsEditorProps {
  companyId: string
  onSave?: () => void
}

export default function ReportParamsEditor({ companyId, onSave }: ReportParamsEditorProps) {
  const [reportType, setReportType] = useState<ReportType>('attendance')
  const [config, setConfig] = useState<ReportConfig>({})
  const [standardColumns, setStandardColumns] = useState<{ id: string; label: string; sourceField: string }[]>([])
  const [availableCustomFields, setAvailableCustomFields] = useState<{ id: string; label: string; sourceField: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/companies/${companyId}/report-configs?report_type=${reportType}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('Error cargando configuración')
      const data = await res.json()
      setConfig((data.config?.config ?? {}) as ReportConfig)
      setStandardColumns(data.standardColumns ?? [])
      setAvailableCustomFields(data.availableCustomFields ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Error cargando')
    } finally {
      setLoading(false)
    }
  }, [companyId, reportType])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleBrandingChange = (field: string, value: string | boolean | undefined) => {
    setConfig((prev) => ({
      ...prev,
      branding: { ...prev.branding, [field]: value }
    }))
  }

  const handleColumnChange = (colId: string, field: 'label' | 'visible' | 'order', value: string | boolean | number) => {
    setConfig((prev) => {
      const cols = [...(prev.columns ?? [])]
      const idx = cols.findIndex((c) => c.id === colId)
      if (idx >= 0) {
        cols[idx] = { ...cols[idx], [field]: value }
      } else {
        const std = standardColumns.find((s) => s.id === colId) ?? availableCustomFields.find((a) => a.id === colId)
        if (std) cols.push({ id: colId, label: std.label, visible: true, order: cols.length, [field]: value })
      }
      return { ...prev, columns: cols }
    })
  }

  const handleIncludeCustomPayrollFields = (checked: boolean) => {
    setConfig((prev) => ({ ...prev, includeCustomPayrollFields: checked }))
  }

  const allColumns = [
    ...standardColumns.map((s) => ({ ...s, source: 'standard' as const })),
    ...(config.includeCustomPayrollFields ? availableCustomFields.map((a) => ({ ...a, source: 'payroll_config' as const })) : [])
  ]

  const getColumnConfig = (colId: string) => {
    return config.columns?.find((c) => c.id === colId)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const columnsToSave = allColumns.map((col, i) => {
        const cfg = getColumnConfig(col.id)
        return {
          id: col.id,
          label: cfg?.label ?? col.label,
          visible: cfg?.visible ?? true,
          order: i,
          source: col.source === 'payroll_config' ? ('payroll_config' as const) : ('standard' as const),
          ...(col.source === 'payroll_config' && { sourceField: col.sourceField })
        }
      })
      const payload = {
        ...config,
        columns: columnsToSave,
        ...((reportType === 'payroll' || reportType === 'voucher') && {
          includeCustomPayrollFields: config.includeCustomPayrollFields ?? false
        })
      }
      const res = await fetch(`/api/companies/${companyId}/report-configs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ report_type: reportType, config: payload })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error guardando')
      }
      setSuccess(true)
      onSave?.()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message ?? 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card variant="liquid" className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card variant="liquid" className="border border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <DocumentChartBarIcon className="h-5 w-5" />
            Parámetros de Reportes
          </CardTitle>
          <CardDescription className="text-gray-300">
            Configura branding y columnas visibles para cada tipo de reporte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              Configuración guardada correctamente
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">Tipo de reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full max-w-xs px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            >
              {REPORT_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value} className="bg-slate-800">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-medium text-white mb-3">Identidad visual (empresa)</h4>
            <p className="text-xs text-gray-400 mb-4">
              El logo se aplica a todos los reportes y recibos PDF. Almacenado de forma privada en la plataforma.
            </p>
            <CompanyLogoUpload companyId={companyId} onLogoChange={setLogoPreviewUrl} />
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Branding del reporte</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Color primario</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.branding?.primaryColor ?? '#0b4fa1'}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="h-10 w-14 rounded border border-white/20 cursor-pointer"
                  />
                  <Input
                    value={config.branding?.primaryColor ?? '#0b4fa1'}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="flex-1 bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre legal (opcional)</label>
                <Input
                  value={config.branding?.legalName ?? ''}
                  onChange={(e) => handleBrandingChange('legalName', e.target.value || undefined)}
                  placeholder="Empresa S. de R.L."
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  id="useLegalSuffix"
                  checked={config.branding?.useLegalSuffix ?? false}
                  onChange={(e) => handleBrandingChange('useLegalSuffix', e.target.checked)}
                  className="rounded border-white/20"
                />
                <label htmlFor="useLegalSuffix" className="text-sm text-gray-300">
                  Incluir sufijo legal (S. de R.L.)
                </label>
              </div>
            </div>
            <div className="mt-3 p-4 rounded-lg border border-white/10 bg-white/5">
              <p className="text-xs text-gray-400 mb-2">Vista previa</p>
              <div
                className="h-12 rounded flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: config.branding?.primaryColor ?? '#0b4fa1' }}
              >
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="Logo" className="h-8 object-contain" />
                ) : (
                  <span>{(config.branding?.legalName || 'Empresa').toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Columnas</h4>
            {reportType === 'payroll' && (
              <p className="text-xs text-gray-400 mb-3">
                Visibilidad aplicada al PDF de planilla. Horas / Tarifa / Séptimo día solo aparecen en
                tablas por hora. Período y Estado afectan listados/export, no la tabla del PDF.
                Campos custom del PDF se controlan al activar “Incluir campos custom”.
                Resumen ejecutivo e información bancaria del PDF no son configurables aquí.
              </p>
            )}
            {(reportType === 'payroll' || reportType === 'voucher') && availableCustomFields.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeCustom"
                  checked={config.includeCustomPayrollFields ?? false}
                  onChange={(e) => handleIncludeCustomPayrollFields(e.target.checked)}
                  className="rounded border-white/20"
                />
                <label htmlFor="includeCustom" className="text-sm text-gray-300">
                  Incluir campos custom de nómina ({availableCustomFields.length} detectados)
                </label>
              </div>
            )}
            {allColumns.length === 0 ? (
              <p className="text-sm text-gray-400 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                Este tipo de reporte no tiene columnas editables aquí; el branding (color, logo, nombre
                legal) sí se aplica en PDF y exportaciones cuando el motor de reportes lo use.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-gray-400 font-medium">Columna</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Etiqueta</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Visible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allColumns.map((col) => {
                      const cfg = getColumnConfig(col.id)
                      const label = cfg?.label ?? col.label
                      const visible = cfg?.visible ?? true
                      return (
                        <tr key={col.id} className="border-b border-white/5">
                          <td className="py-2 text-gray-300">{col.id}</td>
                          <td className="py-2">
                            <Input
                              value={label}
                              onChange={(e) => handleColumnChange(col.id, 'label', e.target.value)}
                              className="w-full max-w-[200px] h-8 text-sm bg-white/5 border-white/20 text-white"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={(e) => handleColumnChange(col.id, 'visible', e.target.checked)}
                              className="rounded border-white/20"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
