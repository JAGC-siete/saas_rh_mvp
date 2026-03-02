import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

interface PermissionType {
  id: string
  name: string
  color: string
  is_paid: boolean
  requires_approval: boolean
  max_days_per_year: number
}

interface FormData {
  leave_type_id: string
  start_date: string
  end_date: string
  duration_hours?: number // For hourly permissions (2, 4, 6, 8 hours)
  reason: string
  attachment?: File
}

interface EmployeePermissionFormProps {
  onSubmit: (data: FormData) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}

export default function EmployeePermissionForm({ onSubmit, onCancel, isLoading }: EmployeePermissionFormProps) {
  const [formData, setFormData] = useState<Omit<FormData, 'attachment'>>({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    duration_hours: 8,
    reason: ''
  })
  const [permissionTypes, setPermissionTypes] = useState<PermissionType[]>([])
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchPermissionTypes()
  }, [])

  const fetchPermissionTypes = async () => {
    try {
      const response = await fetch('/api/employees/me/permission-types', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const types = await response.json()
        setPermissionTypes(types)
      } else {
        setError('Error al cargar tipos de permisos')
      }
    } catch (error) {
      console.error('Error fetching permission types:', error)
      setError('Error de conexión')
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
    
    // Handle duration hours selection
    if (name === 'duration_hours') {
      const parsed = value ? parseInt(value, 10) : undefined
      setFormData(prev => ({ ...prev, duration_hours: parsed }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setError('Solo se permiten archivos PDF o JPG')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo debe ser menor a 5MB')
        return
      }
      setSelectedFile(file)
      setError('')
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => setFilePreview(ev.target?.result as string)
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    const fileInput = document.getElementById('permission-file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.leave_type_id || !formData.start_date || !formData.end_date || !formData.reason.trim()) {
      setError('Por favor complete todos los campos obligatorios')
      return
    }

    // Validate dates
    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError('Fechas inválidas')
      return
    }
    
    if (endDate < startDate) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio')
      return
    }

    // Validate duration for hourly permissions (optional)
    if (formData.duration_hours && (formData.duration_hours <= 0 || formData.duration_hours > 24)) {
      setError('La duración en horas debe estar entre 1 y 24')
      return
    }

    try {
      await onSubmit({
        ...formData,
        attachment: selectedFile || undefined
      })
    } catch (error) {
      setError('Error al registrar el permiso')
      console.error('Error submitting permission:', error)
    }
  }

  const getSelectedPermissionType = () => {
    return permissionTypes.find(type => type.id === formData.leave_type_id)
  }

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
            📝
          </span>
          Solicitud de Permiso
        </CardTitle>
        <p className="text-gray-300 text-sm">
          Envíe su solicitud para aprobación del administrador
        </p>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Permiso */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Permiso *
            </label>
            <select
              name="leave_type_id"
              value={formData.leave_type_id}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              required
            >
              <option value="">Seleccione un tipo de permiso</option>
              {permissionTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {getSelectedPermissionType() && (
              <div className="mt-2 text-xs text-gray-400">
                {getSelectedPermissionType()?.is_paid ? 'Permiso pagado' : 'Permiso sin goce de salario'}
              </div>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Fin *
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Duración (Opcional - solo para permisos por horas) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duración en Horas (Opcional)
            </label>
            <div className="text-sm text-gray-400 mb-2">
              Seleccione solo si es un permiso por horas específicas. Si no selecciona, se calculará por días completos.
            </div>
            <select
              name="duration_hours"
              value={formData.duration_hours || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            >
              <option value="">Permiso por días completos</option>
              <option value={2}>2 horas</option>
              <option value={4}>4 horas (Medio día)</option>
              <option value={6}>6 horas</option>
              <option value={8}>8 horas (Día completo)</option>
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Motivo del Permiso *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={3}
              placeholder="Describa el motivo del permiso..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Archivo de Respaldo (PDF o JPG) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Archivo de Respaldo (PDF o JPG, opcional)
            </label>
            <div className="border-2 border-dashed border-white/30 rounded-xl p-6 text-center bg-white/5 hover:border-white/50 transition-all">
              <input
                id="permission-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="permission-file-input" className="cursor-pointer block">
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/70" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-white">{selectedFile ? selectedFile.name : 'Clic para subir'}</span>
                  <p className="text-xs text-gray-400">PDF o JPG hasta 5MB</p>
                </div>
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={removeFile}
                  className="mt-2 text-red-400 hover:text-red-300 text-sm"
                >
                  Quitar archivo
                </button>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Registrando...</span>
                </div>
              ) : (
                'Registrar Permiso'
              )}
            </Button>
            
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
