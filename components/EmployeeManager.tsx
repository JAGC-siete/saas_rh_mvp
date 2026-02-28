import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { createClient } from '../lib/supabase/client'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { useAuth } from '../lib/auth'
import { useCompanyContext } from '../lib/useCompanyContext'
import { Employee } from '../lib/types/employee'
import AddEmployeeForm from './AddEmployeeForm'
import WorkCertificateModal from './WorkCertificateModal'
import EmployeeFileUpload from './EmployeeFileUpload'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, MagnifyingGlassIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, DocumentTextIcon, UserCircleIcon, ChatBubbleBottomCenterTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { getHondurasTimestamp, formatTimeDisplay } from '../lib/timezone'

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
  pay_type: 'fixed', // Default: fixed (administrativo/permanente)
  payment_frequency: '', // vacío = usa default de empresa (Capa 2)
  hire_date: '',
  termination_date: '',
  status: 'active',
  bank_name: '',
  bank_account: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address: '',
  metadata: ''
}

const PROFILE_PHOTO_BUCKET = 'HR_BUCKET'
const PROFILE_PHOTO_SIGNED_URL_EXPIRATION = 60 * 60 // 1 hour
const HNL_CURRENCY_FORMATTER = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL'
})
const EMPLOYEE_DETAIL_TABS = [
  { id: 'personal', label: 'Información Personal' },
  { id: 'contract', label: 'Información Contractual' },
  { id: 'attendance', label: 'Asistencia' },
  { id: 'discipline', label: 'Medidas Disciplinarias' },
  { id: 'emergency', label: 'Contacto de Emergencia' },
  { id: 'files', label: 'Archivos del Empleado' }
] as const
const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  contrato: 'Contrato',
  identidad: 'Identidad',
  certificado: 'Certificado',
  diploma: 'Diploma',
  otro: 'Otro'
}
const ATTENDANCE_STATUS_LABEL: Record<'present' | 'absent' | 'late' | 'not_registered' | 'unknown', string> = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Tardanza',
  not_registered: 'No registrado',
  unknown: 'No disponible'
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return 'No especificado'
  return HNL_CURRENCY_FORMATTER.format(value)
}

