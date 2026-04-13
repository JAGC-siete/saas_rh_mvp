import React, { useMemo, useRef, useEffect, useState } from 'react'
import type { LeaveFormEmployeeOption, LeaveRequest, LeaveType } from '../../lib/types/leave'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import EmployeeCell from '../common/EmployeeCell'
import {
  proposedDaysFromForm,
  usedDaysByTypeForEmployee,
} from './leaveUtils'

export interface LeaveFormData {
  employee_dni: string
  leave_type_id: string
  start_date: string
  end_date: string
  duration_type: 'hours' | 'days'
  duration_hours?: number
  is_half_day: boolean
  reason: string
}

export const LEAVE_FORM_INITIAL: LeaveFormData = {
  employee_dni: '',
  leave_type_id: '',
  start_date: '',
  end_date: '',
  duration_type: 'days',
  duration_hours: undefined,
  is_half_day: false,
  reason: '',
}

export interface LeaveFormProps {
  leaveTypes: LeaveType[]
  leaveRequests: LeaveRequest[]
  isSubmitting: boolean
  onSubmit: (data: LeaveFormData, attachment: File | null) => Promise<void>
  onCancel: () => void
  toast: {
    warning: (title: string, message: string) => void
  }
}

export default function LeaveForm({
  leaveTypes,
  leaveRequests,
  isSubmitting,
  onSubmit,
  onCancel,
  toast,
}: LeaveFormProps) {
  const [formData, setFormData] = useState<LeaveFormData>(LEAVE_FORM_INITIAL)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formEmployees, setFormEmployees] = useState<LeaveFormEmployeeOption[]>([])
  const [formEmployeesLoading, setFormEmployeesLoading] = useState(false)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
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
  }, [])

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

  const selectedPreview = formEmployees.find((e) => e.dni === formData.employee_dni)

  const usedByType = useMemo(() => {
    if (!formData.employee_dni || !selectedPreview) return new Map<string, number>()
    return usedDaysByTypeForEmployee(
      leaveRequests,
      formData.employee_dni,
      selectedPreview.id,
      true
    )
  }, [formData.employee_dni, selectedPreview, leaveRequests])

  const selectedType = leaveTypes.find((t) => t.id === formData.leave_type_id)
  const usedForSelected = formData.leave_type_id ? usedByType.get(formData.leave_type_id) || 0 : 0
  const proposed = proposedDaysFromForm(formData)
  const maxDays = selectedType?.max_days_per_year
  const wouldExceed =
    maxDays != null &&
    proposed != null &&
    usedForSelected + proposed > maxDays

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
    if (!selectedPreview) {
      toast.warning('Empleado', 'Seleccione un empleado de la lista de resultados.')
      return
    }
    if (formData.duration_type === 'hours' && (!formData.duration_hours || formData.duration_hours <= 0)) {
      toast.warning('Duración', 'Para permisos por horas, indique la duración.')
      return
    }
    if (wouldExceed) {
      toast.warning(
        'Límite anual',
        `Con esta solicitud superaría el tope de ${maxDays} días para ${selectedType?.name || 'este tipo'}.`
      )
      return
    }
    await onSubmit(formData, selectedFile)
    setFormData(LEAVE_FORM_INITIAL)
    setSelectedFile(null)
    setEmployeeQuery('')
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <Card variant="glass" className="shadow-2xl border-white/20">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white text-xl font-bold">Registrar permiso pre-autorizado</CardTitle>
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
              {formEmployeesLoading && <p className="text-xs text-gray-400 mt-1">Cargando empleados…</p>}
              {!formEmployeesLoading && filteredFormEmployees.length > 0 && (
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
              <label className="block text-sm font-medium text-white mb-2">Tipo de permiso *</label>
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
              {formData.leave_type_id && selectedType && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 space-y-1">
                  <p>
                    <span className="text-gray-400">Usados (aprobados + pendientes):</span>{' '}
                    <span className="font-semibold text-white tabular-nums">{usedForSelected.toFixed(2)}</span> días
                  </p>
                  {maxDays != null ? (
                    <p>
                      <span className="text-gray-400">Tope anual:</span>{' '}
                      <span className="font-semibold text-white">{maxDays}</span> días ·{' '}
                      <span className="text-gray-400">Restantes:</span>{' '}
                      <span
                        className={
                          usedForSelected >= maxDays
                            ? 'text-amber-300 font-semibold'
                            : 'text-emerald-300 font-semibold'
                        }
                      >
                        {Math.max(0, maxDays - usedForSelected).toFixed(2)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-gray-500">Sin tope anual definido para este tipo.</p>
                  )}
                  {proposed != null && (
                    <p className="text-gray-400">
                      Esta solicitud: ~<span className="text-white font-medium">{proposed.toFixed(2)}</span> días
                    </p>
                  )}
                  {wouldExceed && (
                    <p className="text-amber-200 font-medium">Supera el tope con los datos actuales.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Tipo de duración *</label>
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
                <label className="block text-sm font-medium text-white mb-3">Duración en horas</label>
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
              <label className="block text-sm font-medium text-white mb-2">Fecha de inicio *</label>
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
              <label className="block text-sm font-medium text-white mb-2">Fecha de fin *</label>
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
            <label className="block text-sm font-medium text-white mb-2">Motivo del permiso</label>
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
            <label className="block text-sm font-medium text-white mb-3">Archivo de respaldo (PDF o JPG)</label>
            <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center bg-white/5">
              <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
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
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" variant="default" disabled={isSubmitting} className="min-w-[10rem]">
              {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
