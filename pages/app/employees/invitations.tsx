import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { EyeIcon, EyeSlashIcon, UserPlusIcon, ClockIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Employee {
  id: string
  name: string
  email: string
  status: string
  role: string
}

interface Invitation {
  id: string
  email: string
  status: string
  expires_at: string
  created_at: string
  employees: {
    name: string
    email: string
    role: string
  }
}

export default function EmployeeInvitations() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchEmployees()
      fetchInvitations()
    }
  }, [user])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees/list')
      const data = await response.json()
      
      if (response.ok) {
        setEmployees(data.employees || [])
      } else {
        setError(data.error || 'Error cargando empleados')
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      setError('Error de conexión')
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/admin/invitations/list')
      const data = await response.json()
      
      if (response.ok) {
        setInvitations(data.invitations || [])
      } else {
        setError(data.error || 'Error cargando invitaciones')
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async (employeeId: string, email: string) => {
    setSending(employeeId)
    setError('')

    try {
      const response = await fetch('/api/admin/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employeeId,
          email: email,
          expiresInHours: 48
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Recargar invitaciones
        await fetchInvitations()
        alert(`Invitación enviada exitosamente a ${email}`)
      } else {
        setError(data.error || 'Error enviando invitación')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      setError('Error de conexión')
    } finally {
      setSending(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'accepted':
        return <CheckIcon className="h-5 w-5 text-green-500" />
      case 'expired':
        return <XMarkIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'accepted':
        return 'Aceptada'
      case 'expired':
        return 'Expirada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'accepted':
        return 'text-green-600 bg-green-100'
      case 'expired':
        return 'text-red-600 bg-red-100'
      case 'cancelled':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // Filtrar empleados que no tienen invitación pendiente o aceptada
  const employeesWithoutInvitation = employees.filter(employee => {
    return !invitations.some(invitation => 
      invitation.employees.email === employee.email && 
      ['pending', 'accepted'].includes(invitation.status)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-300 rounded"></div>
              <div className="h-64 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Invitaciones</h1>
          <p className="text-gray-600 mt-2">
            Envíe invitaciones a empleados para acceder al portal
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lista de empleados sin invitación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlusIcon className="h-6 w-6" />
                <span>Empleados sin Acceso</span>
              </CardTitle>
              <CardDescription>
                {employeesWithoutInvitation.length} empleados pendientes de invitación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {employeesWithoutInvitation.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Todos los empleados tienen invitaciones
                  </p>
                ) : (
                  employeesWithoutInvitation.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{employee.name}</h4>
                        <p className="text-sm text-gray-600">{employee.email}</p>
                        <p className="text-xs text-gray-500">{employee.role}</p>
                      </div>
                      <Button
                        onClick={() => sendInvitation(employee.id, employee.email)}
                        disabled={sending === employee.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {sending === employee.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Enviar Invitación'
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de invitaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClockIcon className="h-6 w-6" />
                <span>Invitaciones Enviadas</span>
              </CardTitle>
              <CardDescription>
                {invitations.length} invitaciones en total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {invitations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay invitaciones enviadas
                  </p>
                ) : (
                  invitations.map((invitation) => (
                    <div key={invitation.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{invitation.employees.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                          {getStatusText(invitation.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{invitation.email}</p>
                      <p className="text-xs text-gray-500">
                        Enviada: {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                      {invitation.status === 'pending' && (
                        <p className="text-xs text-gray-500">
                          Expira: {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
                <p className="text-sm text-gray-600">Total Empleados</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {invitations.filter(i => i.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {invitations.filter(i => i.status === 'accepted').length}
                </p>
                <p className="text-sm text-gray-600">Aceptadas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {invitations.filter(i => i.status === 'expired').length}
                </p>
                <p className="text-sm text-gray-600">Expiradas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
