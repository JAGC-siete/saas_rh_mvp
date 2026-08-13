import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'
import { useCompanyContext } from '../lib/useCompanyContext'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { 
  ClockIcon,
  CalculatorIcon,
  DocumentChartBarIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import LeaveTypesSettings from './LeaveTypesSettings'
import PayrollConfigEditor from './PayrollConfigEditor'
import ReportParamsEditor from './reports/ReportParamsEditor'
import WorkScheduleEditor, {
  WorkScheduleCardSummary,
  emptyScheduleForm,
  scheduleFromRow,
} from './WorkScheduleEditor'
import { buildSchedulePayload, validateScheduleForm } from '../lib/attendance/shift-config'
import type { ScheduleEditorFormState } from '../lib/attendance/shift-config'
import { BIOMETRIC_MODES, type BiometricMode } from '../lib/attendance/attendance-metadata'
import { DEFAULT_PERFORMANCE_SETTINGS, parsePerformanceSettings } from '../lib/performance/settings'
import { useSettingsAccess } from '../lib/hooks/useSettingsAccess'
import { canManageCompanyUsers } from '../lib/company/users'

interface Company {
  id: string
  name: string
  subdomain?: string
  plan_type: string
  settings: any
  created_at: string
}

interface WorkSchedule {
  id: string
  name: string
  monday_start?: string | null
  monday_end?: string | null
  tuesday_start?: string | null
  tuesday_end?: string | null
  wednesday_start?: string | null
  wednesday_end?: string | null
  thursday_start?: string | null
  thursday_end?: string | null
  friday_start?: string | null
  friday_end?: string | null
  saturday_start?: string | null
  saturday_end?: string | null
  sunday_start?: string | null
  sunday_end?: string | null
  break_duration: number | null
  timezone: string | null
  shift_config?: Record<string, unknown> | null
  day_off_mask?: number | null
}

export default function CompanySettings() {
  const settingsAccess = useSettingsAccess()
  const { userProfile } = useAuth()
  const canManageUsers = canManageCompanyUsers(userProfile?.role)
  const {
    canViewFullSettings,
    canCreateWorkSchedules,
    canManageWorkSchedules,
    canAccessSchedulesCreateOnly,
    showSettingsNav,
    loading: settingsAccessLoading,
  } = settingsAccess

  // Use the same pattern as EmployeeManager and PayrollManagerNew
  const { companyId, company: contextCompany, loading: companyLoading, error: companyError } = useCompanyContext()
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('schedules')
  
  // Convert contextCompany to Company type if available
  const company = contextCompany ? {
    id: contextCompany.id,
    name: contextCompany.name,
    subdomain: undefined,
    plan_type: 'basic',
    settings: contextCompany.settings,
    created_at: new Date().toISOString()
  } as Company : null

  const [scheduleForm, setScheduleForm] = useState<ScheduleEditorFormState>(() => emptyScheduleForm())

  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null)

  const [biometricMode, setBiometricMode] = useState<BiometricMode>('STRICT_2')
  const [biometricSaving, setBiometricSaving] = useState(false)
  const [biometricMsg, setBiometricMsg] = useState<string | null>(null)

  const [perfSettings, setPerfSettings] = useState(() => DEFAULT_PERFORMANCE_SETTINGS)
  const [perfSaving, setPerfSaving] = useState(false)
  const [perfMsg, setPerfMsg] = useState<string | null>(null)

  // Sync error from company context
  useEffect(() => {
    if (companyError) {
      setError(companyError)
    }
  }, [companyError])

  const fetchWorkSchedules = useCallback(async () => {
    try {
      const supabaseClient = createClient()
      const { data, error } = await supabaseClient
        .from('work_schedules')
        .select('*')
        .order('name')

      if (error) throw error
      setWorkSchedules(data || [])
    } catch (error) {
      console.error('Error fetching work schedules:', error)
    }
  }, [])

  useEffect(() => {
    // Only fetch work schedules when companyId is available
    if (companyId) {
      fetchWorkSchedules()
    }
  }, [companyId, fetchWorkSchedules])

  useEffect(() => {
    if (!companyId) return
    if (canAccessSchedulesCreateOnly) return
    if (!canViewFullSettings) return
    ;(async () => {
      try {
        const supabaseClient = createClient() as any
        const { data, error } = await supabaseClient
          .from('company_metadata')
          .select('attendance_metadata, employees_metadata')
          .eq('company_id', companyId)
          .maybeSingle()
        if (error) throw error
        const meta = (data?.attendance_metadata || {}) as { biometric_mode?: string }
        const m = meta.biometric_mode
        if (typeof m === 'string' && (BIOMETRIC_MODES as readonly string[]).includes(m)) {
          setBiometricMode(m as BiometricMode)
        } else {
          setBiometricMode('STRICT_2')
        }

        setPerfSettings(parsePerformanceSettings(data?.employees_metadata || {}))
      } catch (e) {
        console.error('Error loading attendance_metadata:', e)
      }
    })()
  }, [companyId, canAccessSchedulesCreateOnly, canViewFullSettings])

  const saveBiometricMetadata = async () => {
    if (!companyId) return
    setBiometricSaving(true)
    setBiometricMsg(null)
    try {
      const supabaseClient = createClient() as any
      const { data: existing, error: readErr } = await supabaseClient
        .from('company_metadata')
        .select('attendance_metadata')
        .eq('company_id', companyId)
        .maybeSingle()
      if (readErr) throw readErr
      const prev = (existing?.attendance_metadata || {}) as Record<string, unknown>
      const merged = { ...prev, biometric_mode: biometricMode }
      const { error } = await supabaseClient.from('company_metadata').upsert(
        { company_id: companyId, attendance_metadata: merged },
        { onConflict: 'company_id' }
      )
      if (error) throw error
      setBiometricMsg('Modalidad biométrica guardada.')
    } catch (e) {
      setBiometricMsg(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setBiometricSaving(false)
    }
  }

  const savePerformanceMetadata = async () => {
    if (!companyId) return
    setPerfSaving(true)
    setPerfMsg(null)
    try {
      const res = await fetch('/api/company-metadata/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perfSettings)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar')
      setPerfSettings(parsePerformanceSettings(data?.employees_metadata || {}))
      setPerfMsg('Parámetros de desempeño guardados.')
    } catch (e) {
      setPerfMsg(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setPerfSaving(false)
    }
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingSchedule && !canManageWorkSchedules) {
      setError('No tiene permiso para editar horarios existentes.')
      return
    }
    if (!editingSchedule && !canCreateWorkSchedules) {
      setError('No tiene permiso para crear horarios.')
      return
    }

    const validationError = validateScheduleForm(scheduleForm)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setLoading(true)
      const payload = buildSchedulePayload(scheduleForm)
      const supabaseClient = createClient()

      if (editingSchedule) {
        const { error } = await (supabaseClient as any)
          .from('work_schedules')
          .update(payload)
          .eq('id', editingSchedule.id)

        if (error) throw error
      } else if (canAccessSchedulesCreateOnly) {
        const res = await fetch('/api/work-schedules', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.message || data?.error || 'Error al crear horario')
        }
      } else {
        const { error } = await (supabaseClient as any)
          .from('work_schedules')
          .insert([{ ...payload, company_id: company?.id }])

        if (error) throw error
      }

      setError(null)
      setShowScheduleForm(false)
      setEditingSchedule(null)
      setScheduleForm(emptyScheduleForm())
      fetchWorkSchedules()
    } catch (error: any) {
      console.error('Error saving work schedule:', error)
      const errorMessage = error?.message || 'Error al guardar el horario. Por favor, intenta nuevamente.'
      setError(errorMessage)
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSchedule = (schedule: WorkSchedule) => {
    if (!canManageWorkSchedules) return
    setEditingSchedule(schedule)
    setScheduleForm(scheduleFromRow(schedule))
    setShowScheduleForm(true)
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!canManageWorkSchedules) {
      setError('No tiene permiso para eliminar horarios.')
      return
    }
    if (!confirm('¿Estás seguro de que quieres eliminar este horario?')) {
      return
    }

    try {
      setLoading(true)
      const supabaseClient = createClient()
      const { error } = await supabaseClient
        .from('work_schedules')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchWorkSchedules()
    } catch (error) {
      console.error('Error deleting work schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const allTabs = [
    { id: 'schedules', name: 'Horarios', icon: ClockIcon },
    { id: 'payroll', name: 'Configuración Payroll', icon: CalculatorIcon },
    { id: 'reports', name: 'Parámetros de Reportes', icon: DocumentChartBarIcon },
    { id: 'leaveTypes', name: 'Parámetros de permisos', icon: ClipboardDocumentListIcon },
    { id: 'performance', name: 'Desempeño', icon: ChartBarIcon },
  ]

  const tabs = canViewFullSettings
    ? allTabs
    : canCreateWorkSchedules
      ? allTabs.filter((t) => t.id === 'schedules')
      : []

  useEffect(() => {
    if (settingsAccessLoading) return
    if (tabs.length === 0) return
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab('schedules')
    }
  }, [settingsAccessLoading, tabs, activeTab])

  // Show loading state while company context is loading
  if (companyLoading || settingsAccessLoading || (!company && !error)) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="mt-4 text-white">Cargando información de la empresa...</p>
      </div>
    )
  }

  // Show error state if company context failed
  if ((error || companyError) && !company) {
    return (
      <Card variant="liquid" className="p-6">
        <CardContent className="text-center">
          <p className="text-red-400 mb-2">{error || companyError}</p>
          <p className="text-sm text-gray-300 mt-2">
            {!companyId && 'No se pudo obtener el ID de la empresa. Verifica tu perfil de usuario.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!settingsAccess.showSettingsNav) {
    return (
      <Card variant="liquid" className="p-6">
        <CardContent className="text-center">
          <p className="text-red-400">No tiene permiso para acceder a parámetros.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          {canAccessSchedulesCreateOnly ? 'Horarios de trabajo' : 'Configuración de la Empresa'}
        </h2>
        <p className="text-gray-300">
          {canAccessSchedulesCreateOnly
            ? 'Crea nuevos horarios para asignar a empleados'
            : 'Administra la configuración y ajustes de tu empresa'}
        </p>
      </div>

      {canManageUsers && (
        <Link href="/app/settings/users" className="block">
          <Card
            variant="liquid"
            className="border-white/20 hover:border-white/40 transition-colors cursor-pointer"
          >
            <CardContent className="pt-5 pb-5 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">Gestionar usuarios</p>
                <p className="text-sm text-white/65">
                  Crear cuentas, roles, permisos por módulo y restablecer acceso
                </p>
              </div>
              <span className="text-sm text-white/70 shrink-0">Abrir →</span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Tabs */}
      {tabs.length > 1 && (
      <div className="border-b border-white/20">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-400 text-white'
                    : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>
      )}

      {/* Tab Content */}
      {(activeTab === 'schedules' || canAccessSchedulesCreateOnly) && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-white">Horarios de Trabajo</h3>
              <p className="text-sm text-gray-400 mt-1">Gestiona los horarios de trabajo de tu empresa</p>
            </div>
            <Button 
              onClick={() => {
                setEditingSchedule(null)
                setScheduleForm(emptyScheduleForm())
                setShowScheduleForm(true)
              }}
              disabled={!canCreateWorkSchedules}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Nuevo Horario
            </Button>
          </div>

          {error && (
            <Card variant="liquid" className="p-4 border border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-sm">{error}</p>
            </Card>
          )}

          {canViewFullSettings && (
          <Card variant="liquid" className="p-5 border border-white/15">
            <h4 className="text-md font-medium text-white mb-1">Modalidad de marcas biométricas</h4>
            <p className="text-xs text-gray-400 mb-3">
              Define cómo se interpretan las marcas del reloj al consolidar el día (cierre diario). STRICT_2: entrada y
              salida (si llegan 4 marcas, las intermedias se usan como almuerzo con aviso). STRICT_4: entrada, almuerzo
              y salida (si solo hay 2 marcas, se toman como entrada/salida con aviso). FLEXIBLE: acepta 2 o 4 marcas
              según cantidad recibida. Tras cambiar modalidad, ejecute &quot;Consolidar marcas&quot; en los días afectados
              (registros ya cerrados no se re-mapean automáticamente).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px]">
                <label className="block text-xs text-gray-400 mb-1">Modalidad</label>
                <select
                  value={biometricMode}
                  onChange={(e) => setBiometricMode(e.target.value as BiometricMode)}
                  className="w-full rounded-md bg-white/5 border border-white/20 text-white text-sm px-3 py-2"
                >
                  {BIOMETRIC_MODES.map((m) => (
                    <option key={m} value={m} className="bg-gray-900">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                onClick={() => void saveBiometricMetadata()}
                disabled={biometricSaving || !companyId}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                {biometricSaving ? 'Guardando…' : 'Guardar modalidad'}
              </Button>
            </div>
            {biometricMsg && <p className="text-xs mt-2 text-gray-300">{biometricMsg}</p>}
          </Card>
          )}

          {showScheduleForm && (
            <Card variant="liquid" className="p-6">
              <h4 className="text-md font-medium text-white mb-4">
                {editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}
              </h4>

              <WorkScheduleEditor
                form={scheduleForm}
                onChange={setScheduleForm}
                loading={loading}
                isEditing={!!editingSchedule}
                onSubmit={handleScheduleSubmit}
                onCancel={() => {
                  setShowScheduleForm(false)
                  setEditingSchedule(null)
                  setError(null)
                }}
              />
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workSchedules.length === 0 ? (
              <Card variant="liquid" className="p-8 col-span-2">
                <div className="text-center">
                  <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-300 text-sm">No hay horarios configurados</p>
                  <p className="text-gray-400 text-xs mt-1">Crea un nuevo horario para comenzar</p>
                </div>
              </Card>
            ) : (
              workSchedules.map((schedule) => (
                <Card key={schedule.id} variant="liquid" className="p-5 glass-list-item border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-lg mb-1">{schedule.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full border border-white/10">
                          Horario de trabajo
                        </span>
                      </div>
                    </div>
                    {canManageWorkSchedules && (
                    <div className="flex space-x-2 ml-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditSchedule(schedule)}
                        className="text-white border-white/20 hover:bg-white/10 hover:border-white/30"
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-400 border-red-400/50 hover:bg-red-500/20 hover:border-red-400 hover:text-red-300"
                      >
                        Eliminar
                      </Button>
                    </div>
                    )}
                  </div>
                  
                  <WorkScheduleCardSummary schedule={schedule} />
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {canViewFullSettings && activeTab === 'payroll' && (
        companyId && company ? (
          <PayrollConfigEditor 
            companyId={companyId}
            onSave={() => {
              // Optionally refresh data or show success message
              console.log('Payroll configuration saved')
            }}
          />
        ) : (
          <Card variant="liquid" className="p-6">
            <CardContent className="text-center">
              <p className="text-red-400 mb-4">{error || companyError || 'No se pudo cargar la información de la empresa'}</p>
              {!companyId && (
                <p className="text-sm text-gray-300">Verifica que tu perfil de usuario tenga una empresa asignada.</p>
              )}
            </CardContent>
          </Card>
        )
      )}

      {canViewFullSettings && activeTab === 'reports' && (
        companyId && company ? (
          <ReportParamsEditor
            companyId={companyId}
            onSave={() => console.log('Report params saved')}
          />
        ) : (
          <Card variant="liquid" className="p-6">
            <CardContent className="text-center">
              <p className="text-red-400 mb-4">{error || companyError || 'No se pudo cargar la información de la empresa'}</p>
              {!companyId && (
                <p className="text-sm text-gray-300">Verifica que tu perfil de usuario tenga una empresa asignada.</p>
              )}
            </CardContent>
          </Card>
        )
      )}

      {canViewFullSettings && activeTab === 'leaveTypes' && (
        companyId && company ? (
          <LeaveTypesSettings companyId={companyId} />
        ) : (
          <Card variant="liquid" className="p-6">
            <CardContent className="text-center">
              <p className="text-red-400 mb-4">{error || companyError || 'No se pudo cargar la información de la empresa'}</p>
              {!companyId && (
                <p className="text-sm text-gray-300">Verifica que tu perfil de usuario tenga una empresa asignada.</p>
              )}
            </CardContent>
          </Card>
        )
      )}

      {canViewFullSettings && activeTab === 'performance' && (
        <div className="space-y-6">
          <Card variant="liquid" className="p-5 border border-white/15">
            <h4 className="text-md font-medium text-white mb-1">Evaluación de desempeño</h4>
            <p className="text-xs text-gray-400 mb-4">
              Estos parámetros controlan validaciones al finalizar evaluaciones y el peso relativo de “Supera”.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-white font-medium">Exigir calificar todo para finalizar</div>
                    <div className="text-xs text-gray-300">
                      Si está activo, no se puede marcar como “Finalizada” si hay criterios sin rating.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={perfSettings.performance_require_all_rated_to_complete}
                    onChange={(e) =>
                      setPerfSettings((s) => ({
                        ...s,
                        performance_require_all_rated_to_complete: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-white font-medium">Exigir comentario cuando es “No cumple”</div>
                    <div className="text-xs text-gray-300">
                      Si está activo, al finalizar se requiere comentario en todos los ítems con rating “No cumple”.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={perfSettings.performance_require_comment_on_no_cumple}
                    onChange={(e) =>
                      setPerfSettings((s) => ({
                        ...s,
                        performance_require_comment_on_no_cumple: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4 md:col-span-2">
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-white font-medium">Multiplicador de “Supera”</div>
                  <div className="text-xs text-gray-300">
                    Define cuánto pesa “Supera” comparado con “Cumple” (1.0). Rango recomendado 1.1–1.5.
                  </div>
                  <Input
                    type="number"
                    step="0.05"
                    min="1"
                    max="2"
                    value={perfSettings.performance_supera_multiplier}
                    onChange={(e) =>
                      setPerfSettings((s) => ({
                        ...s,
                        performance_supera_multiplier: Number(e.target.value),
                      }))
                    }
                    className="input-glass text-white placeholder:text-white/70 max-w-[220px]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                type="button"
                onClick={() => void savePerformanceMetadata()}
                disabled={perfSaving || !companyId}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                {perfSaving ? 'Guardando…' : 'Guardar parámetros'}
              </Button>
              {perfMsg && <p className="text-xs text-gray-300">{perfMsg}</p>}
            </div>
          </Card>
        </div>
      )}

    </div>
  )
}
