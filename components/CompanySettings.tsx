import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../lib/supabase/client'
import { useSession } from '@supabase/auth-helpers-react'
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
  monday_start?: string
  monday_end?: string
  tuesday_start?: string
  tuesday_end?: string
  wednesday_start?: string
  wednesday_end?: string
  thursday_start?: string
  thursday_end?: string
  friday_start?: string
  friday_end?: string
  saturday_start?: string
  saturday_end?: string
  sunday_start?: string
  sunday_end?: string
  break_duration: number
  timezone: string
}

export default function CompanySettings() {
  const session = useSession()
  const [company, setCompany] = useState<Company | null>(null)
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('schedules')

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

  const fetchCompany = useCallback(async () => {
    if (!session?.user?.id) {
      setError('No hay sesión activa')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Step 1: Get user profile with company_id via API (bypasses RLS)
      console.log('🔍 CompanySettings: Fetching user profile...')
      const profileResponse = await fetch('/api/user-profile')
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => ({}))
        console.error('❌ CompanySettings: Profile API error:', profileResponse.status, errorData)
        throw new Error(`Error al obtener perfil de usuario: ${errorData.error || profileResponse.statusText}`)
      }
      const profileData = await profileResponse.json()
      console.log('✅ CompanySettings: Profile response:', profileData)
      const { data: userProfile } = profileData
      
      if (!userProfile) {
        console.error('❌ CompanySettings: No user profile in response')
        setError('No se encontró perfil de usuario')
        setLoading(false)
        return
      }
      
      if (!userProfile?.company_id) {
        console.warn('⚠️ CompanySettings: User has no company_id', { userProfile })
        setError('Usuario no tiene empresa asignada. Si eres super_admin, necesitas seleccionar una empresa.')
        setLoading(false)
        return
      }

      // Step 2: Get company data using client (with proper RLS)
      console.log('🔍 CompanySettings: Fetching company data for ID:', userProfile.company_id)
      const supabaseClient = createClient()
      const { data: companyData, error: companyError } = await supabaseClient
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single()

      if (companyError) {
        console.error('❌ CompanySettings: Company query error:', companyError)
        setError(`Error al cargar la empresa: ${companyError.message}`)
        return
      }
      
      if (!companyData) {
        console.error('❌ CompanySettings: Company not found for ID:', userProfile.company_id)
        setError('Empresa no encontrada')
        return
      }
      
      console.log('✅ CompanySettings: Company loaded successfully:', companyData.id, companyData.name)
      
      const company = companyData as Company
      setCompany(company)
      setError(null)
    } catch (error: any) {
      console.error('Error fetching company:', error)
      setError(error?.message || 'Error desconocido al cargar la empresa')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

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
    if (session?.user) {
      fetchCompany()
      fetchWorkSchedules()
    }
  }, [session, fetchCompany, fetchWorkSchedules])

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      
      const supabaseClient = createClient()
      if (editingSchedule) {
        const { error } = await supabaseClient
          .from('work_schedules')
          .update(scheduleForm)
          .eq('id', editingSchedule.id)

        if (error) throw error
      } else {
        const { error } = await supabaseClient
          .from('work_schedules')
          .insert([{ ...scheduleForm, company_id: company?.id }])

        if (error) throw error
      }

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
    } catch (error) {
      console.error('Error saving work schedule:', error)
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
      break_duration: schedule.break_duration,
      timezone: schedule.timezone
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

  if (loading && !company) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Cargando información de la empresa...</p>
      </div>
    )
  }

  if (error && !company) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <Button onClick={() => fetchCompany()} variant="outline" size="sm">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Configuración de la Empresa</h2>
        <p className="text-gray-600">Administra la configuración y ajustes de tu empresa</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <h3 className="text-lg font-medium text-gray-900">Horarios de Trabajo</h3>
            <Button onClick={() => setShowScheduleForm(true)}>
              Nuevo Horario
            </Button>
          </div>

          {showScheduleForm && (
            <Card className="p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                {editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}
              </h4>
              
              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Horario *
                    </label>
                    <Input
                      type="text"
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                      required
                      placeholder="Ej: Horario Estándar"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duración del Almuerzo (minutos)
                    </label>
                    <Input
                      type="number"
                      value={scheduleForm.break_duration}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, break_duration: parseInt(e.target.value) })}
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Horarios por Día</h5>
                  {days.map((day) => (
                    <div key={day.key} className="grid grid-cols-3 gap-4 items-center">
                      <span className="text-sm font-medium text-gray-700">{day.label}</span>
                      <Input
                        type="time"
                        value={scheduleForm[`${day.key}_start` as keyof typeof scheduleForm] as string}
                        onChange={(e) => setScheduleForm({ 
                          ...scheduleForm, 
                          [`${day.key}_start`]: e.target.value 
                        })}
                        placeholder="Entrada"
                      />
                      <Input
                        type="time"
                        value={scheduleForm[`${day.key}_end` as keyof typeof scheduleForm] as string}
                        onChange={(e) => setScheduleForm({ 
                          ...scheduleForm, 
                          [`${day.key}_end`]: e.target.value 
                        })}
                        placeholder="Salida"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-3">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : editingSchedule ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowScheduleForm(false)
                      setEditingSchedule(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workSchedules.map((schedule) => (
              <Card key={schedule.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-900">{schedule.name}</h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditSchedule(schedule)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Lun - Vie:</span>
                    <span>{schedule.monday_start} - {schedule.monday_end}</span>
                  </div>
                  {schedule.saturday_start && (
                    <div className="flex justify-between">
                      <span>Sábado:</span>
                      <span>{schedule.saturday_start} - {schedule.saturday_end}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Almuerzo:</span>
                    <span>{schedule.break_duration} min</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        company ? (
          <PayrollConfigEditor 
            companyId={company.id}
            onSave={() => {
              // Optionally refresh data or show success message
              console.log('Payroll configuration saved')
            }}
          />
        ) : (
          <Card className="p-6">
            <CardContent className="text-center">
              {error ? (
                <>
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={() => fetchCompany()} variant="outline">
                    Reintentar
                  </Button>
                </>
              ) : (
                <p className="text-gray-600">Cargando información de la empresa...</p>
              )}
            </CardContent>
          </Card>
        )
      )}

    </div>
  )
}
