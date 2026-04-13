// LeaveManager.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useLeave } from '../lib/hooks/useLeave'
import type {
  LeaveRequest,
  LeaveAttendanceSummaryPayload,
  LeaveFormEmployeeOption,
} from '../lib/types/leave'
import { cn } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { formatDateForHonduras } from '../lib/timezone'
import { useToast } from '../lib/toast'
import EmployeeCell from './common/EmployeeCell'

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
  reason: '',
}

function attendanceDashboardHref(request: LeaveRequest): string {
  const employeeId = request.employee_id || request.employee?.id || ''
  const from = request.start_date.slice(0, 10)
  const to = request.end_date.slice(0, 10)
  const q = new URLSearchParams({
    preset: 'custom',
    employee_id: employeeId,
    from,
    to,
  })
  return `/app/attendance/dashboard?${q.toString()}`
}

type LeavePanel = 'list' | 'form'

function summaryLabelEs(s: string): string {
  switch (s) {
    case 'presente':
      return 'Presente'
    case 'ausente':
      return 'Ausente'
    case 'sin_datos':
      return 'Sin datos'
    default:
      return s
  }
}

export default function LeaveManager() {
  const toast = useToast()
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
    deleteLeaveRequest,
  } = useLeave()

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formEmployees, setFormEmployees] = useState<LeaveFormEmployeeOption[]>([])
  const [formEmployeesLoading, setFormEmployeesLoading] = useState(false)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [panel, setPanel] = useState<LeavePanel>('list')
  const formEmployeesFetchedForOpen = useRef(false)

  const [summaryExpandedId, setSummaryExpandedId] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<LeaveAttendanceSummaryPayload | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    fetchLeaveRequests()
    fetchLeaveTypes()
  }, [fetchLeaveRequests, fetchLeaveTypes])

  useEffect(() => {
    if (panel !== 'form') {
      formEmployeesFetchedForOpen.current = false
      setEmployeeQuery('')
      return
    }
    if (formEmployeesFetchedForOpen.current) return
    formEmployeesFetchedForOpen.current = true
    ;(async () => {
      setFormEmployeesLoading(true)
      try {
        const response = await fetch('/api/employees')
        if (response.ok) {
          const data = await response.json()
          setFormEmployees(data.employees || [])
        }
      } catch (e) {
        console.error('Error fetching employees:', e)
      } finally {
        setFormEmployeesLoading(false)
      }
    })()
  }, [panel])

  const filteredFormEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase()
    const list = formEmployees
    if (!q) return list.slice(0, 12)
    return list
      .filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) || (emp.dni && emp.dni.toLowerCase().includes(q))
      )
      .slice(0, 12)
  }, [formEmployees, employeeQuery])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    if (name === 'duration_type' && value === 'hours') {
      setFormData((prev) => ({ ...prev, duration_hours: 8 }))
    } else if (name === 'duration_type' && value === 'days') {
      setFormData((prev) => ({ ...prev, duration_hours: undefined }))
    }

    if (name === 'is_half_day') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({
        ...prev,
        is_half_day: checked,
        duration_hours: checked ? 4 : 8,
      }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.warning('Archivo', 'Solo se permiten PDF o JPG.')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.warning('Archivo', 'El archivo debe ser menor a 5 MB.')
        return
      }

      setSelectedFile(file)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const pickFormEmployee = (emp: LeaveFormEmployeeOption) => {
    setFormData((prev) => ({ ...prev, employee_dni: emp.dni }))
    setEmployeeQuery(`${emp.name} (${emp.dni})`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.employee_dni || !formData.leave_type_id || !formData.start_date || !formData.end_date) {
      toast.warning('Formulario', 'Complete los campos obligatorios.')
      return
    }

    const employee = formEmployees.find((emp) => emp.dni === formData.employee_dni)
    if (!employee) {
      toast.warning('Empleado', 'Seleccione un empleado de la lista de resultados.')
      return
    }

    if (formData.duration_type === 'hours' && (!formData.duration_hours || formData.duration_hours <= 0)) {
      toast.warning('Duración', 'Para permisos por horas, indique la duración.')
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
        attachment: selectedFile || undefined,
      })

      setFormData(INITIAL_FORM_DATA)
      setSelectedFile(null)
      setEmployeeQuery('')
      setPanel('list')
      fetchLeaveRequests()
      toast.success('Permiso', 'Solicitud registrada correctamente.')
    } catch (err) {
      console.error('Error creating leave request:', err)
    }
  }

  const getLeaveTypeName = (request: LeaveRequest) => {
    if (request.leave_type?.name) return request.leave_type.name
    const leaveType = leaveTypes.find((lt) => lt.id === request.leave_type_id)
    return leaveType ? leaveType.name : 'Tipo no encontrado'
  }

  const displayEmployeeName = (request: LeaveRequest) =>
    request.employee?.name?.trim() || '—'

  const displayEmployeeDni = (request: LeaveRequest) =>
    request.employee?.dni || request.employee_dni

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
      case 'approved':
        return 'text-emerald-200 bg-emerald-500/15 border border-emerald-400/35'
      case 'rejected':
        return 'text-rose-200 bg-rose-500/15 border border-rose-400/35'
      default:
        return 'text-amber-100 bg-amber-500/15 border border-amber-400/35'
    }
  }

  const toggleAttendanceSummary = useCallback(
    async (requestId: string) => {
      if (summaryExpandedId === requestId) {
        setSummaryExpandedId(null)
        setSummaryData(null)
        return
      }
      setSummaryExpandedId(requestId)
      setSummaryLoading(true)
      setSummaryData(null)
      try {
        const res = await fetch(`/api/leave/${requestId}?attendance_summary=1`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.message || json.error || 'Error al cargar resumen')
        setSummaryData(json.data as LeaveAttendanceSummaryPayload)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al cargar resumen'
        toast.error('Asistencia', msg)
        setSummaryExpandedId(null)
        setSummaryData(null)
      } finally {
        setSummaryLoading(false)
      }
    },
    [summaryExpandedId, toast]
  )

  const selectedPreview = formEmployees.find((e) => e.dni === formData.employee_dni)

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center gap-3 py-16" role="status" aria-live="polite">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand-500"
          aria-hidden
        />
        <p className="text-sm text-gray-400">Cargando solicitudes…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      <div
        role="tablist"
        aria-label="Vista de permisos"
        className="flex flex-wrap gap-2 border-b border-white/10 pb-4"
      >
        <Button
          type="button"
          role="tab"
          aria-selected={panel === 'list'}
          variant={panel === 'list' ? 'default' : 'secondary'}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium shadow-none hover:translate-y-0 active:translate-y-0',
            panel !== 'list' &&
              'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
          )}
          onClick={() => setPanel('list')}
        >
          Listado
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={panel === 'form'}
          variant={panel === 'form' ? 'default' : 'secondary'}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium shadow-none hover:translate-y-0 active:translate-y-0',
            panel !== 'form' &&
              'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
          )}
          onClick={() => setPanel('form')}
        >
          Nueva solicitud
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {panel === 'form' && (
        <Card variant="glass" className="mb-6 shadow-2xl border-white/20">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white text-xl font-bold">Registrar Permiso Pre-autorizado</CardTitle>
            <p className="text-gray-300 text-sm mt-2">
              Complete los datos del empleado y el tipo de permiso solicitado
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Empleado *</label>
                  <input
                    type="text"
                    value={employeeQuery}
                    onChange={(e) => setEmployeeQuery(e.target.value)}
                    placeholder="Buscar por nombre o DNI…"
                    className="w-full px-4 py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/10 text-white placeholder-gray-300"
                    disabled={formEmployeesLoading}
                  />
                  {formEmployeesLoading && (
                    <p className="text-xs text-gray-400 mt-1">Cargando empleados…</p>
                  )}
                  {!formEmployeesLoading && panel === 'form' && filteredFormEmployees.length > 0 && (
                    <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
                      {filteredFormEmployees.map((emp) => (
                        <li key={emp.id}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => pickFormEmployee(emp)}
                            className="h-auto w-full justify-start rounded-none px-3 py-2 text-sm font-normal text-white hover:bg-white/10"
                          >
                            {emp.name} — {emp.dni}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {formData.employee_dni && selectedPreview && (
                    <div className="mt-2 p-2 bg-white/5 rounded-md border border-white/10">
                      <EmployeeCell
                        name={selectedPreview.name}
                        dni={selectedPreview.dni}
                        nameClassName="text-sm font-medium text-blue-200"
                        dniClassName="text-sm text-gray-300"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Tipo de Permiso *</label>
                  <select
                    name="leave_type_id"
                    value={formData.leave_type_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/10 text-white"
                    required
                  >
                    <option value="" className="bg-gray-800 text-white">
                      Seleccionar tipo
                    </option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id} className="bg-gray-800 text-white">
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Tipo de Duración *</label>
                  <select
                    name="duration_type"
                    value={formData.duration_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/10 text-white"
                    required
                  >
                    <option value="days" className="bg-gray-800 text-white">
                      Días
                    </option>
                    <option value="hours" className="bg-gray-800 text-white">
                      Horas
                    </option>
                  </select>
                </div>

                {formData.duration_type === 'hours' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white mb-3">Duración en Horas</label>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="is_half_day"
                          checked={formData.is_half_day}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                        />
                        <span className="text-white font-medium">Medio día (4 horas)</span>
                      </label>
                      {!formData.is_half_day && (
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Horas específicas:</label>
                          <input
                            type="number"
                            name="duration_hours"
                            value={formData.duration_hours || ''}
                            onChange={handleInputChange}
                            min={1}
                            max={24}
                            placeholder="8"
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Fecha de Inicio *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-white/20 rounded-lg bg-white/10 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Fecha de Fin *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-white/20 rounded-lg bg-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Motivo del Permiso</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describa el motivo del permiso..."
                  className="w-full px-4 py-3 border border-white/20 rounded-lg bg-white/10 text-white placeholder-gray-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Archivo de Respaldo (PDF o JPG)</label>
                <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center bg-white/5">
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <p className="text-white font-medium">Haga clic para subir</p>
                    <p className="text-xs text-gray-400 mt-1">PDF o JPG hasta 5MB</p>
                  </label>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{selectedFile.name}</p>
                      <p className="text-xs text-gray-300">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={removeFile} className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10">
                      Quitar
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFormData(INITIAL_FORM_DATA)
                    setSelectedFile(null)
                    setEmployeeQuery('')
                    setPanel('list')
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="default" disabled={isSubmitting} className="min-w-[10rem]">
                  {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {panel === 'list' && (
      <Card variant="glass" className="border border-white/10">
        <CardHeader className="border-b border-white/10 pb-3">
          <CardTitle className="text-white text-lg font-semibold tracking-tight">Solicitudes</CardTitle>
          <p className="text-xs text-gray-400 mt-1 font-normal">
            Aprobación, rechazo y vínculo con asistencia por fila.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300/30">
              <thead className="bg-white/10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Duración</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Fechas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Archivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Asistencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300/30">
                {leaveRequests.map((request) => (
                  <React.Fragment key={request.id}>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <EmployeeCell
                          name={displayEmployeeName(request)}
                          dni={displayEmployeeDni(request)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-400/20 text-blue-200 border border-blue-400/30">
                          {getLeaveTypeName(request)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatDuration(request)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        <div>Inicio: {formatDateForHonduras(request.start_date)}</div>
                        <div>Fin: {formatDateForHonduras(request.end_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                        >
                          {request.status === 'pending'
                            ? 'Pendiente'
                            : request.status === 'approved'
                              ? 'Aprobado'
                              : 'Rechazado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {request.attachment_url ? (
                          <a
                            href={request.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-400 font-medium hover:text-brand-300 underline-offset-2 hover:underline"
                          >
                            Ver archivo
                          </a>
                        ) : (
                          <span className="text-gray-400">Sin archivo</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1">
                          {(request.employee_id || request.employee?.id) && (
                            <Link
                              href={attendanceDashboardHref(request)}
                            className="text-brand-400 font-medium hover:text-brand-300 underline-offset-2 hover:underline"
                          >
                            Ver en dashboard
                          </Link>
                          )}
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => toggleAttendanceSummary(request.id)}
                            className="h-auto min-h-0 justify-start p-0 text-sm font-normal"
                          >
                            {summaryExpandedId === request.id ? 'Ocultar resumen' : 'Resumen días'}
                          </Button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-wrap gap-1.5">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => updateLeaveRequest(request.id, { status: 'approved' })}
                                className="text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200"
                              >
                                Aprobar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => updateLeaveRequest(request.id, { status: 'rejected' })}
                                className="text-rose-300 hover:bg-rose-500/15 hover:text-rose-200"
                              >
                                Rechazar
                              </Button>
                            </>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteLeaveRequest(request.id)}
                            className="text-gray-400 hover:bg-white/10 hover:text-rose-300"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {summaryExpandedId === request.id && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-black/25 border-t border-white/10">
                          {summaryLoading && (
                            <p className="text-sm text-gray-300">Cargando asistencia en el rango del permiso…</p>
                          )}
                          {!summaryLoading && summaryData && (
                            <div className="flex flex-wrap gap-2">
                              {summaryData.days.length === 0 ? (
                                <span className="text-gray-400 text-sm">Sin fechas en el rango.</span>
                              ) : (
                                summaryData.days.map((d) => (
                                  <span
                                    key={d.date}
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs border ${
                                      d.summary === 'presente'
                                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100'
                                        : d.summary === 'ausente'
                                          ? 'bg-red-500/15 border-red-400/40 text-red-100'
                                          : 'bg-gray-500/15 border-gray-400/30 text-gray-200'
                                    }`}
                                    title={d.record_status || undefined}
                                  >
                                    <span className="font-mono">{d.date}</span>
                                    <span>{summaryLabelEs(d.summary)}</span>
                                  </span>
                                ))
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {leaveRequests.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-300 text-lg font-medium">No hay solicitudes de permisos registradas</div>
              <div className="text-gray-400 text-sm mt-2">
                Las solicitudes aparecerán aquí una vez que sean creadas
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  )
}
