// LeaveManager.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '@supabase/auth-helpers-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
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
] as const

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pendiente' },
  approved: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Aprobada' },
  rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rechazada' }
} as const

const INITIAL_FORM_DATA = {
  employee_id: '',
  leave_type: '',
  start_date: '',
  end_date: '',
  reason: ''
}

export default function LeaveManager() {
  const session = useSession()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

  // Mount guard to avoid state updates after unmount
  const isMountedRef = useRef(true)
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Memoized leave types map for better performance
  const leaveTypesMap = useMemo(
    () => Object.fromEntries(LEAVE_TYPES.map((type) => [type.value, type.label])),
    []
  )

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setShowForm(false)
  }, [])

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('leave_requests')
        .select(
          `
          *,
          employee:employees(first_name, last_name, email)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!isMountedRef.current) return
      setLeaveRequests(data || [])
    } catch (error) {
      console.error('Error fetching leave requests:', error)
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('status', 'active')
        .order('first_name')

      if (error) throw error
      if (!isMountedRef.current) return
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchLeaveRequests()
      fetchEmployees()
    }
  }, [session, fetchLeaveRequests, fetchEmployees])

  const calculateDays = useCallback((startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    const timeDiff = end.getTime() - start.getTime()
    return timeDiff < 0 ? 0 : Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1
  }, [])

  const datesInvalid = useMemo(() => {
    if (!formData.start_date || !formData.end_date) return false
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    return end < start
  }, [formData.start_date, formData.end_date])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (datesInvalid) return

      try {
        setIsSubmitting(true)

        const daysRequested = calculateDays(formData.start_date, formData.end_date)
        if (daysRequested <= 0) {
          setIsSubmitting(false)
          return
        }

        const { error } = await supabase.from('leave_requests').insert([
          {
            employee_id: formData.employee_id,
            leave_type: formData.leave_type,
            start_date: formData.start_date,
            end_date: formData.end_date,
            days_requested: daysRequested,
            reason: formData.reason || null,
            status: 'pending'
          }
        ])

        if (error) throw error

        resetForm()
        fetchLeaveRequests()
      } catch (error) {
        console.error('Error creating leave request:', error)
      } finally {
        if (isMountedRef.current) setIsSubmitting(false)
      }
    },
    [formData, calculateDays, resetForm, fetchLeaveRequests, datesInvalid]
  )

  const handleStatusChange = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      try {
        setIsLoading(true)
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
        if (isMountedRef.current) setIsLoading(false)
      }
    },
    [session?.user?.id, fetchLeaveRequests]
  )

  const formatDate = useCallback((dateString: string): string => {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [])

  const getLeaveTypeLabel = useCallback(
    (type: string): string => {
      return leaveTypesMap[type] || type
    },
    [leaveTypesMap]
  )

  const handleFormChange = useCallback(
    (field: keyof typeof INITIAL_FORM_DATA, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const isLoadingInitial = isLoading && leaveRequests.length === 0

  if (isLoadingInitial) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Solicitudes de Permisos</h2>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700">
          <PlusIcon className="h-5 w-5" />
          <span>Nueva Solicitud</span>
        </Button>
      </div>

      {showForm && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Nueva Solicitud de Permiso</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Empleado *</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => handleFormChange('employee_id', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-md text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  >
                    <option value="" className="text-gray-900">Seleccionar empleado</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id} className="text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Permiso *</label>
                  <select
                    value={formData.leave_type}
                    onChange={(e) => handleFormChange('leave_type', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-md text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  >
                    <option value="" className="text-gray-900">Seleccionar tipo</option>
                    {LEAVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value} className="text-gray-900">
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de Inicio *</label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de Fin *</label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              </div>

              {formData.start_date && formData.end_date && (
                <div className={`p-3 rounded-md ${datesInvalid ? 'bg-red-500/20' : 'bg-brand-500/20'}`}>
                  <p className={`text-sm ${datesInvalid ? 'text-red-400' : 'text-brand-400'}`}>
                    {datesInvalid
                      ? 'La fecha de fin no puede ser anterior a la fecha de inicio.'
                      : `Días solicitados: ${calculateDays(formData.start_date, formData.end_date)}`}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Motivo</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => handleFormChange('reason', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-md text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  placeholder="Motivo de la solicitud"
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit" disabled={isSubmitting || datesInvalid} className="bg-brand-600 hover:bg-brand-700">
                  {isSubmitting ? 'Creando...' : 'Crear Solicitud'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {leaveRequests.map((request) => (
          <Card key={request.id} variant="glass">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-white">
                      {request.employee?.first_name} {request.employee?.last_name}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_CONFIG[request.status].color}`}>
                      {STATUS_CONFIG[request.status].label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-300">Tipo:</span>
                      <p className="text-gray-400">{getLeaveTypeLabel(request.leave_type)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-300">Fechas:</span>
                      <p className="text-gray-400">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-300">Días:</span>
                      <p className="text-gray-400">{request.days_requested} días</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-300">Solicitado:</span>
                      <p className="text-gray-400">{formatDate(request.created_at)}</p>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-300">Motivo:</span>
                      <p className="text-gray-400 mt-1">{request.reason}</p>
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(request.id, 'approved')}
                      className="bg-emerald-600 hover:bg-emerald-700 flex items-center space-x-1"
                      disabled={isLoading}
                    >
                      <CheckIcon className="h-4 w-4" />
                      <span>Aprobar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(request.id, 'rejected')}
                      className="border-red-400/50 bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center space-x-1"
                      disabled={isLoading}
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

      {leaveRequests.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No hay solicitudes de permisos</p>
        </div>
      )}
    </div>
  )
}
