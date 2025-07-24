import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '@supabase/auth-helpers-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card'
import { 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  ClockIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  BellIcon
} from '@heroicons/react/24/outline'

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
  const [activeTab, setActiveTab] = useState('general')
  
  const [companyForm, setCompanyForm] = useState({
    name: '',
    subdomain: '',
    plan_type: 'basic',
    settings: {}
  })

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

  useEffect(() => {
    if (session?.user) {
      fetchCompany()
      fetchWorkSchedules()
    }
  }, [session])

  const fetchCompany = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          company_id,
          companies (*)
        `)
        .eq('id', session?.user?.id)
        .single()

      if (error) throw error
      
      const companyData = data.companies as Company
      setCompany(companyData)
      setCompanyForm({
        name: companyData.name,
        subdomain: companyData.subdomain || '',
        plan_type: companyData.plan_type,
        settings: companyData.settings || {}
      })
    } catch (error) {
      console.error('Error fetching company:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .order('name')

      if (error) throw error
      setWorkSchedules(data || [])
    } catch (error) {
      console.error('Error fetching work schedules:', error)
    }
  }

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyForm.name,
          subdomain: companyForm.subdomain || null,
          plan_type: companyForm.plan_type,
          settings: companyForm.settings
        })
        .eq('id', company.id)

      if (error) throw error
      
      fetchCompany()
    } catch (error) {
      console.error('Error updating company:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      
      if (editingSchedule) {
        const { error } = await supabase
          .from('work_schedules')
          .update(scheduleForm)
          .eq('id', editingSchedule.id)

        if (error) throw error
      } else {
        const { error } = await supabase
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
    setScheduleForm({ ...schedule })
    setShowScheduleForm(true)
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este horario?')) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
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
    { id: 'general', name: 'General', icon: BuildingOfficeIcon },
    { id: 'schedules', name: 'Horarios', icon: ClockIcon },
    { id: 'users', name: 'Usuarios', icon: UserGroupIcon },
    { id: 'billing', name: 'Facturación', icon: CreditCardIcon },
    { id: 'security', name: 'Seguridad', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notificaciones', icon: BellIcon }
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
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
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
      {activeTab === 'general' && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
          
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Empresa *
                </label>
                <Input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdominio
                </label>
                <Input
                  type="text"
                  value={companyForm.subdomain}
                  onChange={(e) => setCompanyForm({ ...companyForm, subdomain: e.target.value })}
                  placeholder="mi-empresa"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                value={companyForm.plan_type}
                onChange={(e) => setCompanyForm({ ...companyForm, plan_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Básico</option>
                <option value="professional">Profesional</option>
                <option value="enterprise">Empresarial</option>
              </select>
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </Card>
      )}

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

      {activeTab === 'users' && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Gestión de Usuarios</h3>
          <p className="text-gray-600">Próximamente: Gestión de roles y permisos de usuarios</p>
        </Card>
      )}

      {activeTab === 'billing' && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Facturación y Suscripción</h3>
          <p className="text-gray-600">Próximamente: Gestión de facturación y planes</p>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Seguridad</h3>
          <p className="text-gray-600">Próximamente: Configuración de autenticación y seguridad</p>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Notificaciones</h3>
          <p className="text-gray-600">Próximamente: Configuración de notificaciones por email y SMS</p>
        </Card>
      )}
    </div>
  )
}
