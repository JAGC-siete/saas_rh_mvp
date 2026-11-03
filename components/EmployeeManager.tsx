import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { useAuth } from '../lib/auth'
import { useCompanyContext } from '../lib/useCompanyContext'
import { useCompanyMoney } from '../lib/hooks/useCompanyMoney'
import { EmployeeShaped, isSalaryMasked } from '../lib/types/employee-shaped'
import { useSalaryFieldAccess } from '../lib/hooks/useSalaryFieldAccess'
import SensitiveField from './security/SensitiveField'
import AddEmployeeForm from './AddEmployeeForm'
import WorkCertificateModal from './WorkCertificateModal'
import EmployeeFileUpload from './EmployeeFileUpload'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, DocumentTextIcon, UserCircleIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline'
import { Download } from 'lucide-react'
import { ExportFormatButtons } from './ui/ExportFormatButtons'
import { getHondurasTimestamp, formatTimeDisplay, formatDateOnlyForHonduras, parseDateOnlyAsHonduras, HONDURAS_TIMEZONE } from '../lib/timezone'
import {
  TERMINATION_REASON_OPTIONS,
  getTerminationReasonLabel
} from '../lib/employees/termination-reasons'
import {
  isEnlaceCompany,
  resolveEnlaceEmployeeCode,
  suggestEnlaceEmployeeCode,
} from '../lib/employees/enlace-employee-code'
import {
  groupKeyForRow,
  type PlanillaRowForGrouping,
  type PayrollPdfGroupBy
} from '../lib/payroll/pdf-layout'

type EmployeeListSortBy = 'name' | Exclude<PayrollPdfGroupBy, 'none'>

interface Department {
  id: string
  name: string
}

interface WorkSchedule {
  id: string
  name: string
}

const INITIAL_FORM_DATA = {
  employee_code: '',
  dni: '',
  name: '',
  email: '',
  phone: '',
  role: '',
  team: '',
  department_id: '',
  work_schedule_id: '',
  base_salary: '',
  pay_type: '', // vacío = default de empresa (hereda calculation_mode)
  attendance_required: true,
  pay_overtime: true,
  payment_frequency: '', // vacío = usa default de empresa (Capa 2)
  hire_date: '',
  termination_date: '',
  status: 'active',
  bank_name: '',
  bank_account: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address: '',
  metadata: '',
  termination_reason_code: '',
  termination_reason_detail: ''
}

const EMPLOYEE_DETAIL_TABS = [
  { id: 'personal' },
  { id: 'contract' },
  { id: 'attendance' },
  { id: 'discipline' },
  { id: 'emergency' },
  { id: 'files' }
] as const
const DOCUMENT_CATEGORIES = ['contrato', 'identidad', 'certificado', 'diploma', 'otro'] as const

