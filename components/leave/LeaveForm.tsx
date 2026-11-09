import { useTranslations } from 'next-intl'
import React, { useMemo, useRef, useEffect, useState } from 'react'
import type { LeaveFormEmployeeOption, LeaveRequest, LeaveType } from '../../lib/types/leave'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
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
  const tf = useTranslations('leave.form')
  const tc = useTranslations('common')
  const rich = {
    b: (chunks: React.ReactNode) => <span className="font-semibold text-white tabular-nums">{chunks}</span>,
    muted: (chunks: React.ReactNode) => <span className="text-gray-400">{chunks}</span>,
  }
  const [formData, setFormData] = useState<LeaveFormData>(LEAVE_FORM_INITIAL)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formEmployees, setFormEmployees] = useState<LeaveFormEmployeeOption[]>([])
  const [formEmployeesLoading, setFormEmployeesLoading] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false)
  const employeePickerRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!employeeMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = employeePickerRef.current
      if (el && !el.contains(e.target as Node)) setEmployeeMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [employeeMenuOpen])

  useEffect(() => {
    if (employeeMenuOpen) setEmployeeSearch('')
  }, [employeeMenuOpen])

  const filteredFormEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    const list = formEmployees
    if (!q) return list.slice(0, 12)
    return list
      .filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) || (emp.dni && emp.dni.toLowerCase().includes(q))
      )
      .slice(0, 12)
  }, [formEmployees, employeeSearch])

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
        toast.warning(tf('fileTitle'), tf('fileType'))
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.warning(tf('fileTitle'), tf('fileSize'))
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
    setEmployeeMenuOpen(false)
  }

  const clearFormEmployee = () => {
    setFormData((prev) => ({ ...prev, employee_dni: '' }))
    setEmployeeSearch('')
    setEmployeeMenuOpen(false)
  }

  const statutoryTypes = useMemo(() => leaveTypes.filter((t) => t.is_statutory === true), [leaveTypes])
  const companyPolicyTypes = useMemo(() => leaveTypes.filter((t) => !t.is_statutory), [leaveTypes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employee_dni || !formData.leave_type_id || !formData.start_date || !formData.end_date) {
      toast.warning(tf('formTitle'), tf('required'))
      return
    }
    if (!selectedPreview) {
      toast.warning(tf('employeeTitle'), tf('pickEmployee'))
      return
    }
    if (formData.duration_type === 'hours' && (!formData.duration_hours || formData.duration_hours <= 0)) {
      toast.warning(tf('durationTitle'), tf('needHours'))
      return
    }
    if (wouldExceed) {
      toast.warning(
        tf('limitTitle'),
        tf('overLimit', { max: maxDays ?? 0, type: selectedType?.name || tf('thisType') })
      )
      return
    }
    await onSubmit(formData, selectedFile)
    setFormData(LEAVE_FORM_INITIAL)
    setSelectedFile(null)
    setEmployeeSearch('')
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <Card variant="liquid" className="shadow-2xl border-white/20">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white text-xl font-bold">{tf('title')}</CardTitle>
        <p className="text-gray-300 text-sm mt-2">
          {tf('subtitle')}
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white mb-2">{tf('employee')}</label>
              <div ref={employeePickerRef} className="relative">
                <button
                  type="button"
                  disabled={formEmployeesLoading}
                  onClick={() => setEmployeeMenuOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/[0.07] px-4 py-3 text-left text-sm text-white transition hover:border-white/30 hover:bg-white/[0.1] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400/80"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {selectedPreview ? (
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium text-white">{selectedPreview.name}</span>
                        <span className="truncate text-xs text-gray-400">{selectedPreview.dni}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">{tf('selectEmployee')}</span>
                    )}
                  </span>
                  <ChevronDownIcon
                    className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${employeeMenuOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {formData.employee_dni && selectedPreview && (
                  <button
                    type="button"
                    onClick={clearFormEmployee}
                    className="mt-2 text-xs font-medium text-rose-300/90 hover:text-rose-200"
                  >
                    {tf('clearSelection')}
                  </button>
                )}
                {employeeMenuOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-white/15 bg-[#121a2e]/95 shadow-2xl shadow-black/40 backdrop-blur-md">
                    <div className="border-b border-white/10 p-2">
                      <input
                        type="text"
                        value={employeeSearch}
                        onChange={(e) => {
                          setEmployeeSearch(e.target.value)
                          if (formData.employee_dni) {
                            setFormData((prev) => ({ ...prev, employee_dni: '' }))
                          }
                        }}
                        placeholder={tf('searchPlaceholder')}
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {formEmployeesLoading ? (
                        <p className="px-3 py-4 text-center text-xs text-gray-400">{tf('loadingEmployees')}</p>
                      ) : filteredFormEmployees.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-gray-400">{tf('noMatches')}</p>
                      ) : (
                        filteredFormEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => pickFormEmployee(emp)}
                            className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
                          >
                            <span className="font-medium leading-tight">{emp.name}</span>
                            <span className="text-xs text-gray-400">{emp.dni}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {formEmployeesLoading && !employeeMenuOpen && (
                <p className="text-xs text-gray-400 mt-1">{tf('loadingEmployees')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">{tf('leaveType')}</label>
              <select
                name="leave_type_id"
                value={formData.leave_type_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/10 text-white"
                required
              >
                <option value="" className="bg-gray-800 text-white">
                  {tf('selectType')}
                </option>
                {statutoryTypes.length > 0 && (
                  <optgroup label={tf('statutoryGroup')} className="bg-gray-900 text-gray-200">
                    {statutoryTypes.map((type) => (
                      <option key={type.id} value={type.id} className="bg-gray-800 text-white">
                        {type.name}
                        {type.is_paid === false ? ' (sin goce)' : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {companyPolicyTypes.length > 0 && (
                  <optgroup label={tf('policyGroup')} className="bg-gray-900 text-gray-200">
                    {companyPolicyTypes.map((type) => (
                      <option key={type.id} value={type.id} className="bg-gray-800 text-white">
                        {type.name}
                        {type.is_paid === false ? ' (sin goce)' : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {leaveTypes.length === 0 && (
                <p className="mt-2 text-xs text-amber-200/90">
                  {tf('noTypes')}
                </p>
              )}
              {formData.leave_type_id && selectedType && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 space-y-1">
                  <p>
                    {tf.rich('used', { days: usedForSelected.toFixed(2), ...rich })}
                  </p>
                  {maxDays != null ? (
                    <p>
                      {tf.rich('cap', { max: maxDays, ...rich })}{' '}
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
                    <p className="text-gray-500">{tf('noCap')}</p>
                  )}
                  {proposed != null && (
                    <p className="text-gray-400">
                      {tf.rich('thisRequest', { days: proposed.toFixed(2), ...rich })}
                    </p>
                  )}
                  {wouldExceed && (
                    <p className="text-amber-200 font-medium">{tf('overCap')}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">{tf('durationType')}</label>
              <select
                name="duration_type"
                value={formData.duration_type}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/10 text-white"
                required
              >
                <option value="days" className="bg-gray-800 text-white">
                  {tf('days')}
                </option>
                <option value="hours" className="bg-gray-800 text-white">
                  {tf('hours')}
                </option>
              </select>
            </div>

            {formData.duration_type === 'hours' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-3">{tf('hoursDuration')}</label>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_half_day"
                      checked={formData.is_half_day}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                    />
                    <span className="text-white font-medium">{tf('halfDay')}</span>
                  </label>
                  {!formData.is_half_day && (
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">{tf('specificHours')}</label>
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
              <label className="block text-sm font-medium text-white mb-2">{tf('startDate')}</label>
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
              <label className="block text-sm font-medium text-white mb-2">{tf('endDate')}</label>
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
            <label className="block text-sm font-medium text-white mb-2">{tf('reason')}</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={3}
              placeholder={tf('reasonPlaceholder')}
              className="w-full px-4 py-3 border border-white/20 rounded-lg bg-white/10 text-white placeholder-gray-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-3">{tf('attachment')}</label>
            <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center bg-white/5">
              <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
              <label htmlFor="file-input" className="cursor-pointer">
                <p className="text-white font-medium">{tf('clickUpload')}</p>
                <p className="text-xs text-gray-400 mt-1">{tf('fileHint')}</p>
              </label>
            </div>
            {selectedFile && (
              <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{selectedFile.name}</p>
                  <p className="text-xs text-gray-300">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={removeFile} className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10">
                  {tf('remove')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {tc('cancel')}
            </Button>
            <Button type="submit" variant="default" disabled={isSubmitting} className="min-w-[10rem]">
              {isSubmitting ? tf('sending') : tf('send')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
