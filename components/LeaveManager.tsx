// LeaveManager.tsx
import React, { useState, useEffect } from 'react'
import { useLeave } from '../lib/hooks/useLeave'
import { LeaveType, LeaveRequest, CreateLeaveRequestData } from '../lib/types/leave'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface FormData {
  employee_dni: string
  leave_type_id: string
  start_date: string
  end_date: string
  duration_type: 'hours' | 'days'
  duration_hours?: number
  is_half_day: boolean
  reason: string
}

const INITIAL_FORM_DATA: FormData = {
  employee_dni: '',
  leave_type_id: '',
  start_date: '',
  end_date: '',
  duration_type: 'days',
  duration_hours: undefined,
  is_half_day: false,
  reason: ''
}

export default function LeaveManager() {
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
    deleteLeaveRequest
  } = useLeave()

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchLeaveRequests()
    fetchLeaveTypes()
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Auto-calculate duration_hours for hourly permissions
    if (name === 'duration_type' && value === 'hours') {
      setFormData(prev => ({ ...prev, duration_hours: 8 }))
    } else if (name === 'duration_type' && value === 'days') {
      setFormData(prev => ({ ...prev, duration_hours: undefined }))
    }
    
    // Handle half-day toggle
    if (name === 'is_half_day') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ 
        ...prev, 
        is_half_day: checked,
        duration_hours: checked ? 4 : 8
      }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        alert('Solo se permiten archivos PDF o JPG')
        return
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo debe ser menor a 5MB')
        return
      }
      
      setSelectedFile(file)
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => setFilePreview(e.target?.result as string)
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employee_dni || !formData.leave_type_id || !formData.start_date || !formData.end_date) {
      alert('Por favor complete todos los campos obligatorios')
      return
    }

    // Validate employee exists
    const employee = employees.find(emp => emp.dni === formData.employee_dni)
    if (!employee) {
      alert('DNI no encontrado en la base de datos')
      return
    }

    // Validate duration for hourly permissions
    if (formData.duration_type === 'hours' && (!formData.duration_hours || formData.duration_hours <= 0)) {
      alert('Para permisos por horas, debe especificar la duración')
      return
    }

    try {
      await createLeaveRequest({
        employee_dni: formData.employee_dni,
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        duration_type: formData.duration_type,
        duration_hours: formData.duration_hours,
        is_half_day: formData.is_half_day,
        reason: formData.reason || undefined,
        attachment: selectedFile || undefined
      })

      setFormData(INITIAL_FORM_DATA)
      setSelectedFile(null)
      setFilePreview(null)
      setShowForm(false)
      fetchLeaveRequests()
    } catch (error) {
      console.error('Error creating leave request:', error)
    }
  }

  const getLeaveTypeName = (leaveTypeId: string) => {
    const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId)
    return leaveType ? leaveType.name : 'Tipo no encontrado'
  }

  const getEmployeeName = (dni: string) => {
    const employee = employees.find(emp => emp.dni === dni)
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Empleado no encontrado'
  }

  const formatDuration = (request: LeaveRequest) => {
    if (request.duration_type === 'hours') {
      if (request.is_half_day) {
        return '4 horas (Medio día)'
      }
      return `${request.duration_hours || 8} horas`
    }
    return `${request.days_requested} días`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Solicitud de Permisos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancelar' : 'Nueva Solicitud'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <Card variant="glass" className="mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl">Registrar Permiso Pre-autorizado</CardTitle>
          </CardHeader>
          <CardContent>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee DNI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DNI del Empleado *
                </label>
                <input
                  type="text"
                  name="employee_dni"
                  value={formData.employee_dni}
                  onChange={handleInputChange}
                  placeholder="Ej: 0801-2003-14588"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {formData.employee_dni && (
                  <p className="text-sm text-gray-600 mt-1">
                    Empleado: {getEmployeeName(formData.employee_dni)}
                  </p>
                )}
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Permiso *
                </label>
                <select
                  name="leave_type_id"
                  value={formData.leave_type_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Duración *
                </label>
                <select
                  name="duration_type"
                  value={formData.duration_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="days">Días</option>
                  <option value="hours">Horas</option>
                </select>
              </div>

              {/* Duration Hours (for hourly permissions) */}
              {formData.duration_type === 'hours' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración en Horas
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_half_day"
                        checked={formData.is_half_day}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      Medio día (4 horas)
                    </label>
                    {!formData.is_half_day && (
                      <input
                        type="number"
                        name="duration_hours"
                        value={formData.duration_hours || ''}
                        onChange={handleInputChange}
                        min="1"
                        max="24"
                        placeholder="8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Fin *
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del Permiso
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describa el motivo del permiso..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* File Attachment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo de Respaldo (PDF o JPG)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="space-y-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="text-gray-600">
                      <span className="font-medium">Haga clic para subir</span> o arrastre y suelte
                    </div>
                    <p className="text-xs text-gray-500">PDF o JPG hasta 5MB</p>
                  </div>
                </label>
              </div>
              
              {selectedFile && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">PDF</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setFormData(INITIAL_FORM_DATA)
                  setSelectedFile(null)
                  setFilePreview(null)
                  setShowForm(false)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
          </CardContent>
        </Card>
      )}

      {/* Leave Requests List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white text-xl">Solicitudes de Permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fechas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getEmployeeName(request.employee_dni)}
                      </div>
                      <div className="text-sm text-gray-500">DNI: {request.employee_dni}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getLeaveTypeName(request.leave_type_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(request)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Inicio: {new Date(request.start_date).toLocaleDateString()}</div>
                      <div>Fin: {new Date(request.end_date).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status === 'pending' ? 'Pendiente' : 
                       request.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.attachment_url ? (
                      <a
                        href={request.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Ver archivo
                      </a>
                    ) : (
                      <span className="text-gray-400">Sin archivo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateLeaveRequest(request.id, { status: 'approved' })}
                            className="text-green-600 hover:text-green-900"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => updateLeaveRequest(request.id, { status: 'rejected' })}
                            className="text-red-600 hover:text-red-900"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteLeaveRequest(request.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          
          {leaveRequests.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No hay solicitudes de permisos registradas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