const formatDateDisplay = (value?: string | null) => {
  if (!value) return 'No especificada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateTimeDisplay = (value?: string | null) => {
  if (!value) return 'No especificado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('es-HN', {
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

const formatAddress = (address: Employee['address']) => {
  if (!address) return 'No especificada'

  if (typeof address === 'string') {
    const parsed = parseMaybeJsonObject(address)
    if (!parsed) return address
    const values = Object.values(parsed).filter(Boolean)
    return values.length ? values.join(', ') : 'No especificada'
  }

  const values = Object.values(address).filter(Boolean)
  return values.length ? values.join(', ') : 'No especificada'
}

export default function EmployeeManager({ companyId: propCompanyId }: { companyId?: string }) {
  const { user, loading: sessionLoading, userProfile } = useAuth()
  const { companyId: contextCompanyId, loading: companyLoading } = useCompanyContext()
  
  // Usar companyId de props si está disponible, sino del contexto
  const companyId = propCompanyId || contextCompanyId
  
  const [employees, setEmployees] = useState<Employee[]>([])
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
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState<Employee | null>(null)
  const [terminationDate, setTerminationDate] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [employeeForCertificate, setEmployeeForCertificate] = useState<Employee | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
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
      if (message.includes('401')) return 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      if (message.includes('403')) return 'No tienes permisos para realizar esta operación.'
      if (message.includes('404')) return 'No se encontró el empleado solicitado.'
      if (message.includes('409')) return 'El código de empleado ya existe. Por favor, usa un código diferente.'
      if (message.includes('missing required fields')) return 'Por favor, completa todos los campos requeridos: código, DNI, nombre y salario base.'
      if (message.includes('500')) return 'Error del servidor. Por favor, intenta más tarde.'
      if (message.includes('unauthorized')) return 'No autorizado. Por favor, inicia sesión nuevamente.'
      return error.message
    }
    return 'Error inesperado. Por favor, verifica tu conexión e intenta nuevamente.'
  }, [])

  const getSignedProfileImageUrl = useCallback(async (path: string | null) => {
    if (!path) return null
    try {
      const supabaseClient = createClient()
      const { data, error } = await supabaseClient.storage
        .from(PROFILE_PHOTO_BUCKET)
        .createSignedUrl(path, PROFILE_PHOTO_SIGNED_URL_EXPIRATION)
      if (error) {
        console.error('Error creating signed URL for profile image:', error)
        return null
      }
      return data?.signedUrl ?? null
    } catch (err) {
      console.error('Unexpected error generating signed URL for profile image:', err)
      return null
    }
  }, [])

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
      console.log('🔍 Fetching employees for user:', user.id)
      
      const supabaseClient = createClient()
      let query = (supabaseClient as any)
        .from('employees')
        .select(`
          *,
          departments!employees_department_id_fkey(name),
          work_schedules!employees_work_schedule_id_fkey(name, monday_start, monday_end)
        `)
      if (companyId) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error) throw error
      setEmployees((data || []) as Employee[])
    } catch (err) {
      console.error('Fetch error:', err)
      setEmployeesError(getErrorMessage(err))
    } finally {
      setEmployeesLoading(false)
    }
  }, [user?.id, getErrorMessage, companyId])

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
      setDepartmentsError('Error loading departments')
    } finally {
      setDepartmentsLoading(false)
    }
  }, [])

  const fetchEmployeeFiles = useCallback(async (employeeId: string) => {
    setFilesLoading(true)
    setFilesError(null)
    try {
      const res = await fetch(`/api/employees/files/${employeeId}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar archivos')
      setEmployeeFiles(data.files || [])
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : 'Error al cargar archivos')
      setEmployeeFiles([])
    } finally {
      setFilesLoading(false)
    }
  }, [])

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
      setSchedulesError('Error loading work schedules')
    } finally {
      setSchedulesLoading(false)
    }
  }, [])

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
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)

      const sanitizedFormData: any = { ...formData }
      // Normalizar tipos para evitar fallos silenciosos en la API/DB
      if (typeof sanitizedFormData.base_salary === 'string') {
        const trimmed = sanitizedFormData.base_salary.trim()
        const parsed = trimmed === '' ? NaN : Number.parseFloat(trimmed)
        if (Number.isNaN(parsed)) {
          throw new Error('Salario base inválido. Por favor ingresa un número.')
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
      // pay_type: constraint permite 'fixed' | 'hourly'
      if (typeof sanitizedFormData.pay_type === 'string') {
        const rawPayType = sanitizedFormData.pay_type.trim()
        if (rawPayType === '') {
          sanitizedFormData.pay_type = null
        } else if (rawPayType !== 'fixed' && rawPayType !== 'hourly') {
          sanitizedFormData.pay_type = 'fixed'
        }
      }
      // payment_frequency: vacío = usa default de empresa (Capa 2)
      if (typeof sanitizedFormData.payment_frequency === 'string') {
        const pf = sanitizedFormData.payment_frequency.trim()
        if (pf === '') {
          sanitizedFormData.payment_frequency = null
        } else if (pf !== 'quincenal' && pf !== 'mensual' && pf !== 'semanal') {
          sanitizedFormData.payment_frequency = null
        }
      }
      // Campos JSONB: normalizar a objeto o null
      for (const key of ['address', 'metadata'] as const) {
        const value = sanitizedFormData[key]
        if (value === '' || value === null || value === undefined) {
          sanitizedFormData[key] = null
          continue
        }
        if (typeof value === 'string') {
          const trimmed = value.trim()
          if (!trimmed) {
            sanitizedFormData[key] = null
            continue
          }
          try {
            sanitizedFormData[key] = JSON.parse(trimmed)
          } catch {
            throw new Error(`El campo ${key === 'address' ? 'Dirección' : 'Metadatos'} debe ser JSON válido.`)
          }
        }
      }
      // Seguridad: no enviar campos que no existen en la tabla `employees`
      // Profile images are managed through employee_files table, not employees table
      delete sanitizedFormData.profile_image_path

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
    fetchEmployees
  ])

  const handleCancel = useCallback(() => {
    resetForm()
  }, [resetForm])

  const handleEdit = useCallback((employee: Employee) => {
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
      base_salary: employee.base_salary?.toString() || '',
      pay_type: (employee as any).pay_type || 'fixed',
      payment_frequency: (employee as any).payment_frequency || '',
      hire_date: employee.hire_date || '',
      termination_date: employee.termination_date || '',
      status: employee.status || 'active',
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      address: typeof employee.address === 'string' ? employee.address : JSON.stringify(employee.address || {}),
      metadata: typeof employee.metadata === 'object' ? JSON.stringify(employee.metadata || {}) : (employee.metadata || '')
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
  }, [])

  const handleDeactivate = useCallback((employee: Employee) => {
    setEmployeeToDeactivate(employee)
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
        const error = await response.json().catch(() => ({ error: 'Error al exportar' }))
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
      setEmployeesError(error instanceof Error ? error.message : 'Error al exportar empleados')
    } finally {
      setIsExporting(false)
    }
  }, [exportFormat, exportFilters])

  const handleViewDetails = useCallback((employee: Employee) => {
    setSelectedEmployee(employee)
    setShowDetailsModal(true)
    setDetailsActiveTab('personal')
    setSelectedEmployeeImageUrl(null)
    setSelectedEmployeeImageError(null)
    const profileImagePath = (employee as any).profile_image_path
    if (profileImagePath) {
      setSelectedEmployeeImageLoading(true)
      getSignedProfileImageUrl(profileImagePath)
        .then((url: string | null) => {
          setSelectedEmployeeImageUrl(url)
        })
        .catch((err: any) => {
          console.error('Error loading employee profile image:', err)
          setSelectedEmployeeImageError('No se pudo cargar la foto de perfil.')
        })
        .finally(() => setSelectedEmployeeImageLoading(false))
    } else {
      setSelectedEmployeeImageLoading(false)
    }
  }, [getSignedProfileImageUrl])

  const handleOpenCertificateModal = useCallback((employee: Employee) => {
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

    try {
      setIsSubmitting(true)
      
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
          termination_date: finalTerminationDate
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error deactivating employee: ${response.status} - ${errorText}`)
      }

      setShowDeactivateModal(false)
      setEmployeeToDeactivate(null)
      setTerminationDate('') // Resetear fecha
      fetchEmployees()
    } catch (error) {
      console.error('Error deactivating employee:', error)
      setEmployeesError(error instanceof Error ? error.message : 'Error deactivating employee')
    } finally {
      setIsSubmitting(false)
    }
  }, [employeeToDeactivate, fetchEmployees, terminationDate])

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

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    // Start with a copy to avoid mutating the original array
    let filtered = [...employees]

    // Filter by search term
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

    // Sort alphabetically - create a new sorted array
    const sorted = [...filtered].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || ''
      const nameB = b.name?.toLowerCase() || ''
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB)
      } else {
        return nameB.localeCompare(nameA)
      }
    })

    return sorted
  }, [employees, searchTerm, sortOrder])

  // Paginate results
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedEmployees.slice(startIndex, endIndex)
  }, [filteredAndSortedEmployees, currentPage, itemsPerPage])

  // Calculate total pages
  const totalPages = Math.ceil(filteredAndSortedEmployees.length / itemsPerPage)

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  useEffect(() => {
    if (shouldFetch) {
      fetchEmployees()
      fetchDepartments()
      fetchWorkSchedules()
    }
  }, [shouldFetch, fetchEmployees, fetchDepartments, fetchWorkSchedules])

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
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto"></div>
              <p className="mt-2 text-gray-300">
                {sessionLoading && "Verificando sesión..."}
                {employeesLoading && "Cargando empleados..."}
                {departmentsLoading && "Cargando departamentos..."}
                {schedulesLoading && "Cargando horarios..."}
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
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeesError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">Error al cargar empleados</h3>
                    <p className="text-sm mt-2 text-gray-300">{employeesError}</p>
                  </div>
                  <Button onClick={fetchEmployees} variant="outline" className="mb-4 bg-white/5 border-white/20 text-white hover:bg-white/10">
                    Reintentar cargar empleados
                  </Button>
                </div>
              )}
              
              {departmentsError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">Error al cargar departamentos</h3>
                    <p className="text-sm mt-2 text-gray-300">{departmentsError}</p>
                  </div>
                  <Button onClick={fetchDepartments} variant="outline" className="mb-4 bg-white/5 border-white/20 text-white hover:bg-white/10">
                    Reintentar cargar departamentos
                  </Button>
                </div>
              )}
              
              {schedulesError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">Error al cargar horarios</h3>
                    <p className="text-sm mt-2 text-gray-300">{schedulesError}</p>
                  </div>
                  <Button onClick={fetchWorkSchedules} variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                    Reintentar cargar horarios
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
                  Editando empleado: <span className="text-white font-semibold">{editingEmployee.name}</span>
                </p>
                <p className="text-xs text-blue-400/80 mt-1">
                  {editingEmployee.employee_code || 'Sin código'} • {editingEmployee.dni}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                title="Cancelar edición"
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
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-white">Empleados</h2>
              <p className="text-gray-300">Administra la información de los empleados</p>
            </div>
            <Button 
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Nuevo Empleado</span>
            </Button>
          </div>

          {/* Search and Sort Controls */}
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre, código, DNI, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
            </div>
            <Button
              onClick={toggleSortOrder}
              variant="outline"
              className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {sortOrder === 'asc' ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
              <span className="text-sm">
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </span>
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <>
          {employeesError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-md p-4">
              <div className="text-red-400">
                <h3 className="text-sm font-medium">Error al {editingEmployee ? 'actualizar' : 'crear'} empleado</h3>
                <p className="text-sm mt-1 text-gray-300">{employeesError}</p>
              </div>
            </div>
          )}
          {(departmentsError || schedulesError) && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-md p-4">
              <div className="text-yellow-400">
                <h3 className="text-sm font-medium">Advertencia</h3>
                <div className="text-sm mt-1 text-gray-300">
                  {departmentsError && <p>Error al cargar departamentos. <Button onClick={fetchDepartments} variant="link" className="text-yellow-400 underline p-0 h-auto">Reintentar</Button></p>}
                  {schedulesError && <p>Error al cargar horarios. <Button onClick={fetchWorkSchedules} variant="link" className="text-yellow-400 underline p-0 h-auto">Reintentar</Button></p>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">
                Lista de Empleados ({filteredAndSortedEmployees.length}{searchTerm && ` de ${employees.length}`})
              </CardTitle>
              <CardDescription className="text-gray-300">
                Empleados registrados en el sistema {totalPages > 1 && `- Página ${currentPage} de ${totalPages}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleExportClick('pdf')}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                title="Exportar a PDF"
                disabled={isExporting}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={() => handleExportClick('excel')}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                title="Exportar a Excel"
                disabled={isExporting}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={() => handleExportClick('csv')}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                title="Exportar a CSV"
                disabled={isExporting}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchTerm ? 'No se encontraron empleados con ese criterio' : 'No se encontraron empleados'}
            </div>
          ) : (
            <>
            <div className="space-y-4">
              {paginatedEmployees.map((employee) => {
                const whatsappLink = getWhatsAppLink(employee.phone, employee.name)

                return (
                  <div 
                    key={employee.id} 
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
                          {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                        {employee.attendance_status && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            employee.attendance_status === 'present' ? 'bg-brand-500/20 text-brand-400' :
                            employee.attendance_status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                            employee.attendance_status === 'absent' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {employee.attendance_status === 'present' ? 'Presente' :
                             employee.attendance_status === 'late' ? 'Tardanza' :
                             employee.attendance_status === 'absent' ? 'Ausente' : 'No registrado'}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                        <div>
                          <p><span className="font-medium text-gray-200">DNI:</span> {employee.dni}</p>
                          <p><span className="font-medium text-gray-200">Código:</span> {employee.employee_code || 'Sin asignar'}</p>
                          <p><span className="font-medium text-gray-200">Email:</span> {employee.email || 'No especificado'}</p>
                          <div className="flex items-center gap-2">
                            <p>
                              <span className="font-medium text-gray-200">Teléfono:</span>{' '}
                              {employee.phone || 'No especificado'}
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
                                  aria-label={`Enviar mensaje de WhatsApp a ${employee.name}`}
                                >
                                  <span className="flex items-center gap-1">
                                    <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">Mensaje instantáneo</span>
                                  </span>
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                        <div>
                          <p><span className="font-medium text-gray-200">Posición:</span> {employee.role || 'No especificada'}</p>
                          <p><span className="font-medium text-gray-200">Equipo:</span> {employee.team || 'Sin asignar'}</p>
                          <p><span className="font-medium text-gray-200">Departamento:</span> {employee.departments?.name || 'Sin asignar'}</p>
                          <p><span className="font-medium text-gray-200">Horario:</span> {employee.work_schedules?.name || 'Sin asignar'}</p>
                          {employee.check_in_time && (
                            <p><span className="font-medium text-gray-200">Entrada:</span> {formatTimeDisplay(employee.check_in_time)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {employee.employee_scores && (
                        <div className="text-right text-xs text-gray-400">
                          <p>Puntos: {employee.employee_scores.total_points || 0}</p>
                          <p>Semana: {employee.employee_scores.weekly_points || 0}</p>
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
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCertificateModal(employee)}
                          className="flex items-center gap-1 bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Constancia</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(employee)}
                          className="flex items-center gap-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all"
                          title={`Editar ${employee.name}`}
                          disabled={employeesLoading}
                        >
                          {employeesLoading && editingEmployee?.id === employee.id ? (
                            <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <PencilIcon className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            {employeesLoading && editingEmployee?.id === employee.id ? 'Cargando...' : 'Editar'}
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
                            <span className="hidden sm:inline">Dar Baja</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="text-sm text-gray-400">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedEmployees.length)} de {filteredAndSortedEmployees.length}
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
                    Anterior
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
                    Siguiente
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
                Detalles del Empleado
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
                    <Image
                      src={selectedEmployeeImageUrl}
                      alt={`Foto de ${selectedEmployee.name}`}
                      width={112}
                      height={112}
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
                  <p className="text-sm text-gray-400">{selectedEmployee.employee_code || 'Sin código'}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedEmployee.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {selectedEmployee.status === 'active' ? 'Activo' : 'Inactivo'}
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
                      {ATTENDANCE_STATUS_LABEL[selectedEmployee.attendance_status] ?? ATTENDANCE_STATUS_LABEL.unknown}
                    </span>
                  )}
                  {selectedEmployee.employee_scores && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                      Puntos {selectedEmployee.employee_scores.total_points ?? 0}
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
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {detailsActiveTab === 'personal' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Nombre Completo</label>
                        <div className="text-white font-medium">{selectedEmployee.name}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">DNI</label>
                        <div className="text-white font-medium">{selectedEmployee.dni}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Email</label>
                        <div className="text-white font-medium">{selectedEmployee.email || 'No especificado'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Teléfono</label>
                        <div className="text-white font-medium">{selectedEmployee.phone || 'No especificado'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Equipo</label>
                        <div className="text-white font-medium">{selectedEmployee.team || 'Sin asignar'}</div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-400">Dirección</label>
                        <div className="text-white font-medium">{formatAddress(selectedEmployee.address)}</div>
                      </div>
                    </div>
                    {personalNotes && (
                      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                        <h6 className="text-sm font-medium text-gray-300 mb-2">Notas personales</h6>
                        <p className="text-sm text-gray-200 leading-relaxed">{personalNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailsActiveTab === 'contract' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Código de Empleado</label>
                        <div className="text-white font-medium">{selectedEmployee.employee_code || 'Sin asignar'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Estado</label>
                        <div className="text-white font-medium">{selectedEmployee.status === 'active' ? 'Activo' : 'Inactivo'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Departamento</label>
                        <div className="text-white font-medium">{selectedEmployee.departments?.name || 'Sin asignar'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Cargo/Posición</label>
                        <div className="text-white font-medium">{selectedEmployee.role || 'No especificado'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Horario de Trabajo</label>
                        <div className="text-white font-medium">{selectedEmployee.work_schedules?.name || 'Sin asignar'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Fecha de Contratación</label>
                        <div className="text-white font-medium">{formatDateDisplay(selectedEmployee.hire_date)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Fecha de Terminación</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.status === 'inactive'
                            ? formatDateDisplay(selectedEmployee.termination_date)
                            : 'Contrato vigente'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Salario Base</label>
                        <div className="text-green-400 font-medium">{formatCurrency(selectedEmployee.base_salary)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Banco</label>
                        <div className="text-white font-medium">{selectedEmployee.bank_name || 'No especificado'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Cuenta Bancaria</label>
                        <div className="text-white font-medium">{selectedEmployee.bank_account || 'No especificada'}</div>
                      </div>
                    </div>
                    {contractNotes && (
                      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                        <h6 className="text-sm font-medium text-gray-300 mb-2">Notas contractuales</h6>
                        <p className="text-sm text-gray-200 leading-relaxed">{contractNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailsActiveTab === 'attendance' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Estado de Asistencia</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.attendance_status
                            ? ATTENDANCE_STATUS_LABEL[selectedEmployee.attendance_status]
                            : ATTENDANCE_STATUS_LABEL.unknown}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Entrada más reciente</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.check_in_time
                            ? formatTimeDisplay(selectedEmployee.check_in_time)
                            : 'Sin registro'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Salida más reciente</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.check_out_time
                            ? formatTimeDisplay(selectedEmployee.check_out_time)
                            : 'Sin registro'}
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
                              <h6 className="text-sm font-semibold text-white">Registro {index + 1}</h6>
                              <span className="text-xs text-gray-400">
                                {record.status ? record.status : 'Sin estado'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                              <div>
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">Entrada</span>
                                <span className="text-white">
                                  {record.check_in ? formatDateTimeDisplay(record.check_in) : 'Sin registro'}
                                </span>
                              </div>
                              {(record as any).lunch_start != null && (
                                <div>
                                  <span className="text-gray-400 block text-xs uppercase tracking-wider">Inicio almuerzo</span>
                                  <span className="text-white">
                                    {formatDateTimeDisplay((record as any).lunch_start)}
                                  </span>
                                </div>
                              )}
                              {(record as any).lunch_end != null && (
                                <div>
                                  <span className="text-gray-400 block text-xs uppercase tracking-wider">Fin almuerzo</span>
                                  <span className="text-white">
                                    {formatDateTimeDisplay((record as any).lunch_end)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">Salida</span>
                                <span className="text-white">
                                  {record.check_out ? formatDateTimeDisplay(record.check_out) : 'Sin registro'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-300">
                        No se han registrado asistencias recientes para este empleado.
                      </p>
                    )}
                    {attendanceInsights && (
                      <div className="border border-brand-500/30 rounded-lg p-4 bg-brand-500/10">
                        <h6 className="text-sm font-medium text-brand-200 mb-2">Resumen de asistencia</h6>
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
                          `Medida ${index + 1}`
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
                                <span className="text-xs text-gray-400">{formatDateDisplay(actionDate)}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed">
                              {actionNotes || 'Sin detalles adicionales.'}
                            </p>
                            {actionObject?.status && (
                              <p className="text-xs text-gray-400">
                                Estado: <span className="text-white">{String(actionObject.status)}</span>
                              </p>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-gray-300">
                        No se registran medidas disciplinarias para este empleado.
                      </p>
                    )}
                    {disciplinaryNotes && (
                      <div className="border border-red-500/30 rounded-lg p-4 bg-red-500/10">
                        <h6 className="text-sm font-medium text-red-200 mb-2">Notas del historial disciplinario</h6>
                        <p className="text-sm text-red-100 leading-relaxed">{disciplinaryNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailsActiveTab === 'emergency' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Nombre del contacto</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.emergency_contact_name || 'No especificado'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Teléfono</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.emergency_contact_phone || 'No especificado'}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-400">Dirección del contacto</label>
                        <div className="text-white font-medium">
                          {emergencyContactMetadata && typeof emergencyContactMetadata === 'object'
                            ? Object.values(emergencyContactMetadata)
                                .filter(Boolean)
                                .join(', ') || 'No especificada'
                            : typeof emergencyContactMetadata === 'string'
                            ? emergencyContactMetadata
                            : 'No especificada'}
                        </div>
                      </div>
                    </div>
                    {emergencyContactMetadata && typeof emergencyContactMetadata === 'object' && (
                      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                        <h6 className="text-sm font-medium text-gray-300 mb-2">Información adicional</h6>
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
                      <div>
                        <h6 className="text-sm font-medium text-gray-300 mb-3">Subir documento</h6>
                        <div className="mb-4">
                          <label className="block text-xs text-gray-400 mb-1">Categoría</label>
                          <select
                            value={documentCategoryForUpload}
                            onChange={(e) => setDocumentCategoryForUpload(e.target.value as typeof documentCategoryForUpload)}
                            className="w-full max-w-xs px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {(['contrato', 'identidad', 'certificado', 'diploma', 'otro'] as const).map((cat) => (
                              <option key={cat} value={cat} className="bg-gray-800 text-white">
                                {DOCUMENT_CATEGORY_LABELS[cat]}
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
                    )}
                    <div>
                      <h6 className="text-sm font-medium text-gray-300 mb-3">Archivos del empleado</h6>
                      {filesLoading ? (
                        <p className="text-sm text-gray-400">Cargando archivos...</p>
                      ) : filesError ? (
                        <p className="text-sm text-red-400">{filesError}</p>
                      ) : employeeFiles.length === 0 ? (
                        <p className="text-sm text-gray-400">No hay archivos cargados.</p>
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
                                    ? DOCUMENT_CATEGORY_LABELS[file.document_category] || file.document_category
                                    : 'Foto de perfil'}
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
                                    title="Descargar"
                                  >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                  </a>
                                )}
                                {['super_admin', 'company_admin', 'hr_manager'].includes(userProfile?.role || '') && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!confirm('¿Eliminar este archivo?')) return
                                      try {
                                        const res = await fetch(`/api/employees/files/delete/${file.id}`, {
                                          method: 'DELETE',
                                          credentials: 'include'
                                        })
                                        const data = await res.json()
                                        if (!res.ok) throw new Error(data.error || 'Error al eliminar')
                                        selectedEmployee?.id && fetchEmployeeFiles(selectedEmployee.id)
                                      } catch (err) {
                                        setFilesError(err instanceof Error ? err.message : 'Error al eliminar')
                                      }
                                    }}
                                    className="p-2 rounded-md bg-white/5 text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition"
                                    title="Eliminar"
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
                Cerrar
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
                Generar Constancia
              </Button>
              <Button
                onClick={() => {
                  if (!selectedEmployee) return
                  handleEdit(selectedEmployee)
                  closeDetailsModal()
                }}
                className="flex-1 bg-brand-600 hover:bg-brand-700"
              >
                Editar Empleado
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
              Confirmar Baja de Empleado
            </h3>
            <p className="text-gray-300 mb-4">
              ¿Estás seguro de que quieres dar de baja a <strong className="text-white">{employeeToDeactivate.name}</strong>?
              Esta acción cambiará su estado a "Inactivo".
            </p>
            
            {/* Campo de fecha de terminación */}
            <div className="mb-6">
              <label htmlFor="termination-date" className="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Terminación
              </label>
              <input
                type="date"
                id="termination-date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                placeholder="Selecciona la fecha de terminación"
              />
              <p className="text-xs text-gray-400 mt-1">
                Deja vacío para usar la fecha actual
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={confirmDeactivate}
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Baja'}
              </Button>
              <Button
                onClick={() => {
                  setShowDeactivateModal(false)
                  setEmployeeToDeactivate(null)
                  setTerminationDate('') // Resetear fecha
                }}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
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
                Opciones de Exportación - {exportFormat?.toUpperCase()}
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
                  <p className="text-sm font-medium text-brand-300 mb-2">Filtros aplicados:</p>
                  <div className="text-xs text-brand-200 space-y-1">
                    {exportFilters.status.length > 0 && (
                      <p>• Estados: {exportFilters.status.map(s => s === 'active' ? 'Activos' : s === 'inactive' ? 'Inactivos' : 'Terminados').join(', ')}</p>
                    )}
                    {exportFilters.departmentIds.length > 0 && (
                      <p>• Departamentos: {exportFilters.departmentIds.length} seleccionado(s)</p>
                    )}
                    {exportFilters.employeeIds.length > 0 && (
                      <p>• Empleados: {exportFilters.employeeIds.length} seleccionado(s)</p>
                    )}
                  </div>
                </div>
              )}

              {/* Filtro por Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Estado de Empleados
                </label>
                <div className="space-y-2">
                  {['active', 'inactive', 'terminated'].map((status) => (
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
                        {status === 'active' ? 'Activos' : status === 'inactive' ? 'Inactivos' : 'Terminados'}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Si no seleccionas ningún estado, se exportarán todos los empleados
                </p>
              </div>

              {/* Filtro por Departamentos */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Departamentos
                </label>
                {departments.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay departamentos disponibles</p>
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
                  Si no seleccionas ningún departamento, se exportarán empleados de todos los departamentos
                </p>
              </div>

              {/* Filtro por Empleados Específicos */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Empleados Específicos
                </label>
                {employees.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay empleados disponibles</p>
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
                  Si no seleccionas ningún empleado, se exportarán todos los empleados que cumplan los otros filtros
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
                Cancelar
              </Button>
              <Button
                onClick={handleExportConfirm}
                className="flex-1 bg-brand-600 hover:bg-brand-700"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Exportar
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