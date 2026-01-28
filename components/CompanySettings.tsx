import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../lib/supabase/client'
import { useCompanyContext } from '../lib/useCompanyContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { 
  ClockIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline'
import PayrollConfigEditor from './PayrollConfigEditor'

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
}

export default function CompanySettings() {
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

  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    monday_start: '08:00',
    monday_end: '17:00',
    tuesday_start: '08:00',
    tuesday_end: '17:00',
    wednesday_start: '08:00',
    wednesday_end: '17:00',
    thursday_start: '08:00',
    thursday_end: '17:00',
    friday_start: '08:00',
    friday_end: '17:00',
    saturday_start: '',
    saturday_end: '',
    sunday_start: '',
    sunday_end: '',
    break_duration: 60,
    timezone: 'America/Tegucigalpa'
  })

  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null)

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

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      
      const supabaseClient = createClient()
      if (editingSchedule) {
        // Convert empty strings to null for time fields, and keep valid time strings as-is
        // Supabase accepts string format for time fields (e.g., "08:00:00")
        const updateData = {
          name: scheduleForm.name,
          monday_start: scheduleForm.monday_start || null,
          monday_end: scheduleForm.monday_end || null,
          tuesday_start: scheduleForm.tuesday_start || null,
          tuesday_end: scheduleForm.tuesday_end || null,
          wednesday_start: scheduleForm.wednesday_start || null,
          wednesday_end: scheduleForm.wednesday_end || null,
          thursday_start: scheduleForm.thursday_start || null,
          thursday_end: scheduleForm.thursday_end || null,
          friday_start: scheduleForm.friday_start || null,
          friday_end: scheduleForm.friday_end || null,
          saturday_start: scheduleForm.saturday_start || null,
          saturday_end: scheduleForm.saturday_end || null,
          sunday_start: scheduleForm.sunday_start || null,
          sunday_end: scheduleForm.sunday_end || null,
          break_duration: scheduleForm.break_duration,
          timezone: scheduleForm.timezone,
        };
        const { error } = await (supabaseClient as any)
          .from('work_schedules')
          .update(updateData)
          .eq('id', editingSchedule.id)

        if (error) throw error
      } else {
        // Normalizar campos TIME: convertir strings vacíos a null
        const insertData = {
          name: scheduleForm.name,
          company_id: company?.id,
          monday_start: scheduleForm.monday_start || null,
          monday_end: scheduleForm.monday_end || null,
          tuesday_start: scheduleForm.tuesday_start || null,
          tuesday_end: scheduleForm.tuesday_end || null,
          wednesday_start: scheduleForm.wednesday_start || null,
          wednesday_end: scheduleForm.wednesday_end || null,
          thursday_start: scheduleForm.thursday_start || null,
          thursday_end: scheduleForm.thursday_end || null,
          friday_start: scheduleForm.friday_start || null,
          friday_end: scheduleForm.friday_end || null,
          saturday_start: scheduleForm.saturday_start || null,
          saturday_end: scheduleForm.saturday_end || null,
          sunday_start: scheduleForm.sunday_start || null,
          sunday_end: scheduleForm.sunday_end || null,
          break_duration: scheduleForm.break_duration,
          timezone: scheduleForm.timezone,
        }
        const { error } = await (supabaseClient as any)
          .from('work_schedules')
          .insert([insertData])

        if (error) throw error
      }

      setError(null)
      setShowScheduleForm(false)
      setEditingSchedule(null)
      setScheduleForm({
        name: '',
        monday_start: '08:00',
        monday_end: '17:00',
        tuesday_start: '08:00',
        tuesday_end: '17:00',
        wednesday_start: '08:00',
        wednesday_end: '17:00',
        thursday_start: '08:00',
        thursday_end: '17:00',
        friday_start: '08:00',
        friday_end: '17:00',
        saturday_start: '',
        saturday_end: '',
        sunday_start: '',
        sunday_end: '',
        break_duration: 60,
        timezone: 'America/Tegucigalpa'
      })
      fetchWorkSchedules()
    } catch (error: any) {
      console.error('Error saving work schedule:', error)
      const errorMessage = error?.message || 'Error al guardar el horario. Por favor, intenta nuevamente.'
      setError(errorMessage)
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSchedule = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      name: schedule.name,
      monday_start: schedule.monday_start || '08:00',
      monday_end: schedule.monday_end || '17:00',
      tuesday_start: schedule.tuesday_start || '08:00',
      tuesday_end: schedule.tuesday_end || '17:00',
      wednesday_start: schedule.wednesday_start || '08:00',
      wednesday_end: schedule.wednesday_end || '17:00',
      thursday_start: schedule.thursday_start || '08:00',
      thursday_end: schedule.thursday_end || '17:00',
      friday_start: schedule.friday_start || '08:00',
      friday_end: schedule.friday_end || '17:00',
      saturday_start: schedule.saturday_start || '',
      saturday_end: schedule.saturday_end || '',
      sunday_start: schedule.sunday_start || '',
      sunday_end: schedule.sunday_end || '',
      break_duration: schedule.break_duration || 60,
      timezone: schedule.timezone || 'America/Tegucigalpa'
    })
    setShowScheduleForm(true)
  }

  const handleDeleteSchedule = async (id: string) => {
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

  const tabs = [
    { id: 'schedules', name: 'Horarios', icon: ClockIcon },
    { id: 'payroll', name: 'Configuración Payroll', icon: CalculatorIcon },
  ]

  const days = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ]

  // Show loading state while company context is loading
  if (companyLoading || (!company && !error)) {
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
      <Card variant="glass" className="p-6">
        <CardContent className="text-center">
          <p className="text-red-400 mb-2">{error || companyError}</p>
          <p className="text-sm text-gray-300 mt-2">
            {!companyId && 'No se pudo obtener el ID de la empresa. Verifica tu perfil de usuario.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Configuración de la Empresa</h2>
        <p className="text-gray-300">Administra la configuración y ajustes de tu empresa</p>
      </div>

      {/* Tabs */}
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

      {/* Tab Content */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-white">Horarios de Trabajo</h3>
              <p className="text-sm text-gray-400 mt-1">Gestiona los horarios de trabajo de tu empresa</p>
            </div>
            <Button 
              onClick={() => setShowScheduleForm(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Nuevo Horario
            </Button>
          </div>

          {error && (
            <Card variant="glass" className="p-4 border border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-sm">{error}</p>
            </Card>
          )}

          {showScheduleForm && (
            <Card variant="glass" className="p-6">
              <h4 className="text-md font-medium text-white mb-4">
                {editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}
              </h4>
              
              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Nombre del Horario *
                    </label>
                    <Input
                      type="text"
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                      required
                      placeholder="Ej: Horario Estándar"
                      className="input-glass text-white placeholder:text-white/70"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Duración del Almuerzo (minutos)
                    </label>
                    <Input
                      type="number"
                      value={scheduleForm.break_duration}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, break_duration: parseInt(e.target.value) })}
                      min="0"
                      className="input-glass text-white placeholder:text-white/70"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-white mb-3">Horarios por Día</h5>
                  <div className="glass p-4 rounded-lg border border-white/10 space-y-3">
                    {days.map((day) => (
                      <div key={day.key} className="grid grid-cols-3 gap-4 items-center py-2 border-b border-white/5 last:border-0">
                        <span className="text-sm font-medium text-white flex items-center">
                          <span className="w-2 h-2 rounded-full bg-brand-400 mr-2"></span>
                          {day.label}
                        </span>
                        <Input
                          type="time"
                          value={scheduleForm[`${day.key}_start` as keyof typeof scheduleForm] as string}
                          onChange={(e) => setScheduleForm({ 
                            ...scheduleForm, 
                            [`${day.key}_start`]: e.target.value 
                          })}
                          placeholder="Entrada"
                          className="input-glass text-white placeholder:text-white/70"
                        />
                        <Input
                          type="time"
                          value={scheduleForm[`${day.key}_end` as keyof typeof scheduleForm] as string}
                          onChange={(e) => setScheduleForm({ 
                            ...scheduleForm, 
                            [`${day.key}_end`]: e.target.value 
                          })}
                          placeholder="Salida"
                          className="input-glass text-white placeholder:text-white/70"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4 border-t border-white/10">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-medium"
                  >
                    {loading ? 'Guardando...' : editingSchedule ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowScheduleForm(false)
                      setEditingSchedule(null)
                      setError(null)
                    }}
                    className="border-white/20 hover:bg-white/10 hover:border-white/30"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workSchedules.length === 0 ? (
              <Card variant="glass" className="p-8 col-span-2">
                <div className="text-center">
                  <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-300 text-sm">No hay horarios configurados</p>
                  <p className="text-gray-400 text-xs mt-1">Crea un nuevo horario para comenzar</p>
                </div>
              </Card>
            ) : (
              workSchedules.map((schedule) => (
                <Card key={schedule.id} variant="glass" className="p-5 glass-list-item border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-lg mb-1">{schedule.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full border border-white/10">
                          Horario de trabajo
                        </span>
                      </div>
                    </div>
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
                  </div>
                  
                  <div className="space-y-2.5 pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-300 font-medium">Lun - Vie</span>
                      <span className="text-sm text-white font-semibold">{schedule.monday_start || '--:--'} - {schedule.monday_end || '--:--'}</span>
                    </div>
                    {schedule.saturday_start && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-gray-300 font-medium">Sábado</span>
                        <span className="text-sm text-white font-semibold">{schedule.saturday_start} - {schedule.saturday_end}</span>
                      </div>
                    )}
                    {schedule.sunday_start && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-gray-300 font-medium">Domingo</span>
                        <span className="text-sm text-white font-semibold">{schedule.sunday_start} - {schedule.sunday_end}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1 pt-2 border-t border-white/5">
                      <span className="text-xs text-gray-400">Duración del almuerzo</span>
                      <span className="text-xs text-gray-300 font-medium">{schedule.break_duration} min</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        companyId && company ? (
          <PayrollConfigEditor 
            companyId={companyId}
            onSave={() => {
              // Optionally refresh data or show success message
              console.log('Payroll configuration saved')
            }}
          />
        ) : (
          <Card variant="glass" className="p-6">
            <CardContent className="text-center">
              <p className="text-red-400 mb-4">{error || companyError || 'No se pudo cargar la información de la empresa'}</p>
              {!companyId && (
                <p className="text-sm text-gray-300">Verifica que tu perfil de usuario tenga una empresa asignada.</p>
              )}
            </CardContent>
          </Card>
        )
      )}

    </div>
  )
}
