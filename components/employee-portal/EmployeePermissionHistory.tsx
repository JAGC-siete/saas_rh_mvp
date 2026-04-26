import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface PermissionRecord {
  id: string
  start_date: string
  end_date: string
  days_requested: number
  reason: string
  status: string
  rejection_reason?: string
  attachment_url?: string
  attachment_name?: string
  created_at: string
  leave_type: {
    id: string
    name: string
    color: string
    is_paid: boolean
  }
}

interface EmployeePermissionHistoryProps {
  employeeId?: string
}

export default function EmployeePermissionHistory({ employeeId }: EmployeePermissionHistoryProps) {
  const [permissions, setPermissions] = useState<PermissionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const limit = 10

  useEffect(() => {
    fetchPermissions()
  }, [currentPage])

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/employees/me/permissions?page=${currentPage}&limit=${limit}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const payload = await response.json()
        const rows = Array.isArray(payload) ? payload : payload.data
        const total = Array.isArray(payload) ? payload.length : Number(payload.total) || 0
        setPermissions(rows || [])
        setTotalRecords(total)
      } else {
        setError('Error al cargar el historial de permisos')
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const cancelRequest = async (id: string) => {
    if (!confirm('¿Cancelar esta solicitud pendiente?')) return
    setCancellingId(id)
    try {
      const response = await fetch(`/api/employees/me/permissions/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })
      if (response.ok) {
        await fetchPermissions()
      } else {
        const j = await response.json().catch(() => ({}))
        alert(j.message || j.error || 'No se pudo cancelar')
      }
    } catch (e) {
      console.error(e)
      alert('Error de conexión')
    } finally {
      setCancellingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-HN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatDuration = (record: PermissionRecord) => {
    // If days_requested is less than 1, it's likely an hourly permission
    if (record.days_requested < 1) {
      const hours = Math.round(record.days_requested * 8)
      return `${hours} hora${hours > 1 ? 's' : ''}`
    }
    
    // For daily permissions
    if (record.days_requested === 1) {
      return '1 día'
    }
    
    return `${record.days_requested} días`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400'
      case 'rejected': return 'bg-red-500/20 text-red-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'cancelled': return 'bg-gray-500/20 text-gray-300'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado'
      case 'rejected': return 'Rechazado'
      case 'pending': return 'Pendiente'
      case 'cancelled': return 'Cancelada'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto"></div>
        <p className="text-gray-300 mt-2">Cargando historial...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-2">⚠️</div>
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchPermissions}
          className="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">📋</div>
        <h3 className="text-lg font-medium text-white mb-2">
          Sin Registros de Permisos
        </h3>
        <p className="text-gray-300">
          No hay registros de permisos disponibles
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Records List */}
      <div className="space-y-3">
        {permissions.map((record) => (
          <div key={record.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span 
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${record.leave_type.color}20`,
                      color: record.leave_type.color
                    }}
                  >
                    {record.leave_type.name}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(record.status)}`}>
                    {getStatusText(record.status)}
                  </span>
                  {record.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => cancelRequest(record.id)}
                      disabled={cancellingId === record.id}
                      className="text-xs px-2 py-1 rounded border border-white/20 text-gray-300 hover:bg-white/10 disabled:opacity-50"
                    >
                      {cancellingId === record.id ? '…' : 'Cancelar'}
                    </button>
                  )}
                </div>
                
                <p className="text-white font-medium text-sm">
                  {formatDate(record.start_date)} - {formatDate(record.end_date)}
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span>Duración: {formatDuration(record)}</span>
                  {record.leave_type.is_paid && (
                    <span className="text-green-400">💰 Pagado</span>
                  )}
                  <span>
                    Registrado: {new Date(record.created_at).toLocaleDateString('es-HN')}
                  </span>
                </div>
              </div>
            </div>
            
            {record.reason && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Motivo:</p>
                <p className="text-white text-sm">{record.reason}</p>
              </div>
            )}
            {record.status === 'rejected' && record.rejection_reason && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400 mb-1">Motivo del rechazo:</p>
                <p className="text-white text-sm">{record.rejection_reason}</p>
              </div>
            )}
            {record.attachment_url && (
              <div className="mt-3">
                <a
                  href={record.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-400 hover:text-brand-300 underline"
                >
                  Ver adjunto
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalRecords > limit && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-gray-400">
            Mostrando {(currentPage - 1) * limit + 1}–{(currentPage - 1) * limit + permissions.length} de {totalRecords}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/10 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-white">
              Página {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage * limit >= totalRecords}
              className="px-3 py-1 bg-white/10 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
