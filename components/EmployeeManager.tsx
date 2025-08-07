import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useSupabaseSession } from '../lib/hooks/useSession'
import { Employee } from '../lib/types/employee'

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useSupabaseSession()

  // Simple fetch function
  const fetchEmployees = async () => {
    if (!user?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching employees for user:', user.id)
      
      const response = await fetch('/api/employees/search?limit=50')
      console.log('📡 API Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ API Data received:', data)
      
      setEmployees(data.employees || [])
    } catch (err) {
      console.error('💥 Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Error fetching employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [user?.id])

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando empleados...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <h3 className="text-lg font-semibold">Error al cargar empleados</h3>
                <p className="text-sm mt-2">{error}</p>
              </div>
              <Button onClick={fetchEmployees} variant="outline">
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Empleados ({employees.length})</CardTitle>
          <CardDescription>
            Lista simplificada de empleados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No se encontraron empleados
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{employee.name}</h3>
                      <p className="text-sm text-gray-600">DNI: {employee.dni}</p>
                      <p className="text-sm text-gray-600">Código: {employee.employee_code}</p>
                      <p className="text-sm text-gray-600">Email: {employee.email}</p>
                      <p className="text-sm text-gray-600">Departamento: {employee.departments?.name || 'Sin asignar'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}