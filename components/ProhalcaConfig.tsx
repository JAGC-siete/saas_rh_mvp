import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Building2, 
  Clock, 
  Users, 
  Calculator, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Settings,
  FileText,
  TrendingUp
} from 'lucide-react'

interface ProhalcaConfigProps {
  companyId: string
  onConfigComplete?: () => void
}

interface ClientConfig {
  clientType: string
  config: any
  message: string
}

export default function ProhalcaConfig({ companyId, onConfigComplete }: ProhalcaConfigProps) {
  const [config, setConfig] = useState<ClientConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [setupStatus, setSetupStatus] = useState({
    departments: false,
    shifts: false,
    validation: false
  })

  useEffect(() => {
    loadClientConfig()
  }, [companyId])

  const loadClientConfig = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payroll/client-specific', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_config'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error cargando configuración')
      }

      setConfig(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const setupDepartments = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payroll/client-specific', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup_departments'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error configurando departamentos')
      }

      setSetupStatus(prev => ({ ...prev, departments: true }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const setupShifts = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payroll/client-specific', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup_shifts'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error configurando horarios')
      }

      setSetupStatus(prev => ({ ...prev, shifts: true }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const completeSetup = () => {
    setSetupStatus(prev => ({ ...prev, validation: true }))
    onConfigComplete?.()
  }

  const isProhalca = config?.clientType === 'prohalca'
  const isSetupComplete = setupStatus.departments && setupStatus.shifts && setupStatus.validation

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="liquid">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración Específica del Cliente
          </CardTitle>
          <CardDescription className="text-gray-300">
            Configuración automática basada en el tipo de cliente detectado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando configuración...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {config && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={isProhalca ? "default" : "secondary"}>
                  {isProhalca ? "PROHALCA" : "Estándar"}
                </Badge>
                <span className="text-white">{config.message}</span>
              </div>

              {isProhalca && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Configuración PROHALCA Detectada
                  </h4>
                  <p className="text-sm text-gray-300">
                    Se detectó automáticamente la configuración específica para Procesadora Hondureña de Alimentos de Camarón S.A.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Steps */}
      {config && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Departments */}
          <Card variant="liquid">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Departamentos
              </CardTitle>
              <CardDescription className="text-gray-300">
                Configurar áreas funcionales específicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProhalca && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">
                    <strong>Áreas PROHALCA:</strong>
                  </div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Producción / Planta (L6,400 - L7,000)</li>
                    <li>• Mantenimiento / Infraestructura (L6,400 - L10,800)</li>
                    <li>• Administración / Gestión (L6,400 - L14,600)</li>
                    <li>• Alta Dirección (L15,000 - L78,000)</li>
                  </ul>
                </div>
              )}

              <Button
                onClick={setupDepartments}
                disabled={loading || setupStatus.departments}
                className="w-full"
                variant={setupStatus.departments ? "outline" : "default"}
              >
                {setupStatus.departments ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Departamentos Configurados
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Configurar Departamentos
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Shifts */}
          <Card variant="liquid">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horarios
              </CardTitle>
              <CardDescription className="text-gray-300">
                Configurar turnos y horarios de trabajo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProhalca && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">
                    <strong>Turnos PROHALCA:</strong>
                  </div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Diurno: 06:00 - 18:00 (12h)</li>
                    <li>• Nocturno: 18:00 - 06:00 (12h + 25%)</li>
                    <li>• Doble Turno: 24h (2x rate)</li>
                    <li>• Estándar: 07:00 - 15:00 (8h)</li>
                    <li>• Fijo: 08:00 - 17:00 (9h)</li>
                  </ul>
                </div>
              )}

              <Button
                onClick={setupShifts}
                disabled={loading || setupStatus.shifts}
                className="w-full"
                variant={setupStatus.shifts ? "outline" : "default"}
              >
                {setupStatus.shifts ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Horarios Configurados
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Configurar Horarios
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payroll Fields Info */}
      {config && isProhalca && (
        <Card variant="liquid">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Campos de Nómina PROHALCA
            </CardTitle>
            <CardDescription className="text-gray-300">
              Campos específicos que el sistema detectará automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-white font-medium mb-2">Campos Estándar</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• empleado_id</li>
                  <li>• nombre</li>
                  <li>• puesto</li>
                  <li>• area</li>
                  <li>• sueldo_base</li>
                  <li>• horas_laboradas</li>
                  <li>• sueldo_bruto</li>
                  <li>• sueldo_neto</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Campos PROHALCA</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• horas_extras</li>
                  <li>• valor_hora_extra</li>
                  <li>• feriado_trabajado</li>
                  <li>• turno</li>
                  <li>• doble_turno</li>
                  <li>• descanso_turno_noche</li>
                  <li>• compensacion_domingo</li>
                  <li>• pausas_descansos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion */}
      {setupStatus.departments && setupStatus.shifts && (
        <Card variant="liquid" className="border-green-500/30 bg-green-900/10">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Configuración Completada
            </CardTitle>
            <CardDescription className="text-gray-300">
              El sistema está listo para procesar nóminas específicas de PROHALCA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Departamentos configurados</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Horarios configurados</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Campos de nómina detectados</span>
              </div>

              <Button
                onClick={completeSetup}
                disabled={isSetupComplete}
                className="w-full bg-green-600 hover:bg-green-700"
                variant={isSetupComplete ? "outline" : "default"}
              >
                {isSetupComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Configuración Finalizada
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Finalizar Configuración
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
