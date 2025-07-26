import { useState, useEffect } from 'react'
import { supabase, useSupabaseSession } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card'
import { PlusIcon, CheckIcon, XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface LeaveRequest {
  id: string
  employee_id: string
  employee?: {
    first_name: string
    last_name: string
    email: string
  }
  leave_type: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  created_at: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
}

const LEAVE_TYPES = [
  { value: 'vacation', label: 'Vacaciones' },
  { value: 'sick', label: 'Enfermedad' },
  { value: 'personal', label: 'Personal' },
  { value: 'maternity', label: 'Maternidad' },
  { value: 'paternity', label: 'Paternidad' },
  { value: 'emergency', label: 'Emergencia' }
]

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada'
}

export default function LeaveManager() {
  const { session } = useSupabaseSession()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  })

  useEffect(() => {
    if (session?.user) {
      fetchLeaveRequests()
      fetchEmployees()
    }
  }, [session])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employees(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeaveRequests(data || [])
    } catch (error) {
      console.error('Error fetching leave requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('status', 'active')
        .order('first_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const daysRequested = calculateDays(formData.start_date, formData.end_date)
      
      const { error } = await supabase
        .from('leave_requests')
        .insert([{
          employee_id: formData.employee_id,
          leave_type: formData.leave_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_requested: daysRequested,
          reason: formData.reason || null,
          status: 'pending'
        }])

      if (error) throw error

      setFormData({
        employee_id: '',
        leave_type: '',
        start_date: '',
        end_date: '',
        reason: ''
      })
      setShowForm(false)
      fetchLeaveRequests()
    } catch (error) {
      console.error('Error creating leave request:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          approved_by: session?.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      fetchLeaveRequests()
    } catch (error) {
      console.error('Error updating leave request:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getLeaveTypeLabel = (type: string) => {
    return LEAVE_TYPES.find(t => t.value === type)?.label || type
  }

  if (loading && leaveRequests.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Solicitudes de Permisos</h2>
        <Button 
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nueva Solicitud</span>
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Solicitud de Permiso</CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empleado *
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar empleado</option>
                  {/* eslint-disable-next-line react/jsx-key */}
                  {employees.map((employee, index) => (
                    <option key={`employee-${index}`} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Permiso *
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar tipo</option>
                  {/* eslint-disable-next-line react/jsx-key */}
                  {LEAVE_TYPES.map((type, index) => (
                    <option key={`type-${index}`} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio *
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Fin *
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            
            {formData.start_date && formData.end_date && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-700">
                  Días solicitados: {calculateDays(formData.start_date, formData.end_date)}
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Motivo de la solicitud"
              />
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Crear Solicitud'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {/* eslint-disable-next-line react/jsx-key */}
        {leaveRequests.map((request, index) => (
          <Card key={`request-${index}`}>
            <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {request.employee?.first_name} {request.employee?.last_name}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[request.status]}`}>
                    {STATUS_LABELS[request.status]}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Tipo:</span>
                    <p className="text-gray-600">{getLeaveTypeLabel(request.leave_type)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Fechas:</span>
                    <p className="text-gray-600">
                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Días:</span>
                    <p className="text-gray-600">{request.days_requested} días</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Solicitado:</span>
                    <p className="text-gray-600">{formatDate(request.created_at)}</p>
                  </div>
                </div>
                
                {request.reason && (
                  <div className="mt-3">
                    <span className="font-medium text-gray-700">Motivo:</span>
                    <p className="text-gray-600 mt-1">{request.reason}</p>
                  </div>
                )}
              </div>
              
              {request.status === 'pending' && (
                <div className="flex space-x-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(request.id, 'approved')}
                    className="bg-green-600 hover:bg-green-700 flex items-center space-x-1"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span>Aprobar</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(request.id, 'rejected')}
                    className="border-red-300 text-red-700 hover:bg-red-50 flex items-center space-x-1"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span>Rechazar</span>
                  </Button>
                </div>
              )}
            </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {leaveRequests.length === 0 && !loading && (
        <div className="text-center py-8">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay solicitudes de permisos</p>
        </div>
      )}
    </div>
  )
}
