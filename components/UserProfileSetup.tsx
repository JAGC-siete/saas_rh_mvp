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
    employee_id: '',
    country_code: 'HND' as 'HND' | 'SLV' | 'GTM'
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
          country_code: formData.country_code,
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

  const handleCountryChange = (value: string) => {
    if (value === 'HND' || value === 'SLV' || value === 'GTM') {
      setFormData(prev => ({ ...prev, country_code: value }))
    }
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <Card variant="glass" className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20">
            <Building className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">¡Bienvenido a Humano SISU!</CardTitle>
          <p className="text-gray-300">
            Configurá tu empresa para comenzar a gestionar tu equipo
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Nombre de tu Empresa
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Ej: Mi Empresa S.A. de C.V."
                required
                disabled={loading}
                className="input-glass h-12 w-full"
              />
              <p className="text-xs text-gray-300 mt-1">
                Crearemos automáticamente tu empresa en el sistema
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                País de la empresa
              </label>
              <select
                value={formData.country_code}
                onChange={(e) => handleCountryChange(e.target.value)}
                disabled={loading}
                className="input-glass h-12 w-full rounded-md border border-white/20 bg-white/5 px-3 text-white"
              >
                <option value="HND" className="bg-slate-900">
                  Honduras
                </option>
                <option value="SLV" className="bg-slate-900">
                  El Salvador
                </option>
                <option value="GTM" className="bg-slate-900">
                  Guatemala
                </option>
              </select>
              <p className="text-xs text-gray-300 mt-1">
                Define la jurisdicción laboral y fiscal. No se puede cambiar luego sin soporte.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Tu ID de Empleado (Opcional)
              </label>
              <input
                type="text"
                value={formData.employee_id}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                placeholder="Ej: EMP001, 001, o tu código actual"
                disabled={loading}
                className="input-glass h-12 w-full"
              />
              <p className="text-xs text-gray-300 mt-1">
                Si tenés un código de empleado, úsalo. Los siguientes empleados seguirán el patrón correlativo.
              </p>
            </div>

            {/* Role Info */}
            <div className="glass-strong p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white">Rol Asignado</span>
              </div>
              <p className="text-xs text-gray-300">
                Serás configurado como <strong className="text-white">HR Manager</strong> con acceso completo para gestionar empleados, departamentos y nóminas. Si no proporcionás un ID, se asignará automáticamente <strong className="text-white">EMP001</strong>.
              </p>
            </div>

            {error && (
              <div className="text-red-200 text-sm glass-strong p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="modern"
              size="lg"
              className="w-full h-12"
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
