import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Loader2, User, Building, CheckCircle } from 'lucide-react'

interface UserProfileSetupProps {
  onComplete: () => void
}

export default function UserProfileSetup({ onComplete }: UserProfileSetupProps) {
  const { user, refreshUserProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    company_name: '',
    employee_id: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/user-profiles/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.company_name,
          employee_id: formData.employee_id || null,
          role: 'hr_manager', // Fixed role
          is_active: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create profile')
      }

      const data = await response.json()
      console.log('Profile created:', data.profile)
      
      // Refresh user profile in context
      await refreshUserProfile()
      
      // Complete onboarding
      onComplete()
    } catch (err: any) {
      setError(err.message || 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-brand-100 rounded-full flex items-center justify-center mb-4">
            <Building className="h-6 w-6 text-brand-900" />
          </div>
          <CardTitle className="text-2xl">¡Bienvenido a Humano SISU!</CardTitle>
          <p className="text-gray-600">
            Configurá tu empresa para comenzar a gestionar tu equipo
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Nombre de tu Empresa
              </label>
              <Input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Ej: Mi Empresa S.A. de C.V."
                required
                disabled={loading}
                className="h-12"
              />
              <p className="text-xs text-gray-500 mt-1">
                Crearemos automáticamente tu empresa en el sistema
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tu ID de Empleado (Opcional)
              </label>
              <Input
                type="text"
                value={formData.employee_id}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                placeholder="Ej: EMP001 o tu número de empleado"
                disabled={loading}
                className="h-12"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si ya tenés un ID de empleado en tu empresa
              </p>
            </div>

            {/* Role Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Rol Asignado</span>
              </div>
              <p className="text-xs text-blue-700">
                Serás configurado como <strong>HR Manager</strong> con acceso completo para gestionar empleados, departamentos y nóminas.
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-brand-900 hover:bg-brand-800"
              disabled={loading || !formData.company_name}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Configurando tu empresa...
                </>
              ) : (
                '🚀 Comenzar con Humano SISU'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
