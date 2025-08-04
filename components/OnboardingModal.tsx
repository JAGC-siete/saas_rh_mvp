import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface OnboardingData {
  employee: {
    id: string
    name: string
    employee_code: string
    department: string
    department_id: string
  }
  currentSchedule: { start: string; end: string } | null
  defaultSchedule: { start: string; end: string }
  needsScheduleVerification: boolean
  welcomeMessage: string
}

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  data: OnboardingData
  onConfirm: (schedule: { start: string; end: string }) => void
  onSkip: () => void
}

export default function OnboardingModal({ 
  isOpen, 
  onClose, 
  data, 
  onConfirm, 
  onSkip 
}: OnboardingModalProps) {
  const [startTime, setStartTime] = useState(data.currentSchedule?.start || data.defaultSchedule.start)
  const [endTime, setEndTime] = useState(data.currentSchedule?.end || data.defaultSchedule.end)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Welcome, 2: Schedule, 3: Gamification

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm({ start: startTime, end: endTime })
      setStep(3) // Move to gamification step
    } catch (error) {
      console.error('Error updating schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    onClose()
    setStep(1) // Reset for next time
  }

  const renderWelcomeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Bienvenido al Sistema!
        </h2>
        <p className="text-gray-600 mb-6">
          {data.welcomeMessage}
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Información del Empleado</h3>
        <div className="space-y-2 text-sm">
          <div><strong>Nombre:</strong> {data.employee.name}</div>
          <div><strong>Código:</strong> {data.employee.employee_code}</div>
          <div><strong>Departamento:</strong> {data.employee.department}</div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={() => setStep(2)} 
          className="flex-1"
          size="lg"
        >
          Continuar
        </Button>
        <Button 
          onClick={onSkip} 
          variant="outline" 
          className="flex-1"
          size="lg"
        >
          Saltar
        </Button>
      </div>
    </div>
  )

  const renderScheduleStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">⏰</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Configuración de Horario
        </h2>
        <p className="text-gray-600">
          Verifiquemos tu horario de trabajo para un mejor control de asistencia.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">Horario Sugerido</h3>
          <p className="text-sm text-yellow-800">
            Basado en tu departamento ({data.employee.department}), tu horario sugerido es:
          </p>
          <div className="mt-2 font-mono text-lg font-bold text-yellow-900">
            {data.defaultSchedule.start} - {data.defaultSchedule.end}
          </div>
        </div>

        {data.currentSchedule && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Horario Actual</h3>
            <p className="text-sm text-gray-700">
              Tu horario actualmente asignado es:
            </p>
            <div className="mt-2 font-mono text-lg font-bold text-gray-900">
              {data.currentSchedule.start} - {data.currentSchedule.end}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">¿Es correcto tu horario?</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de Entrada
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de Salida
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-center"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={() => setStep(1)} 
          variant="outline" 
          className="flex-1"
        >
          Atrás
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Actualizando...' : 'Confirmar Horario'}
        </Button>
      </div>
    </div>
  )

  const renderGamificationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🏆</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Sistema de Gamificación
        </h2>
        <p className="text-gray-600">
          ¡Gana puntos y logros por tu puntualidad y asistencia!
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-3">🎯 Cómo Ganar Puntos</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span><strong>+5 puntos</strong> por registrar asistencia</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">⏰</span>
              <span><strong>+3 puntos</strong> por llegar temprano (5+ min antes)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">🎯</span>
              <span><strong>+2 puntos</strong> por puntualidad (máximo 5 min tarde)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">⭐</span>
              <span><strong>+5 puntos</strong> por asistencia perfecta (sin tardanza)</span>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-3">🏅 Logros Especiales</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-purple-600">📅</span>
              <span><strong>Semana Perfecta:</strong> 5 días puntuales = +50 puntos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-600">🌅</span>
              <span><strong>Early Bird:</strong> Llegar temprano 3 días seguidos = +30 puntos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-600">📊</span>
              <span><strong>Consistencia:</strong> 30 días sin tardanzas = +100 puntos</span>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="font-semibold text-orange-900 mb-3">⚠️ Penalizaciones</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-orange-600">⏰</span>
              <span><strong>-1 punto</strong> por cada 5 minutos de tardanza</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-600">🚫</span>
              <span><strong>-10 puntos</strong> por ausencia sin justificación</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">📈 Beneficios</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">🏆</span>
              <span>Acceso a <strong>leaderboards</strong> de empleados destacados</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">🎁</span>
              <span>Posibilidad de <strong>reconocimientos</strong> y premios</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">📊</span>
              <span>Seguimiento de tu <strong>progreso personal</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          onClick={handleComplete} 
          size="lg"
          className="px-8"
        >
          ¡Entendido! Comenzar Check-in
        </Button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {step === 1 && renderWelcomeStep()}
          {step === 2 && renderScheduleStep()}
          {step === 3 && renderGamificationStep()}
        </div>
      </div>
    </div>
  )
} 