const formatDateDisplay = (value: string | null | undefined, locale: string, empty: string) => {
  if (!value) return empty
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parseDateOnlyAsHonduras(value)
    return isNaN(d.getTime()) ? value : d.toLocaleDateString(locale, {
      timeZone: HONDURAS_TIMEZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateTimeDisplay = (value: string | null | undefined, locale: string, empty: string) => {
  if (!value) return empty
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const parseMaybeJsonObject = (value: unknown): Record<string, any> | null => {
  if (!value) return null
  if (typeof value === 'object') {
    return value as Record<string, any>
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, any> : null
    } catch {
      return null
    }
  }
  return null
}

const formatAddress = (address: EmployeeShaped['address'], empty: string) => {
  if (!address) return empty

  if (typeof address === 'string') {
    const trimmed = address.trim()
    if (!trimmed) return empty
    // Legacy rows may still hold a JSON object string after migration edge-cases.
    const parsed = parseMaybeJsonObject(trimmed)
    if (parsed) {
      const values = Object.values(parsed).filter(Boolean)
      return values.length ? values.join(', ') : trimmed
    }
    return trimmed
  }

  if (typeof address === 'object') {
    const values = Object.values(address as Record<string, unknown>).filter(Boolean)
    return values.length ? values.join(', ') : empty
  }

  return String(address)
}

const EMPLOYEE_SORT_CYCLE: EmployeeListSortBy[] = ['name', 'department', 'team', 'position']

function employeeToPlanillaRow(emp: EmployeeShaped): PlanillaRowForGrouping {
  return {
    department: emp.departments?.name,
    team: emp.team,
    role: emp.role,
    position: emp.role,
  }
}

export default function EmployeeManager({ companyId: propCompanyId }: { companyId?: string }) {
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const locale = useLocale()
  const fmtDate = (value?: string | null) => formatDateDisplay(value, locale, tc('notSpecifiedF'))
  const fmtDateTime = (value?: string | null) => formatDateTimeDisplay(value, locale, tc('notSpecified'))
  const sectionHeading = (sortBy: Exclude<EmployeeListSortBy, 'name'>, gkey: string) =>
    sortBy === 'department'
      ? t('sectionDepartment', { name: gkey })
      : sortBy === 'team'
        ? t('sectionTeam', { name: gkey })
        : t('sectionPosition', { name: gkey })
  const docCategoryLabel = (cat: string) =>
    (DOCUMENT_CATEGORIES as readonly string[]).includes(cat) ? t(`docCategories.${cat as (typeof DOCUMENT_CATEGORIES)[number]}`) : cat
  const terminationReasonLabel = (code: string | null | undefined) => {
    const known = TERMINATION_REASON_OPTIONS.some((o) => o.code === code?.trim())
    return known ? t(`terminationReasons.${code!.trim()}` as 'terminationReasons.otro') : getTerminationReasonLabel(code)
  }
  const { user, loading: sessionLoading, userProfile } = useAuth()
  const { companyId: contextCompanyId, loading: companyLoading } = useCompanyContext()
  const { format: formatMoney, mask: salaryMask } = useCompanyMoney()
  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return tc('notSpecified')
    return formatMoney(value)
  }
  
  // Usar companyId de props si está disponible, sino del contexto
  const companyId = propCompanyId || contextCompanyId
  const { canViewSalary, canEditSalary, salaryDisplayMode } = useSalaryFieldAccess()
  
  const [employees, setEmployees] = useState<EmployeeShaped[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [employeesError, setEmployeesError] = useState<string | null>(null)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [schedulesError, setSchedulesError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeShaped | null>(null)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState<EmployeeShaped | null>(null)
  const [terminationDate, setTerminationDate] = useState('')
  const [terminationReasonCode, setTerminationReasonCode] = useState('')
  const [terminationReasonDetail, setTerminationReasonDetail] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeShaped | null>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [employeeForCertificate, setEmployeeForCertificate] = useState<EmployeeShaped | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [companyCalculationMode, setCompanyCalculationMode] = useState<'daily' | 'hourly' | 'admin_floor'>('daily')
  const [sortBy, setSortBy] = useState<EmployeeListSortBy>('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [uploadedProfileImagePath, setUploadedProfileImagePath] = useState<string | null>(null)
  const [profileImageError, setProfileImageError] = useState<string | null>(null)
  const [selectedEmployeeImageUrl, setSelectedEmployeeImageUrl] = useState<string | null>(null)
  const [selectedEmployeeImageLoading, setSelectedEmployeeImageLoading] = useState(false)
  const [selectedEmployeeImageError, setSelectedEmployeeImageError] = useState<string | null>(null)
  const [detailsActiveTab, setDetailsActiveTab] = useState<(typeof EMPLOYEE_DETAIL_TABS)[number]['id']>('personal')
  const [employeeFiles, setEmployeeFiles] = useState<Array<{ id: string; file_name: string; file_type: string; document_category?: string; file_size_bytes: number; signed_url?: string }>>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [documentCategoryForUpload, setDocumentCategoryForUpload] = useState<'contrato' | 'identidad' | 'certificado' | 'diploma' | 'otro'>('contrato')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv' | null>(null)
  const [exportFilters, setExportFilters] = useState({
    status: [] as string[],
    departmentIds: [] as string[],
    employeeIds: [] as string[]
  })
  const [isExporting, setIsExporting] = useState(false)

  const canSendInstantMessage = userProfile?.role === 'company_admin'

  const getWhatsAppLink = useCallback((phone: string | null, employeeName: string | null) => {
    if (!phone) return null
    const digits = phone.replace(/\D+/g, '')
    if (!digits) return null

    const firstName = employeeName ? employeeName.split(' ')[0] : ''
    const friendlyGreeting = firstName ? `Hola ${firstName}, ` : 'Hola, '
    const senderText = userProfile?.name ? `soy ${userProfile.name} desde tu empresa.` : 'te escribe tu administrador.'
    const message = encodeURIComponent(`${friendlyGreeting}${senderText}`)

    return `https://wa.me/${digits}?text=${message}`
  }, [userProfile?.name])

  const itemsPerPage = 25

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes('401')) return t('errors.sessionExpired')
      if (message.includes('403')) return t('errors.forbidden')
      if (message.includes('404')) return t('errors.notFound')
      if (message.includes('409')) return t('errors.duplicateCode')
      if (message.includes('missing required fields')) return t('errors.missingFields')
      if (message.includes('500')) return t('errors.server')
      if (message.includes('unauthorized')) return t('errors.unauthorized')
      return error.message
    }
    return t('errors.unexpected')
  }, [t])

  const handleProfileImageUploaded = useCallback((fileId: string, storagePath: string) => {
    setUploadedProfileImagePath(storagePath)
    setProfileImageError(null)
    // Profile images are now managed through employee_files table, not formData
  }, [])

  const handleProfileImageError = useCallback((error: string) => {
    setProfileImageError(error)
  }, [])

  const fetchEmployees = useCallback(async () => {
    if (!user?.id) return
    
    setEmployeesLoading(true)
    setEmployeesError(null)
    
    try {
      const params = new URLSearchParams({ order: 'name' })
      const response = await fetch(`/api/employees?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errBody = await response.text()
        throw new Error(`Error fetching employees: ${response.status} - ${errBody}`)
      }

      const data = await response.json()
      setEmployees((data.employees || []) as EmployeeShaped[])
    } catch (err) {
      console.error('Fetch error:', err)
      setEmployeesError(getErrorMessage(err))
    } finally {
      setEmployeesLoading(false)
    }
  }, [user?.id, getErrorMessage])

  const fetchDepartments = useCallback(async () => {
    setDepartmentsLoading(true)
    setDepartmentsError(null)
    
    try {
      console.log('🔍 Fetching departments...')
      const response = await fetch('/api/departments', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Error fetching departments: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 Raw departments response:', data)
      
      // Extraer departments del objeto de respuesta
      const departmentsList = data.departments || []
      console.log(`✅ Departments loaded: ${departmentsList.length} departments`)
      
      if (departmentsList.length > 0) {
        console.log('📋 Sample departments:', departmentsList.slice(0, 3).map((d: Department) => `${d.name} (${d.id})`))
      } else {
        console.warn('⚠️ No departments found in response')
      }
      
      setDepartments(departmentsList)
    } catch (error) {
      console.error('💥 Error fetching departments:', error)
      setDepartmentsError(t('errors.loadDepartments'))
    } finally {
      setDepartmentsLoading(false)
    }
  }, [t])

  const fetchEmployeeFiles = useCallback(async (employeeId: string) => {
    setFilesLoading(true)
    setFilesError(null)
    try {
      const res = await fetch(`/api/employees/files/${employeeId}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('errors.loadFiles'))
      setEmployeeFiles(data.files || [])
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : t('errors.loadFiles'))
      setEmployeeFiles([])
    } finally {
      setFilesLoading(false)
    }
  }, [t])

  const fetchWorkSchedules = useCallback(async () => {
    setSchedulesLoading(true)
    setSchedulesError(null)
    
    try {
      console.log('🔍 Fetching work schedules...')
      const response = await fetch('/api/work-schedules', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Error fetching work schedules: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 Raw work schedules response:', data)
      
      // Extraer schedules del objeto de respuesta
      const schedulesList = data.schedules || []
      console.log(`✅ Work schedules loaded: ${schedulesList.length} schedules`)
      
      if (schedulesList.length > 0) {
        console.log('📋 Sample schedules:', schedulesList.slice(0, 3).map((s: WorkSchedule) => `${s.name} (${s.id})`))
      } else {
        console.warn('⚠️ No work schedules found in response')
      }
      
      setWorkSchedules(schedulesList)
    } catch (error) {
      console.error('💥 Error fetching work schedules:', error)
      setSchedulesError(t('errors.loadSchedules'))
    } finally {
      setSchedulesLoading(false)
    }
  }, [t])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setShowForm(false)
    setEditingEmployee(null)
    setEmployeesError(null)
    setDepartmentsError(null)
    setSchedulesError(null)
    setUploadedProfileImagePath(null)
    setProfileImageError(null)
  }, [])

  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      // Enlace: sugerir código = inicial + últimos 5 del DNI (solo alta, no edición)
      if (
        !editingEmployee &&
        isEnlaceCompany(companyId) &&
        (field === 'name' || field === 'dni')
      ) {
        const suggested = suggestEnlaceEmployeeCode(
          field === 'name' ? value : next.name,
          field === 'dni' ? value : next.dni
        )
        if (suggested) {
          const taken = new Set(
            employees
              .map((e) => e.employee_code)
              .filter((c): c is string => !!c)
              .map((c) => c.toUpperCase())
          )
          next.employee_code =
            resolveEnlaceEmployeeCode(
              field === 'name' ? value : next.name,
              field === 'dni' ? value : next.dni,
              taken
            ) || suggested
        }
      }
      return next
    })
  }, [companyId, editingEmployee, employees])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)

      const sanitizedFormData: any = { ...formData }
      // Normalizar tipos para evitar fallos silenciosos en la API/DB
      if (canEditSalary && typeof sanitizedFormData.base_salary === 'string') {
        const trimmed = sanitizedFormData.base_salary.trim()
        const parsed = trimmed === '' ? NaN : Number.parseFloat(trimmed)
        if (Number.isNaN(parsed)) {
          throw new Error(t('errors.invalidSalary'))
        }
        sanitizedFormData.base_salary = parsed
      }
      // UUIDs opcionales: enviar null en vez de string vacío
      for (const key of ['department_id', 'work_schedule_id'] as const) {
        if (sanitizedFormData[key] === '') sanitizedFormData[key] = null
      }
      // Fechas opcionales: enviar null en vez de string vacío
      for (const key of ['hire_date', 'termination_date'] as const) {
        if (sanitizedFormData[key] === '') sanitizedFormData[key] = null
      }
      // Status: la tabla solo permite 'active' | 'inactive'
      if (typeof sanitizedFormData.status === 'string') {
        const rawStatus = sanitizedFormData.status.trim()
        if (rawStatus === '') {
          sanitizedFormData.status = null
        } else if (rawStatus !== 'active' && rawStatus !== 'inactive') {
          // Valores legacy del UI: 'terminated', 'on_leave' → mapear a 'inactive'
          sanitizedFormData.status = 'inactive'
        }
      }
      if (sanitizedFormData.status === 'active') {
        sanitizedFormData.termination_date = null
        sanitizedFormData.termination_reason_code = null
        sanitizedFormData.termination_reason_detail = null
      } else if (sanitizedFormData.status === 'inactive') {
        const trc = String(sanitizedFormData.termination_reason_code || '').trim()
        if (!trc) {
          throw new Error(t('errors.reasonRequiredInactive'))
        }
        sanitizedFormData.termination_reason_code = trc
        const trd = String(sanitizedFormData.termination_reason_detail || '').trim()
        sanitizedFormData.termination_reason_detail = trd || null
      }
      // pay_type: constraint permite 'fixed' | 'hourly' | 'admin_floor'
      if (typeof sanitizedFormData.pay_type === 'string') {
        const rawPayType = sanitizedFormData.pay_type.trim()
        if (rawPayType === '') {
          sanitizedFormData.pay_type = null
        } else if (
          rawPayType !== 'fixed' &&
          rawPayType !== 'hourly' &&
          rawPayType !== 'admin_floor'
        ) {
          sanitizedFormData.pay_type = 'fixed'
        }
      }
      const resolvedPayForAttendance =
        sanitizedFormData.pay_type === 'hourly'
          ? 'hourly'
          : sanitizedFormData.pay_type === 'admin_floor'
            ? 'admin_floor'
            : sanitizedFormData.pay_type === 'fixed'
              ? 'fixed'
              : companyCalculationMode === 'hourly'
                ? 'hourly'
                : companyCalculationMode === 'admin_floor'
                  ? 'admin_floor'
                  : 'fixed'
      if (resolvedPayForAttendance === 'hourly' || resolvedPayForAttendance === 'admin_floor') {
        sanitizedFormData.attendance_required = true
      } else {
        sanitizedFormData.attendance_required = sanitizedFormData.attendance_required !== false
      }
      sanitizedFormData.pay_overtime = sanitizedFormData.pay_overtime !== false
      // payment_frequency: vacío = usa default de empresa (Capa 2)
      if (typeof sanitizedFormData.payment_frequency === 'string') {
        const pf = sanitizedFormData.payment_frequency.trim()
        if (pf === '') {
          sanitizedFormData.payment_frequency = null
        } else if (pf !== 'quincenal' && pf !== 'mensual' && pf !== 'semanal') {
          sanitizedFormData.payment_frequency = null
        }
      }
      // Dirección = texto libre
      if (typeof sanitizedFormData.address === 'string') {
        const trimmed = sanitizedFormData.address.trim()
        sanitizedFormData.address = trimmed || null
      } else if (sanitizedFormData.address === '' || sanitizedFormData.address === undefined) {
        sanitizedFormData.address = null
      }

      // Metadatos = JSONB (sigue esperando JSON válido)
      {
        const value = sanitizedFormData.metadata
        if (value === '' || value === null || value === undefined) {
          sanitizedFormData.metadata = null
        } else if (typeof value === 'string') {
          const trimmed = value.trim()
          if (!trimmed) {
            sanitizedFormData.metadata = null
          } else {
            try {
              sanitizedFormData.metadata = JSON.parse(trimmed)
            } catch {
              throw new Error(t('errors.invalidMetadata'))
            }
          }
        }
      }
      // Seguridad: no enviar campos que no existen en la tabla `employees`
      // Profile images are managed through employee_files table, not employees table
      delete sanitizedFormData.profile_image_path

      if (!canEditSalary) {
        delete sanitizedFormData.base_salary
      }

      const url = editingEmployee 
        ? '/api/employees/update'
        : '/api/employees/create'
      
      const method = editingEmployee ? 'PUT' : 'POST'
      
      const payload = editingEmployee 
        ? { id: editingEmployee.id, ...sanitizedFormData }
        : sanitizedFormData
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error ${editingEmployee ? 'updating' : 'creating'} employee: ${response.status} - ${errorText}`)
      }

      // Reset form and refresh employees
      resetForm()
      fetchEmployees()
    } catch (error) {
      console.error(`Error ${editingEmployee ? 'updating' : 'creating'} employee:`, error)
      setEmployeesError(error instanceof Error ? error.message : `Error ${editingEmployee ? 'updating' : 'creating'} employee`)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    formData,
    editingEmployee,
    resetForm,
    fetchEmployees,
    canEditSalary,
    companyCalculationMode,
    t,
  ])

  const handleCancel = useCallback(() => {
    resetForm()
  }, [resetForm])

  const handleEdit = useCallback((employee: EmployeeShaped) => {
    // IMPORTANTE: no activar el loading global de empleados aquí.
    // `employeesLoading` se usa para fetchEmployees() y controla el "Cargando empleados...".
    // Si lo ponemos en true en modo edición y no lo apagamos, la UI queda bloqueada.
    setEditingEmployee(employee)
    setFormData({
      employee_code: employee.employee_code || '',
      dni: employee.dni || '',
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || '',
      team: employee.team || '',
      department_id: employee.department_id || '',
      work_schedule_id: employee.work_schedule_id || '',
      base_salary: canEditSalary && employee.base_salary != null
        ? employee.base_salary.toString()
        : '',
      pay_type: (employee as any).pay_type ?? '',
      attendance_required: (employee as any).attendance_required !== false,
      pay_overtime: (employee as any).pay_overtime !== false,
      payment_frequency: (employee as any).payment_frequency || '',
      hire_date: employee.hire_date || '',
      termination_date: employee.termination_date || '',
      status: employee.status || 'active',
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      address:
        typeof employee.address === 'string'
          ? employee.address
          : employee.address && typeof employee.address === 'object'
            ? Object.values(employee.address as Record<string, unknown>).filter(Boolean).join(', ')
            : '',
      metadata: typeof employee.metadata === 'object' ? JSON.stringify(employee.metadata || {}) : (employee.metadata || ''),
      termination_reason_code: employee.termination_reason_code || '',
      termination_reason_detail: employee.termination_reason_detail || ''
      // profile_image_path no está en INITIAL_FORM_DATA ni en el schema de DB, se maneja separadamente
    })
    setShowForm(true)
    setUploadedProfileImagePath(null)
    setProfileImageError(null)
    
    // Scroll suave al formulario después de un pequeño delay para permitir que el DOM se actualice
    setTimeout(() => {
      const formElement = document.querySelector('[data-employee-form]')
      if (formElement) {
        formElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }
    }, 100)
  }, [canEditSalary])

  const handleDeactivate = useCallback((employee: EmployeeShaped) => {
    setEmployeeToDeactivate(employee)
    setTerminationDate('')
    setTerminationReasonCode('')
    setTerminationReasonDetail('')
    setShowDeactivateModal(true)
  }, [])

  const handleExportClick = useCallback((format: 'pdf' | 'excel' | 'csv') => {
    setExportFormat(format)
    setShowExportModal(true)
  }, [])

  const handleExportConfirm = useCallback(async () => {
    if (!exportFormat) return

    setIsExporting(true)
    try {
      const response = await fetch('/api/reports/export-employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          format: exportFormat,
          ...(exportFilters.status.length > 0 || exportFilters.departmentIds.length > 0 || exportFilters.employeeIds.length > 0 ? {
            filters: {
              ...(exportFilters.status.length > 0 && { status: exportFilters.status }),
              ...(exportFilters.departmentIds.length > 0 && { departmentIds: exportFilters.departmentIds }),
              ...(exportFilters.employeeIds.length > 0 && { employeeIds: exportFilters.employeeIds })
            }
          } : {})
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: t('errors.export') }))
        throw new Error(error.error || `Error HTTP ${response.status}`)
      }

      // Obtener el blob
      const blob = await response.blob()
      
      // Crear URL temporal y descargar
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Determinar extensión del archivo
      const extension = exportFormat === 'excel' ? 'xlsx' : exportFormat
      const filename = `reporte_empleados_${new Date().toISOString().split('T')[0]}.${extension}`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Cerrar modal y resetear
      setShowExportModal(false)
      setExportFormat(null)
      setExportFilters({ status: [], departmentIds: [], employeeIds: [] })
    } catch (error) {
      console.error('Error exporting employees:', error)
      setEmployeesError(error instanceof Error ? error.message : t('errors.exportEmployees'))
    } finally {
      setIsExporting(false)
    }
  }, [exportFormat, exportFilters, t])

  const loadProfileImageForHeader = useCallback(async (employeeId: string) => {
    try {
      const res = await fetch(`/api/employees/files/${employeeId}?file_type=profile_photo`, { credentials: 'include' })
      const data = await res.json()
      const profileFile = data.files?.[0]
      if (profileFile?.signed_url) {
        setSelectedEmployeeImageUrl(profileFile.signed_url)
      }
      setSelectedEmployeeImageError(null)
    } catch (err) {
      console.error('Error loading employee profile image:', err)
      setSelectedEmployeeImageError(t('errors.profilePhoto'))
    }
  }, [t])

  const handleViewDetails = useCallback(async (employee: EmployeeShaped) => {
    setSelectedEmployee(employee)
    setShowDetailsModal(true)
    setDetailsActiveTab('personal')
    setSelectedEmployeeImageUrl(null)
    setSelectedEmployeeImageError(null)
    setSelectedEmployeeImageLoading(true)
    await loadProfileImageForHeader(employee.id)
    setSelectedEmployeeImageLoading(false)
  }, [loadProfileImageForHeader])

  const handleOpenCertificateModal = useCallback((employee: EmployeeShaped) => {
    setEmployeeForCertificate(employee)
    setShowCertificateModal(true)
  }, [])

  const closeDetailsModal = useCallback(() => {
    setShowDetailsModal(false)
    setSelectedEmployeeImageUrl(null)
    setSelectedEmployeeImageError(null)
    setSelectedEmployeeImageLoading(false)
    setDetailsActiveTab('personal')
  }, [])

  const confirmDeactivate = useCallback(async () => {
    if (!employeeToDeactivate) return

    const reason = terminationReasonCode.trim()
    if (!reason) {
      setEmployeesError(t('errors.reasonRequired'))
      return
    }

    try {
      setIsSubmitting(true)
      setEmployeesError(null)
      
      // Usar fecha seleccionada o fecha actual
      const finalTerminationDate = terminationDate || getHondurasTimestamp().split('T')[0]
      
      const response = await fetch('/api/employees/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: employeeToDeactivate.id,
          status: 'inactive',
          termination_date: finalTerminationDate,
          termination_reason_code: terminationReasonCode.trim(),
          termination_reason_detail: terminationReasonDetail.trim() || null
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error deactivating employee: ${response.status} - ${errorText}`)
      }

      setShowDeactivateModal(false)
      setEmployeeToDeactivate(null)
      setTerminationDate('')
      setTerminationReasonCode('')
      setTerminationReasonDetail('')
      fetchEmployees()
    } catch (error) {
      console.error('Error deactivating employee:', error)
      setEmployeesError(error instanceof Error ? error.message : 'Error deactivating employee')
    } finally {
      setIsSubmitting(false)
    }
  }, [employeeToDeactivate, fetchEmployees, terminationDate, terminationReasonCode, terminationReasonDetail, t])

  const shouldFetch = useMemo(() => !!user?.id && !sessionLoading, [user?.id, sessionLoading])
  const selectedEmployeeMetadata = useMemo(() => {
    if (!selectedEmployee) return null
    return parseMaybeJsonObject(selectedEmployee.metadata)
  }, [selectedEmployee])
  const attendanceRecords = selectedEmployee?.attendance_records ?? []
  const disciplinaryActions = useMemo(() => {
    if (!selectedEmployeeMetadata) return []
    const rawActions =
      selectedEmployeeMetadata['disciplinary_actions'] ??
      selectedEmployeeMetadata['disciplinaryActions']
    return Array.isArray(rawActions) ? rawActions : []
  }, [selectedEmployeeMetadata])
  const personalNotes = useMemo(() => {
    if (!selectedEmployeeMetadata) return null
    const raw =
      selectedEmployeeMetadata['personal_notes'] ??
      selectedEmployeeMetadata['personalNotes'] ??
      selectedEmployeeMetadata['notes']
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null
  }, [selectedEmployeeMetadata])
  const contractNotes = useMemo(() => {
    if (!selectedEmployeeMetadata) return null
    const raw =
      selectedEmployeeMetadata['contract_notes'] ??
      selectedEmployeeMetadata['contractNotes']
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null
  }, [selectedEmployeeMetadata])
  const attendanceInsights = useMemo(() => {
    if (!selectedEmployeeMetadata) return null
    const raw =
      selectedEmployeeMetadata['attendance_summary'] ??
      selectedEmployeeMetadata['attendanceSummary']
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim()
    }
    if (raw && typeof raw === 'object') {
      return raw
    }
    return null
  }, [selectedEmployeeMetadata])
  const emergencyContactMetadata = useMemo(() => {
    if (!selectedEmployeeMetadata) return null
    const raw =
      selectedEmployeeMetadata['emergency_contact'] ??
      selectedEmployeeMetadata['emergencyContact']
    if (!raw) return null
    if (typeof raw === 'string') {
      const parsed = parseMaybeJsonObject(raw)
      return parsed ?? raw
    }
    if (typeof raw === 'object') {
      return raw
    }
    return null
  }, [selectedEmployeeMetadata])
  const disciplinaryNotes = useMemo(() => {
    if (!selectedEmployeeMetadata) return null
    const raw =
      selectedEmployeeMetadata['disciplinary_notes'] ??
      selectedEmployeeMetadata['disciplinaryNotes']
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null
  }, [selectedEmployeeMetadata])

  const departmentFilterOptions = useMemo(() => {
    const set = new Set<string>()
    for (const emp of employees) {
      const d = emp.departments?.name
      set.add(d && String(d).trim() ? String(d).trim() : t('noDepartment'))
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [employees, t])

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = [...employees]

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(emp =>
        emp.name?.toLowerCase().includes(search) ||
        emp.employee_code?.toLowerCase().includes(search) ||
        emp.dni?.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search) ||
        emp.role?.toLowerCase().includes(search) ||
        emp.team?.toLowerCase().includes(search) ||
        emp.departments?.name?.toLowerCase().includes(search)
      )
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => {
        const name = (emp.departments?.name && String(emp.departments.name).trim())
          ? String(emp.departments.name).trim()
          : t('noDepartment')
        return name === departmentFilter
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || ''
      const nameB = b.name?.toLowerCase() || ''

      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? nameA.localeCompare(nameB, 'es')
          : nameB.localeCompare(nameA, 'es')
      }

      const keyA = groupKeyForRow(employeeToPlanillaRow(a), sortBy)
      const keyB = groupKeyForRow(employeeToPlanillaRow(b), sortBy)
      const primary =
        sortOrder === 'asc'
          ? keyA.localeCompare(keyB, 'es')
          : keyB.localeCompare(keyA, 'es')
      if (primary !== 0) return primary
      return nameA.localeCompare(nameB, 'es')
    })

    return sorted
  }, [employees, searchTerm, sortOrder, departmentFilter, sortBy, t])

  // Paginate results
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedEmployees.slice(startIndex, endIndex)
  }, [filteredAndSortedEmployees, currentPage, itemsPerPage])

  // Calculate total pages
  const totalPages = Math.ceil(filteredAndSortedEmployees.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, departmentFilter, sortBy])

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const cycleSortBy = () => {
    setSortBy(prev => {
      const i = EMPLOYEE_SORT_CYCLE.indexOf(prev)
      return EMPLOYEE_SORT_CYCLE[(i + 1) % EMPLOYEE_SORT_CYCLE.length]
    })
  }

  useEffect(() => {
    if (shouldFetch) {
      fetchEmployees()
      fetchDepartments()
      fetchWorkSchedules()
    }
  }, [shouldFetch, fetchEmployees, fetchDepartments, fetchWorkSchedules])

  useEffect(() => {
    if (!companyId) return
    fetch('/api/payroll/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const mode = data?.config?.calculation_mode
        setCompanyCalculationMode(
          mode === 'hourly' || mode === 'admin_floor' ? mode : 'daily'
        )
      })
      .catch(() => setCompanyCalculationMode('daily'))
  }, [companyId])

  useEffect(() => {
    if (detailsActiveTab === 'files' && selectedEmployee?.id) {
      fetchEmployeeFiles(selectedEmployee.id)
    }
  }, [detailsActiveTab, selectedEmployee?.id, fetchEmployeeFiles])

  const isLoading = sessionLoading || employeesLoading || departmentsLoading || schedulesLoading
  const hasErrors = employeesError || departmentsError || schedulesError

  if (isLoading && !hasErrors) {
    return (
      <div className="p-6">
        <Card variant="liquid">
          <CardHeader>
            <CardTitle className="text-white">{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto"></div>
              <p className="mt-2 text-gray-300">
                {sessionLoading && t('verifyingSession')}
                {employeesLoading && t('loadingEmployees')}
                {departmentsLoading && t('loadingDepartments')}
                {schedulesLoading && t('loadingSchedules')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasErrors && !showForm) {
    return (
      <div className="p-6">
        <Card variant="liquid">
          <CardHeader>
            <CardTitle className="text-white">{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeesError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">{t('errors.loadEmployees')}</h3>
                    <p className="text-sm mt-2 text-gray-300">{employeesError}</p>
                  </div>
                  <Button onClick={fetchEmployees} variant="outline" className="mb-4 bg-white/5 border-white/20 text-white hover:bg-white/10">
                    {t('retryEmployees')}
                  </Button>
                </div>
              )}
              
              {departmentsError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">{t('errors.loadDepartments')}</h3>
                    <p className="text-sm mt-2 text-gray-300">{departmentsError}</p>
                  </div>
                  <Button onClick={fetchDepartments} variant="outline" className="mb-4 bg-white/5 border-white/20 text-white hover:bg-white/10">
                    {t('retryDepartments')}
                  </Button>
                </div>
              )}
              
              {schedulesError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">{t('errors.loadSchedules')}</h3>
                    <p className="text-sm mt-2 text-gray-300">{schedulesError}</p>
                  </div>
                  <Button onClick={fetchWorkSchedules} variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                    {t('retrySchedules')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showForm ? (
        <div 
          data-employee-form 
          className="transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-top-4"
        >
          {editingEmployee && (
            <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <PencilIcon className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-300">
                  {t.rich('editing', {
                    name: () => <span className="text-white font-semibold">{editingEmployee.name}</span>,
                  })}
                </p>
                <p className="text-xs text-blue-400/80 mt-1">
                  {editingEmployee.employee_code || tc('noCode')} • {editingEmployee.dni}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                title={t('cancelEdit')}
              >
                ✕
              </Button>
            </div>
          )}
          <AddEmployeeForm
            formData={formData}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            departments={departments}
            workSchedules={workSchedules}
            // El formulario solo debe bloquearse al enviar (crear/actualizar),
            // no cuando el listado está recargando empleados.
            loading={isSubmitting}
            isEditing={!!editingEmployee}
            employeeId={editingEmployee?.id}
            onProfileImageUploaded={handleProfileImageUploaded}
            onProfileImageError={handleProfileImageError}
            companyCalculationMode={companyCalculationMode}
            canEditSalary={canEditSalary}
            canViewSalary={canViewSalary}
            autoGenerateEmployeeCode={isEnlaceCompany(companyId)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-white">{t('title')}</h2>
              <p className="text-gray-300">{t('pageSubtitle')}</p>
            </div>
            <Button 
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700"
            >
              <PlusIcon className="h-5 w-5" />
              <span>{t('newEmployee')}</span>
            </Button>
          </div>

          {/* Search, department filter, and sort (aligned with nómina / PDF grouping) */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1 relative min-w-0">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <label htmlFor="employee-dept-filter" className="text-sm font-medium text-white shrink-0">
                  {t('departmentLabel')}
                </label>
                <select
                  id="employee-dept-filter"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-0 flex-1 sm:flex-none sm:min-w-[11rem]"
                >
                  <option value="all" className="bg-gray-800">
                    {t('all')}
                  </option>
                  {departmentFilterOptions.map((dept) => (
                    <option key={dept} value={dept} className="bg-gray-800">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">{t('sortBy')}</span>
                <Button
                  type="button"
                  onClick={cycleSortBy}
                  variant="outline"
                  className="px-3 py-2 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
                >
                  {t(`sort.${sortBy}`)}
                </Button>
                <Button
                  type="button"
                  onClick={toggleSortOrder}
                  variant="outline"
                  className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {sortOrder === 'asc' ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <>
          {employeesError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-md p-4">
              <div className="text-red-400">
                <h3 className="text-sm font-medium">{editingEmployee ? t('errors.saveTitleUpdate') : t('errors.saveTitleCreate')}</h3>
                <p className="text-sm mt-1 text-gray-300">{employeesError}</p>
              </div>
            </div>
          )}
          {(departmentsError || schedulesError) && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-md p-4">
              <div className="text-yellow-400">
                <h3 className="text-sm font-medium">{tc('warning')}</h3>
                <div className="text-sm mt-1 text-gray-300">
                  {departmentsError && <p>{t('errors.loadDepartmentsShort')} <Button onClick={fetchDepartments} variant="link" className="text-yellow-400 underline p-0 h-auto">{tc('retry')}</Button></p>}
                  {schedulesError && <p>{t('errors.loadSchedulesShort')} <Button onClick={fetchWorkSchedules} variant="link" className="text-yellow-400 underline p-0 h-auto">{tc('retry')}</Button></p>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Card variant="liquid">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">
                {searchTerm
                  ? t('listTitleFiltered', { count: filteredAndSortedEmployees.length, total: employees.length })
                  : t('listTitle', { count: filteredAndSortedEmployees.length })}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {totalPages > 1
                  ? t('listDescriptionPaged', { page: currentPage, pages: totalPages })
                  : t('listDescription')}
              </CardDescription>
            </div>
            <ExportFormatButtons
              formats={['pdf', 'excel', 'csv']}
              onExport={(format) => handleExportClick(format)}
              disabled={isExporting}
              variant="outline"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchTerm ? t('noResultsSearch') : t('noResults')}
            </div>
          ) : (
            <>
            <div className="space-y-4">
              {paginatedEmployees.map((employee, pageIndex) => {
                const whatsappLink = getWhatsAppLink(employee.phone, employee.name)
                const globalIdx = (currentPage - 1) * itemsPerPage + pageIndex
                const gkey =
                  sortBy !== 'name'
                    ? groupKeyForRow(employeeToPlanillaRow(employee), sortBy)
                    : ''
                const prevEmp = globalIdx > 0 ? filteredAndSortedEmployees[globalIdx - 1] : null
                const prevGkey =
                  prevEmp && sortBy !== 'name'
                    ? groupKeyForRow(employeeToPlanillaRow(prevEmp), sortBy)
                    : null
                const showSectionHeader =
                  sortBy !== 'name' && (globalIdx === 0 || gkey !== prevGkey)

                return (
                  <Fragment key={employee.id}>
                    {showSectionHeader && (
                      <div
                        className="pt-1 pb-0 text-sm font-semibold text-blue-200 border-b border-white/15"
                        role="presentation"
                      >
                        {sectionHeading(sortBy, gkey)}
                      </div>
                    )}
                  <div 
                    className={`border rounded-lg p-4 transition-all duration-200 ${
                      editingEmployee?.id === employee.id 
                        ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-white">{employee.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          employee.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {employee.status === 'active' ? tc('active') : tc('inactive')}
                        </span>
                        {employee.attendance_status && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            employee.attendance_status === 'present' ? 'bg-brand-500/20 text-brand-400' :
                            employee.attendance_status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                            employee.attendance_status === 'absent' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {employee.attendance_status === 'present' ? t('attendanceStatus.present') :
                             employee.attendance_status === 'late' ? t('attendanceStatus.late') :
                             employee.attendance_status === 'absent' ? t('attendanceStatus.absent') : t('attendanceStatus.not_registered')}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                        <div>
                          <p><span className="font-medium text-gray-200">{t('fields.dni')}</span> {employee.dni}</p>
                          <p><span className="font-medium text-gray-200">{t('fields.code')}</span> {employee.employee_code || tc('unassigned')}</p>
                          <p><span className="font-medium text-gray-200">{t('fields.email')}</span> {employee.email || tc('notSpecified')}</p>
                          <div className="flex items-center gap-2">
                            <p>
                              <span className="font-medium text-gray-200">{t('fields.phone')}</span>{' '}
                              {employee.phone || tc('notSpecified')}
                            </p>
                            {canSendInstantMessage && whatsappLink && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                              >
                                <a
                                  href={whatsappLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={t('whatsappAria', { name: employee.name })}
                                >
                                  <span className="flex items-center gap-1">
                                    <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('instantMessage')}</span>
                                  </span>
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                        <div>
                          <p><span className="font-medium text-gray-200">{t('fields.position')}</span> {employee.role || tc('notSpecifiedF')}</p>
                          <p><span className="font-medium text-gray-200">{t('fields.team')}</span> {employee.team || tc('unassigned')}</p>
                          <p><span className="font-medium text-gray-200">{t('fields.department')}</span> {employee.departments?.name || tc('unassigned')}</p>
                          <p><span className="font-medium text-gray-200">{t('fields.schedule')}</span> {employee.work_schedules?.name || tc('unassigned')}</p>
                          {employee.check_in_time && (
                            <p><span className="font-medium text-gray-200">{t('fields.checkIn')}</span> {formatTimeDisplay(employee.check_in_time)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {employee.employee_scores && (
                        <div className="text-right text-xs text-gray-400">
                          <p>{t('points', { count: employee.employee_scores.total_points || 0 })}</p>
                          <p>{t('weekPoints', { count: employee.employee_scores.weekly_points || 0 })}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(employee)}
                          className="flex items-center gap-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">{tc('view')}</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCertificateModal(employee)}
                          className="flex items-center gap-1 bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">{t('certificateButton')}</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(employee)}
                          className="flex items-center gap-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all"
                          title={t('editTitle', { name: employee.name })}
                          disabled={employeesLoading}
                        >
                          {employeesLoading && editingEmployee?.id === employee.id ? (
                            <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <PencilIcon className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            {employeesLoading && editingEmployee?.id === employee.id ? tc('loadingDots') : tc('edit')}
                          </span>
                        </Button>
                        
                        {employee.status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeactivate(employee)}
                            className="flex items-center gap-1 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('deactivate')}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  </Fragment>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="text-sm text-gray-400">
                  {tc('showingRange', {
                    from: (currentPage - 1) * itemsPerPage + 1,
                    to: Math.min(currentPage * itemsPerPage, filteredAndSortedEmployees.length),
                    total: filteredAndSortedEmployees.length,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    {tc('previous')}
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className={`min-w-[40px] ${
                            currentPage === pageNum
                              ? 'bg-brand-600 hover:bg-brand-700 text-white'
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                          }`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    {tc('next')}
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles del Empleado */}
      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-2xl w-full mx-4 backdrop-blur-sm max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                {t('details.title')}
              </h3>
              <Button
                onClick={closeDetailsModal}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative h-28 w-28 rounded-full border border-white/20 overflow-hidden bg-white/5 flex items-center justify-center">
                  {selectedEmployeeImageLoading ? (
                    <div className="h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : selectedEmployeeImageUrl ? (
                    <img
                      src={selectedEmployeeImageUrl}
                      alt={t('details.photoAlt', { name: selectedEmployee.name })}
                      className="h-28 w-28 object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="h-16 w-16 text-gray-600" />
                  )}
                </div>
                {selectedEmployeeImageError && (
                  <p className="text-xs text-red-400 -mt-1">
                    {selectedEmployeeImageError}
                  </p>
                )}
                <div>
                  <h4 className="text-lg font-medium text-white">{selectedEmployee.name}</h4>
                  <p className="text-sm text-gray-400">{selectedEmployee.employee_code || tc('noCode')}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedEmployee.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {selectedEmployee.status === 'active' ? tc('active') : tc('inactive')}
                  </span>
                  {selectedEmployee.attendance_status && (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedEmployee.attendance_status === 'present'
                          ? 'bg-brand-500/20 text-brand-400'
                          : selectedEmployee.attendance_status === 'late'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : selectedEmployee.attendance_status === 'absent'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {t(`attendanceStatus.${selectedEmployee.attendance_status ?? 'unknown'}`)}
                    </span>
                  )}
                  {selectedEmployee.employee_scores && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                      {t('pointsBadge', { count: selectedEmployee.employee_scores.total_points ?? 0 })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
                {EMPLOYEE_DETAIL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailsActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      detailsActiveTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {t(`tabs.${tab.id}`)}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {detailsActiveTab === 'personal' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.fullName')}</label>
                        <div className="text-white font-medium">{selectedEmployee.name}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.dni')}</label>
                        <div className="text-white font-medium">{selectedEmployee.dni}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.email')}</label>
                        <div className="text-white font-medium">{selectedEmployee.email || tc('notSpecified')}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.phone')}</label>
                        <div className="text-white font-medium">{selectedEmployee.phone || tc('notSpecified')}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.team')}</label>
                        <div className="text-white font-medium">{selectedEmployee.team || tc('unassigned')}</div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-400">{t('details.address')}</label>
                        <div className="text-white font-medium">{formatAddress(selectedEmployee.address, tc('notSpecifiedF'))}</div>
                      </div>
                    </div>
                    {personalNotes && (
                      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                        <h6 className="text-sm font-medium text-gray-300 mb-2">{t('details.personalNotes')}</h6>
                        <p className="text-sm text-gray-200 leading-relaxed">{personalNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailsActiveTab === 'contract' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.employeeCode')}</label>
                        <div className="text-white font-medium">{selectedEmployee.employee_code || tc('unassigned')}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.status')}</label>
                        <div className="text-white font-medium">{selectedEmployee.status === 'active' ? tc('active') : tc('inactive')}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.department')}</label>
                        <div className="text-white font-medium">{selectedEmployee.departments?.name || tc('unassigned')}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.position')}</label>
                        <div className="text-white font-medium">{selectedEmployee.role || tc('notSpecified')}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.schedule')}</label>
                        <div className="text-white font-medium">{selectedEmployee.work_schedules?.name || tc('unassigned')}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.hireDate')}</label>
                        <div className="text-white font-medium">{fmtDate(selectedEmployee.hire_date)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.terminationDate')}</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.status === 'inactive'
                            ? fmtDate(selectedEmployee.termination_date)
                            : t('details.contractActive')}
                        </div>
                      </div>
                      {selectedEmployee.status === 'inactive' && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-400">{t('details.terminationReason')}</label>
                            <div className="text-white font-medium">
                              {terminationReasonLabel(selectedEmployee.termination_reason_code)}
                            </div>
                          </div>
                          {(selectedEmployee.termination_reason_detail || '').trim() ? (
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-gray-400">{t('details.terminationDetail')}</label>
                              <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedEmployee.termination_reason_detail}
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                      <SensitiveField
                        label={t('details.baseSalary')}
                        value={selectedEmployee.base_salary}
                        masked={isSalaryMasked(selectedEmployee) || !canViewSalary}
                        displayMode={salaryDisplayMode}
                        formatValue={formatCurrency}
                        mask={salaryMask}
                      />
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.bank')}</label>
                        <div className="text-white font-medium">{selectedEmployee.bank_name || tc('notSpecified')}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.bankAccount')}</label>
                        <div className="text-white font-medium">{selectedEmployee.bank_account || tc('notSpecifiedF')}</div>
                      </div>
                    </div>
                    {contractNotes && (
                      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                        <h6 className="text-sm font-medium text-gray-300 mb-2">{t('details.contractNotes')}</h6>
                        <p className="text-sm text-gray-200 leading-relaxed">{contractNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailsActiveTab === 'attendance' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.attendanceStatus')}</label>
                        <div className="text-white font-medium">
                          {t(`attendanceStatus.${selectedEmployee.attendance_status || 'unknown'}`)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.lastCheckIn')}</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.check_in_time
                            ? formatTimeDisplay(selectedEmployee.check_in_time)
                            : tc('noRecord')}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.lastCheckOut')}</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.check_out_time
                            ? formatTimeDisplay(selectedEmployee.check_out_time)
                            : tc('noRecord')}
                        </div>
                      </div>
                    </div>
                    {Array.isArray(attendanceRecords) && attendanceRecords.length > 0 ? (
                      <div className="space-y-3">
                        {attendanceRecords.map((record, index) => (
                          <div
                            key={`attendance-${selectedEmployee.id}-${index}`}
                            className="border border-white/10 rounded-lg p-4 bg-white/5"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h6 className="text-sm font-semibold text-white">{t('details.record', { number: index + 1 })}</h6>
                              <span className="text-xs text-gray-400">
                                {record.status ? record.status : t('details.noStatus')}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                              <div>
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">{t('details.checkIn')}</span>
                                <span className="text-white">
                                  {record.check_in ? fmtDateTime(record.check_in) : tc('noRecord')}
                                </span>
                              </div>
                              {(record as any).lunch_start != null && (
                                <div>
                                  <span className="text-gray-400 block text-xs uppercase tracking-wider">{t('details.lunchStart')}</span>
                                  <span className="text-white">
                                    {fmtDateTime((record as any).lunch_start)}
                                  </span>
                                </div>
                              )}
                              {(record as any).lunch_end != null && (
                                <div>
                                  <span className="text-gray-400 block text-xs uppercase tracking-wider">{t('details.lunchEnd')}</span>
                                  <span className="text-white">
                                    {fmtDateTime((record as any).lunch_end)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">{t('details.checkOut')}</span>
                                <span className="text-white">
                                  {record.check_out ? fmtDateTime(record.check_out) : tc('noRecord')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-300">
                        {t('details.noAttendance')}
                      </p>
                    )}
                    {attendanceInsights && (
                      <div className="border border-brand-500/30 rounded-lg p-4 bg-brand-500/10">
                        <h6 className="text-sm font-medium text-brand-200 mb-2">{t('details.attendanceSummary')}</h6>
                        {typeof attendanceInsights === 'string' ? (
                          <p className="text-sm text-brand-50">{attendanceInsights}</p>
                        ) : (
                          <ul className="text-sm text-brand-50 space-y-1">
                            {Object.entries(attendanceInsights).map(([key, value]) => (
                              <li key={key} className="flex justify-between">
                                <span className="capitalize">{key.replace(/[_-]/g, ' ')}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {detailsActiveTab === 'discipline' && (
                  <div className="space-y-4">
                    {disciplinaryActions.length > 0 ? (
                      disciplinaryActions.map((action, index) => {
                        const actionObject =
                          action && typeof action === 'object' ? (action as Record<string, any>) : null
                        const title =
                          actionObject?.type ||
                          actionObject?.motivo ||
                          actionObject?.reason ||
                          t('details.measure', { number: index + 1 })
                        const actionDate =
                          actionObject?.date ||
                          actionObject?.fecha ||
                          actionObject?.applied_at ||
                          null
                        const actionNotes =
                          actionObject?.notes ||
                          actionObject?.descripcion ||
                          actionObject?.description ||
                          (typeof action === 'string' ? action : null)

                        return (
                          <div
                            key={`discipline-${selectedEmployee.id}-${index}`}
                            className="border border-white/10 rounded-lg p-4 bg-white/5 space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <h6 className="text-sm font-semibold text-white">{title}</h6>
                              {actionDate && (
                                <span className="text-xs text-gray-400">{fmtDate(actionDate)}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed">
                              {actionNotes || t('details.noDetails')}
                            </p>
                            {actionObject?.status && (
                              <p className="text-xs text-gray-400">
                                {t.rich('details.measureStatus', {
                                  value: () => <span className="text-white">{String(actionObject.status)}</span>,
                                })}
                              </p>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-gray-300">
                        {t('details.noDiscipline')}
                      </p>
                    )}
                    {disciplinaryNotes && (
                      <div className="border border-red-500/30 rounded-lg p-4 bg-red-500/10">
                        <h6 className="text-sm font-medium text-red-200 mb-2">{t('details.disciplineNotes')}</h6>
                        <p className="text-sm text-red-100 leading-relaxed">{disciplinaryNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailsActiveTab === 'emergency' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.contactName')}</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.emergency_contact_name || tc('notSpecified')}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">{t('details.phone')}</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.emergency_contact_phone || tc('notSpecified')}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-400">{t('details.contactAddress')}</label>
                        <div className="text-white font-medium">
                          {emergencyContactMetadata && typeof emergencyContactMetadata === 'object'
                            ? Object.values(emergencyContactMetadata)
                                .filter(Boolean)
                                .join(', ') || tc('notSpecifiedF')
                            : typeof emergencyContactMetadata === 'string'
                            ? emergencyContactMetadata
                            : tc('notSpecifiedF')}
                        </div>
                      </div>
                    </div>
                    {emergencyContactMetadata && typeof emergencyContactMetadata === 'object' && (
                      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                        <h6 className="text-sm font-medium text-gray-300 mb-2">{t('details.additionalInfo')}</h6>
                        <ul className="text-sm text-gray-200 space-y-1">
                          {Object.entries(emergencyContactMetadata).map(([key, value]) => (
                            <li key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/[_-]/g, ' ')}:</span>
                              <span className="font-medium">{String(value)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {detailsActiveTab === 'files' && selectedEmployee && (
                  <div className="space-y-6">
                    {['super_admin', 'company_admin', 'hr_manager'].includes(userProfile?.role || '') && (
                      <>
                      <div>
                        <h6 className="text-sm font-medium text-gray-300 mb-3">{t('details.profilePhoto')}</h6>
                        <EmployeeFileUpload
                          employeeId={selectedEmployee.id}
                          fileType="profile_photo"
                          variant="dark"
                          onUploadComplete={() => {
                            if (selectedEmployee?.id) {
                              fetchEmployeeFiles(selectedEmployee.id)
                              loadProfileImageForHeader(selectedEmployee.id)
                            }
                          }}
                          onUploadError={(err) => setFilesError(err)}
                        />
                      </div>
                      <div>
                        <h6 className="text-sm font-medium text-gray-300 mb-3">{t('details.uploadDocument')}</h6>
                        <div className="mb-4">
                          <label className="block text-xs text-gray-400 mb-1">{t('details.category')}</label>
                          <select
                            value={documentCategoryForUpload}
                            onChange={(e) => setDocumentCategoryForUpload(e.target.value as typeof documentCategoryForUpload)}
                            className="w-full max-w-xs px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {DOCUMENT_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat} className="bg-gray-800 text-white">
                                {t(`docCategories.${cat}`)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <EmployeeFileUpload
                          employeeId={selectedEmployee.id}
                          fileType="document"
                          documentCategory={documentCategoryForUpload}
                          variant="dark"
                          onUploadComplete={() => selectedEmployee?.id && fetchEmployeeFiles(selectedEmployee.id)}
                          onUploadError={(err) => setFilesError(err)}
                        />
                      </div>
                      </>
                    )}
                    <div>
                      <h6 className="text-sm font-medium text-gray-300 mb-3">{t('details.files')}</h6>
                      {filesLoading ? (
                        <p className="text-sm text-gray-400">{t('details.loadingFiles')}</p>
                      ) : filesError ? (
                        <p className="text-sm text-red-400">{filesError}</p>
                      ) : employeeFiles.length === 0 ? (
                        <p className="text-sm text-gray-400">{t('details.noFiles')}</p>
                      ) : (
                        <div className="space-y-2">
                          {employeeFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between gap-4 border border-white/10 rounded-lg p-3 bg-white/5"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{file.file_name}</p>
                                <p className="text-xs text-gray-400">
                                  {file.file_type === 'document' && file.document_category
                                    ? docCategoryLabel(file.document_category)
                                    : t('details.profilePhoto')}
                                  {' · '}
                                  {(file.file_size_bytes / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {file.signed_url && (
                                  <a
                                    href={file.signed_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-md bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition"
                                    title={tc('download')}
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                )}
                                {['super_admin', 'company_admin', 'hr_manager'].includes(userProfile?.role || '') && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!confirm(t('details.confirmDeleteFile'))) return
                                      try {
                                        const res = await fetch(`/api/employees/files/delete/${file.id}`, {
                                          method: 'DELETE',
                                          credentials: 'include'
                                        })
                                        const data = await res.json()
                                        if (!res.ok) throw new Error(data.error || t('errors.deleteFile'))
                                        selectedEmployee?.id && fetchEmployeeFiles(selectedEmployee.id)
                                      } catch (err) {
                                        setFilesError(err instanceof Error ? err.message : t('errors.deleteFile'))
                                      }
                                    }}
                                    className="p-2 rounded-md bg-white/5 text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition"
                                    title={tc('delete')}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <Button
                onClick={closeDetailsModal}
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                variant="outline"
              >
                {tc('close')}
              </Button>
              <Button
                onClick={() => {
                  if (selectedEmployee) {
                    handleOpenCertificateModal(selectedEmployee)
                  }
                  closeDetailsModal()
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                <DocumentTextIcon className="h-4 w-4" />
                {t('details.generateCertificate')}
              </Button>
              <Button
                onClick={() => {
                  if (!selectedEmployee) return
                  handleEdit(selectedEmployee)
                  closeDetailsModal()
                }}
                className="flex-1 bg-brand-600 hover:bg-brand-700"
              >
                {t('details.editEmployee')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Baja */}
      {showDeactivateModal && employeeToDeactivate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              {t('deactivateModal.title')}
            </h3>
            <p className="text-gray-300 mb-4">
              {t.rich('deactivateModal.question', {
                name: () => <strong className="text-white">{employeeToDeactivate.name}</strong>,
              })}
            </p>
            
            {/* Campo de fecha de terminación */}
            <div className="mb-6">
              <label htmlFor="termination-date" className="block text-sm font-medium text-gray-300 mb-2">
                {t('deactivateModal.terminationDate')}
              </label>
              <input
                type="date"
                id="termination-date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                placeholder={t('deactivateModal.datePlaceholder')}
              />
              <p className="text-xs text-gray-400 mt-1">
                {t('deactivateModal.dateHint')}
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="termination-reason" className="block text-sm font-medium text-gray-300 mb-2">
                {t('deactivateModal.reason')} <span className="text-red-400">*</span>
              </label>
              <select
                id="termination-reason"
                value={terminationReasonCode}
                onChange={(e) => setTerminationReasonCode(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              >
                <option value="">{t('deactivateModal.reasonPlaceholder')}</option>
                {TERMINATION_REASON_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {terminationReasonLabel(opt.code)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="termination-reason-detail" className="block text-sm font-medium text-gray-300 mb-2">
                {t('deactivateModal.detail')}
              </label>
              <textarea
                id="termination-reason-detail"
                value={terminationReasonDetail}
                onChange={(e) => setTerminationReasonDetail(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={t('deactivateModal.detailPlaceholder')}
                className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-md text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-y min-h-[4.5rem]"
              />
              <p className="text-xs text-gray-400 mt-1">{t('deactivateModal.maxChars')}</p>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={confirmDeactivate}
                disabled={isSubmitting || !terminationReasonCode.trim()}
                variant="destructive"
                className="flex-1 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
              >
                {isSubmitting ? tc('processing') : t('deactivateModal.confirm')}
              </Button>
              <Button
                onClick={() => {
                  setShowDeactivateModal(false)
                  setEmployeeToDeactivate(null)
                  setTerminationDate('')
                  setTerminationReasonCode('')
                  setTerminationReasonDetail('')
                  setEmployeesError(null)
                }}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                {tc('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Constancia Laboral */}
      <WorkCertificateModal
        isOpen={showCertificateModal}
        onClose={() => {
          setShowCertificateModal(false)
          setEmployeeForCertificate(null)
        }}
        employee={employeeForCertificate}
      />

      {/* Modal de Filtros de Exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-2xl w-full mx-4 backdrop-blur-sm max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                {t('exportModal.title', { format: exportFormat?.toUpperCase() ?? '' })}
              </h3>
              <Button
                onClick={() => {
                  setShowExportModal(false)
                  setExportFormat(null)
                  setExportFilters({ status: [], departmentIds: [], employeeIds: [] })
                }}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                disabled={isExporting}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-6">
              {/* Resumen de filtros */}
              {(exportFilters.status.length > 0 || exportFilters.departmentIds.length > 0 || exportFilters.employeeIds.length > 0) && (
                <div className="bg-brand-500/20 border border-brand-500/30 rounded-lg p-4">
                  <p className="text-sm font-medium text-brand-300 mb-2">{t('exportModal.applied')}</p>
                  <div className="text-xs text-brand-200 space-y-1">
                    {exportFilters.status.length > 0 && (
                      <p>{t('exportModal.statuses', { list: exportFilters.status.map(s => t(`exportModal.statusOptions.${s as 'active' | 'inactive' | 'terminated'}`)).join(', ') })}</p>
                    )}
                    {exportFilters.departmentIds.length > 0 && (
                      <p>{t('exportModal.departmentsSelected', { count: exportFilters.departmentIds.length })}</p>
                    )}
                    {exportFilters.employeeIds.length > 0 && (
                      <p>{t('exportModal.employeesSelected', { count: exportFilters.employeeIds.length })}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Filtro por Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {t('exportModal.statusLabel')}
                </label>
                <div className="space-y-2">
                  {(['active', 'inactive', 'terminated'] as const).map((status) => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportFilters.status.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportFilters(prev => ({
                              ...prev,
                              status: [...prev.status, status]
                            }))
                          } else {
                            setExportFilters(prev => ({
                              ...prev,
                              status: prev.status.filter(s => s !== status)
                            }))
                          }
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
                        disabled={isExporting}
                      />
                      <span className="text-white">
                        {t(`exportModal.statusOptions.${status}`)}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {t('exportModal.statusHint')}
                </p>
              </div>

              {/* Filtro por Departamentos */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {t('exportModal.departments')}
                </label>
                {departments.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('exportModal.noDepartments')}</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3 bg-white/5">
                    {departments.map((dept) => (
                      <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportFilters.departmentIds.includes(dept.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportFilters(prev => ({
                                ...prev,
                                departmentIds: [...prev.departmentIds, dept.id]
                              }))
                            } else {
                              setExportFilters(prev => ({
                                ...prev,
                                departmentIds: prev.departmentIds.filter(id => id !== dept.id)
                              }))
                            }
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
                          disabled={isExporting}
                        />
                        <span className="text-white">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {t('exportModal.departmentsHint')}
                </p>
              </div>

              {/* Filtro por Empleados Específicos */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {t('exportModal.specific')}
                </label>
                {employees.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('exportModal.noEmployees')}</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3 bg-white/5">
                    {employees.map((emp) => (
                      <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportFilters.employeeIds.includes(emp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportFilters(prev => ({
                                ...prev,
                                employeeIds: [...prev.employeeIds, emp.id]
                              }))
                            } else {
                              setExportFilters(prev => ({
                                ...prev,
                                employeeIds: prev.employeeIds.filter(id => id !== emp.id)
                              }))
                            }
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
                          disabled={isExporting}
                        />
                        <span className="text-white">
                          {emp.name} {emp.employee_code && `(${emp.employee_code})`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {t('exportModal.specificHint')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <Button
                onClick={() => {
                  setShowExportModal(false)
                  setExportFormat(null)
                  setExportFilters({ status: [], departmentIds: [], employeeIds: [] })
                }}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                disabled={isExporting}
              >
                {tc('cancel')}
              </Button>
              <Button
                onClick={handleExportConfirm}
                className="flex-1 bg-brand-600 hover:bg-brand-700"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {tc('exporting')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {tc('export')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}