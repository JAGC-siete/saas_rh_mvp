// LeaveManager.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { PlusIcon, CheckIcon, XMarkIcon, CalendarIcon, DocumentIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useLeave } from '../lib/hooks/useLeave'
import { LeaveType } from '../lib/types/leave'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  dni: string
  company_id: string
  status: string
}

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pendiente' },
  approved: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Aprobada' },
  rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rechazada' }
} as const

const INITIAL_FORM_DATA = {
  employee_dni: '',
  leave_type_id: '',
  start_date: '',
  end_date: '',
  reason: '',
  attachment: null as File | null
}

export default function LeaveManager() {
  const session = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  // Use custom hook for leave operations
  const {
    leaveRequests,
    leaveTypes,
    isLoading,
    isSubmitting,
    error,
    fetchLeaveRequests,
    fetchLeaveTypes,
    createLeaveRequest,
    updateLeaveRequest,
    clearError
  } = useLeave()

  // Mount guard to avoid state updates after unmount
  const isMountedRef = useRef(true)
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setSelectedFile(null)
    setFilePreview(null)
    setShowForm(false)
    clearError()
  }, [clearError])

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/employees')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error fetching employees')
      }
      
      const { data } = await response.json()
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
      fetchLeaveTypes()
    }
  }, [session, fetchLeaveRequests, fetchEmployees, fetchLeaveTypes])

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.includes('pdf') && !file.type.includes('image')) {
        alert('Solo se permiten archivos PDF o imágenes (JPG, PNG)')
        return
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo no puede ser mayor a 10MB')
        return
      }

      setSelectedFile(file)
      
      // Create preview for images
      if (file.type.includes('image')) {
        const reader = new FileReader()
        reader.onload = (e) => setFilePreview(e.target?.result as string)
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }, [])

  const removeFile = useCallback(() => {
    setSelectedFile(null)
    setFilePreview(null)
    setFormData(prev => ({ ...prev, attachment: null }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (datesInvalid) return

      try {
        const daysRequested = calculateDays(formData.start_date, formData.end_date)
        if (daysRequested <= 0) {
          return
        }

        // Validate DNI exists
        const employeeExists = employees.find(emp => emp.dni === formData.employee_dni)
        if (!employeeExists) {
          alert('No se encontró un empleado con ese DNI')
          return
        }

        await createLeaveRequest({
          employee_dni: formData.employee_dni,
          leave_type_id: formData.leave_type_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason || undefined,
          attachment: selectedFile || undefined,
        })

        resetForm()
      } catch (error) {
        // Error is handled by the hook
        console.error('Error creating leave request:', error)
      }
    },
    [formData, calculateDays, resetForm, createLeaveRequest, datesInvalid, employees, selectedFile]
  )

  const handleStatusChange = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      try {
        await updateLeaveRequest(id, {
          status,
          rejection_reason: status === 'rejected' ? 'Rechazado por el administrador' : undefined
        })
      } catch (error) {
        // Error is handled by the hook
        console.error('Error updating leave request:', error)
      }
    },
    [updateLeaveRequest]
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

  const getLeaveTypeName = useCallback(
    (leaveTypeId: string): string => {
      const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId)
      return leaveType?.name || leaveTypeId
    },
    [leaveTypes]
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
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/50 rounded-md p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Button 
            onClick={clearError} 
            variant="outline" 
            size="sm" 
            className="mt-2 border-red-400/50 text-red-400 hover:bg-red-500/30"
          >
            Cerrar
          </Button>
        </div>
      )}

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
            <p className="text-sm text-gray-300">Registro de permisos previamente autorizados</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">DNI del Empleado *</label>
                  <Input
                    type="text"
                    value={formData.employee_dni}
                    onChange={(e) => handleFormChange('employee_dni', e.target.value)}
                    required
                    placeholder="Ingrese el DNI del empleado"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  />
                  {formData.employee_dni && (
                    <p className="text-xs text-gray-400 mt-1">
                      {employees.find(emp => emp.dni === formData.employee_dni)?.first_name 
                        ? `Empleado: ${employees.find(emp => emp.dni === formData.employee_dni)?.first_name} ${employees.find(emp => emp.dni === formData.employee_dni)?.last_name}`
                        : 'DNI no encontrado en la base de datos'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Permiso *</label>
                  <select
                    value={formData.leave_type_id}
                    onChange={(e) => handleFormChange('leave_type_id', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-md text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  >
                    <option value="" className="text-gray-900">Seleccionar tipo</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id} className="text-gray-900">
                        {type.name}
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
                  placeholder="Descripción del motivo del permiso"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Comprobante/Respaldo (PDF o JPG)
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center">
                  {!selectedFile ? (
                    <div>
                      <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-brand-400 hover:text-brand-300">Seleccionar archivo</span>
                          <span className="text-gray-400"> o arrastrar y soltar</span>
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, JPG, PNG hasta 10MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <DocumentIcon className="h-10 w-10 text-gray-400" />
                        )}
                        <div className="text-left">
                          <p className="text-sm text-white">{selectedFile.name}</p>
                          <p className="text-xs text-gray-400">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={removeFile}
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-400/50 hover:bg-red-500/20"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
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
                    <span className="text-sm text-gray-400">DNI: {request.employee_dni}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_CONFIG[request.status].color}`}>
                      {STATUS_CONFIG[request.status].label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-300">Tipo:</span>
                      <p className="text-gray-400">{getLeaveTypeName(request.leave_type_id)}</p>
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

                  {request.attachment_url && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-300">Comprobante:</span>
                      <div className="mt-1">
                        <a
                          href={request.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-brand-400 hover:text-brand-300"
                        >
                          <DocumentIcon className="h-4 w-4" />
                          <span>{request.attachment_name || 'Ver archivo'}</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(request.id, 'approved')}
                      className="bg-emerald-600 hover:bg-emerald-700 flex items-center space-x-1"
                      disabled={isSubmitting}
                    >
                      <CheckIcon className="h-4 w-4" />
                      <span>Aprobar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(request.id, 'rejected')}
                      className="border-red-400/50 bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center space-x-1"
                      disabled={isSubmitting}
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
