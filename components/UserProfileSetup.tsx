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
    company_name: ''
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


            {/* Role Info */}
            <div className="glass-strong p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white">Rol Asignado</span>
              </div>
              <p className="text-xs text-gray-300">
                Serás configurado como <strong className="text-white">HR Manager</strong> con acceso completo para gestionar empleados, departamentos y nóminas. Tu ID de empleado será asignado automáticamente como <strong className="text-white">EMP001</strong>.
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
