import { useState } from 'react'
import ProtectedRoute from '../../components/ProtectedRoute'
import AppRoleGate from '../../components/AppRoleGate'
import DashboardLayout from '../../components/DashboardLayout'
import { PAYROLL_NAV_ROLES } from '../../lib/auth/role-access'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { CesantiasRequestInput, motivoSalidaEnum } from '../../lib/payroll/cesantias-schema'

type LiquidacionResponse = import('../../lib/payroll/cesantias').LiquidacionResult
type ZodValidationError = {
  _errors?: string[]
  [key: string]: ZodValidationError | string[] | undefined
}

const MOTIVO_SALIDA_OPTIONS: { value: CesantiasRequestInput['parametrosCalculo']['motivoSalida']; label: string }[] = [
  { value: 'RENUNCIA', label: 'Renuncia' },
  { value: 'DESPIDO_JUSTIFICADO', label: 'Despido Justificado' },
  { value: 'DESPIDO_INJUSTIFICADO', label: 'Despido Injustificado' },
  { value: 'CAUSA_AJENA_TRABAJADOR', label: 'Causa ajena a la voluntad del trabajador' },
  { value: 'FALLECIMIENTO', label: 'Fallecimiento del trabajador' },
  { value: 'PENSION_JUBILACION_EQUIVALENTE', label: 'Jubilación / pensión equivalente' },
  { value: 'FIN_CONTRATO', label: 'Fin de contrato' },
  { value: 'MUTUO_ACUERDO', label: 'Mutuo acuerdo' }
]

export default function CesantiasPage() {
  const [incomeInputMode, setIncomeInputMode] = useState<'BASE' | 'PROMEDIO' | 'ULTIMOS_6'>('BASE')
  const [salariosUltimos6MesesRaw, setSalariosUltimos6MesesRaw] = useState('')

  const [form, setForm] = useState<CesantiasRequestInput>({
    empleadoId: undefined,
    datosManuales: {
      salarioBaseMensual: 0,
      fechaIngreso: '',
      fechaEgreso: ''
    },
    parametrosCalculo: {
      motivoSalida: motivoSalidaEnum.enum.RENUNCIA,
      montoRapAcumulado: 0,
      preavisoGozado: false,
      condiciones: {}
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<LiquidacionResponse | null>(null)

  const handleChange = (field: keyof CesantiasRequestInput['datosManuales'], value: string) => {
    setForm((prev) => ({
      ...prev,
      datosManuales: {
        ...prev.datosManuales,
        [field]: field === 'salarioBaseMensual' || field === 'salarioPromedioMensual' ? Number(value) || 0 : value
      }
    }))
  }

  const handleParametrosChange = (
    field: keyof CesantiasRequestInput['parametrosCalculo'],
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      parametrosCalculo: {
        ...prev.parametrosCalculo,
        [field]:
          field === 'montoRapAcumulado'
            ? typeof value === 'string'
              ? Number(value) || 0
              : 0
            : value
      }
    }))
  }

  const handleCondicionesChange = (
    field: keyof NonNullable<CesantiasRequestInput['parametrosCalculo']['condiciones']>,
    value: boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      parametrosCalculo: {
        ...prev.parametrosCalculo,
        condiciones: {
          ...(prev.parametrosCalculo.condiciones || {}),
          [field]: value
        }
      }
    }))
  }

  const buildPayload = (): CesantiasRequestInput => {
    const next: CesantiasRequestInput = JSON.parse(JSON.stringify(form))

    const parsedLast6 = salariosUltimos6MesesRaw
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n >= 0)
      .slice(0, 6)

    const avgLast6 = parsedLast6.length > 0 ? parsedLast6.reduce((a, b) => a + b, 0) / parsedLast6.length : 0

    if (incomeInputMode === 'PROMEDIO') {
      // Usar salarioPromedioMensual como base también (UX: un solo campo)
      const avg = Number(next.datosManuales.salarioPromedioMensual || 0)
      if (avg > 0) {
        next.datosManuales.salarioBaseMensual = avg
      }
      if (!next.datosManuales.salarioPromedioMensual) delete (next.datosManuales as any).salarioPromedioMensual
      delete (next.datosManuales as any).salariosUltimos6Meses
      return next
    }

    if (incomeInputMode === 'ULTIMOS_6') {
      const parsed = salariosUltimos6MesesRaw
        .split(/[,\n]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n >= 0)

      if (parsed.length > 0) {
        ;(next.datosManuales as any).salariosUltimos6Meses = parsed.slice(0, 6)
        // Usar promedio como base también (UX: no pedir campo extra)
        const avg = avgLast6
        if (avg > 0) next.datosManuales.salarioBaseMensual = avg
      } else {
        delete (next.datosManuales as any).salariosUltimos6Meses
      }

      delete (next.datosManuales as any).salarioPromedioMensual
      return next
    }

    // BASE: no enviar campos de promedio, el motor hará fallback
    delete (next.datosManuales as any).salarioPromedioMensual
    delete (next.datosManuales as any).salariosUltimos6Meses
    return next
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})
    setResult(null)

    try {
      const payload = buildPayload()
      const response = await fetch('/api/payroll/cesantias/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message: string =
          data?.error ||
          data?.message ||
          'No se pudo calcular la liquidación de cesantías'
        setError(message)

        const validation = data?.validation as ZodValidationError | undefined
        if (validation) {
          const newFieldErrors: Record<string, string> = {}
          const setIfExists = (path: string, node?: ZodValidationError) => {
            if (node?._errors && node._errors.length > 0) {
              newFieldErrors[path] = node._errors[0]
            }
          }
          setIfExists('salarioBaseMensual', (validation as any).datosManuales?.salarioBaseMensual)
          setIfExists('fechaIngreso', (validation as any).datosManuales?.fechaIngreso)
          setIfExists('fechaEgreso', (validation as any).datosManuales?.fechaEgreso)
          setIfExists('motivoSalida', (validation as any).parametrosCalculo?.motivoSalida)
          setIfExists('montoRapAcumulado', (validation as any).parametrosCalculo?.montoRapAcumulado)

          if ((validation as any).datosManuales?._errors?.length) {
            newFieldErrors['fechaEgreso'] =
              (validation as any).datosManuales._errors[0]
          }

          setFieldErrors(newFieldErrors)
        }
        return
      }

      const data: LiquidacionResponse = await response.json()
      setResult(data)
    } catch (err) {
      console.error('Error al calcular cesantías:', err)
      setError('Error de red al calcular cesantías')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setIncomeInputMode('BASE')
    setSalariosUltimos6MesesRaw('')
    setForm({
      empleadoId: undefined,
      datosManuales: {
        salarioBaseMensual: 0,
        fechaIngreso: '',
        fechaEgreso: ''
      },
      parametrosCalculo: {
        motivoSalida: motivoSalidaEnum.enum.RENUNCIA,
        montoRapAcumulado: 0,
        preavisoGozado: false,
        condiciones: {}
      }
    })
    setError(null)
    setFieldErrors({})
    setResult(null)
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(
      Number.isFinite(value) ? value : 0
    )

  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={PAYROLL_NAV_ROLES}>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Calculadora de Cesantías - Honduras
              </h1>
              <p className="text-gray-300">
                Calcula liquidaciones por renuncia o despido utilizando el año comercial de 360 días.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="liquid" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Datos de cálculo</CardTitle>
                <CardDescription className="text-gray-300">
                  Ingresa los datos mínimos requeridos para el cálculo oficial. Las fórmulas
                  siguen el Código del Trabajo de Honduras (año comercial de 360 días y salario
                  promedio Art. 123 con fallback 14/12).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-gray-200 text-sm font-medium">¿Cómo quieres ingresar tus ingresos?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setIncomeInputMode('BASE')}
                        className={`py-3 px-4 rounded-xl border transition-all text-left ${
                          incomeInputMode === 'BASE'
                            ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                            : 'border-white/20 bg-white/5 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-semibold text-sm">Salario base mensual</div>
                        <div className="text-xs text-gray-300/80 mt-1">Ingresar un solo monto.</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncomeInputMode('PROMEDIO')}
                        className={`py-3 px-4 rounded-xl border transition-all text-left ${
                          incomeInputMode === 'PROMEDIO'
                            ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                            : 'border-white/20 bg-white/5 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-semibold text-sm">Salario promedio mensual</div>
                        <div className="text-xs text-gray-300/80 mt-1">Si ya lo tienes calculado.</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncomeInputMode('ULTIMOS_6')}
                        className={`py-3 px-4 rounded-xl border transition-all text-left ${
                          incomeInputMode === 'ULTIMOS_6'
                            ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                            : 'border-white/20 bg-white/5 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-semibold text-sm">Últimos 6 meses</div>
                        <div className="text-xs text-gray-300/80 mt-1">El sistema hará el promedio.</div>
                      </button>
                    </div>
                  </div>

                  {incomeInputMode === 'BASE' && (
                    <div className="space-y-2">
                      <label htmlFor="salarioBaseMensual" className="text-gray-200 text-sm font-medium">
                        Salario base mensual (L)
                      </label>
                      <Input
                        id="salarioBaseMensual"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.datosManuales.salarioBaseMensual || ''}
                        onChange={(e) => handleChange('salarioBaseMensual', e.target.value)}
                        required
                      />
                      {fieldErrors.salarioBaseMensual && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.salarioBaseMensual}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="fechaIngreso" className="text-gray-200 text-sm font-medium">
                        Fecha de ingreso
                      </label>
                      <Input
                        id="fechaIngreso"
                        type="date"
                        value={form.datosManuales.fechaIngreso}
                        onChange={(e) => handleChange('fechaIngreso', e.target.value)}
                        required
                      />
                      {fieldErrors.fechaIngreso && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.fechaIngreso}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="fechaEgreso" className="text-gray-200 text-sm font-medium">
                        Fecha de egreso
                      </label>
                      <Input
                        id="fechaEgreso"
                        type="date"
                        value={form.datosManuales.fechaEgreso}
                        onChange={(e) => handleChange('fechaEgreso', e.target.value)}
                        required
                      />
                      {fieldErrors.fechaEgreso && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.fechaEgreso}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-gray-200 text-sm font-medium">Motivo de salida</label>
                    <Select
                      value={form.parametrosCalculo.motivoSalida}
                      onValueChange={(value) =>
                        handleParametrosChange('motivoSalida', value as CesantiasRequestInput['parametrosCalculo']['motivoSalida'])
                      }
                    >
                      <SelectTrigger className="bg-slate-900 border-white/20 text-gray-100">
                        <SelectValue placeholder="Selecciona motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTIVO_SALIDA_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.motivoSalida && (
                      <p className="text-xs text-red-400 mt-1">{fieldErrors.motivoSalida}</p>
                    )}
                  </div>

                  {incomeInputMode === 'PROMEDIO' && (
                    <div className="space-y-2">
                      <label htmlFor="salarioPromedioMensual" className="text-gray-200 text-sm font-medium">
                        Salario promedio mensual (L)
                      </label>
                      <Input
                        id="salarioPromedioMensual"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.datosManuales.salarioPromedioMensual ?? ''}
                        onChange={(e) => handleChange('salarioPromedioMensual', e.target.value)}
                        required
                      />
                      <p className="text-xs text-gray-400">
                        Usaremos este valor también como salario base para el cálculo.
                      </p>
                    </div>
                  )}

                  {incomeInputMode === 'ULTIMOS_6' && (
                    <div className="space-y-2">
                      <label htmlFor="salariosUltimos6Meses" className="text-gray-200 text-sm font-medium">
                        Ingresos de los últimos 6 meses (1 a 6)
                      </label>
                      <textarea
                        id="salariosUltimos6Meses"
                        value={salariosUltimos6MesesRaw}
                        onChange={(e) => setSalariosUltimos6MesesRaw(e.target.value)}
                        placeholder="Ej: 30000, 32000, 31000, 30000, 30500, 31500"
                        className="w-full min-h-[90px] rounded-md bg-white/5 border border-white/20 px-3 py-2 text-gray-100 placeholder:text-gray-500"
                      />
                      <p className="text-xs text-gray-400">
                        Acepta comas o saltos de línea. Calcularemos el promedio y lo usaremos también como salario base.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="montoRapAcumulado" className="text-gray-200 text-sm font-medium">
                      Monto acumulado RAP / Reserva Laboral (opcional)
                    </label>
                    <Input
                      id="montoRapAcumulado"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.parametrosCalculo.montoRapAcumulado ?? ''}
                      onChange={(e) => handleParametrosChange('montoRapAcumulado', e.target.value)}
                    />
                    <p className="text-xs text-gray-400">
                      Se usará para compensar la cesantía en caso de despido injustificado.
                    </p>
                    {fieldErrors.montoRapAcumulado && (
                      <p className="text-xs text-red-400 mt-1">{fieldErrors.montoRapAcumulado}</p>
                    )}
                  </div>

                  {(form.parametrosCalculo.motivoSalida === 'DESPIDO_INJUSTIFICADO' ||
                    form.parametrosCalculo.motivoSalida === 'CAUSA_AJENA_TRABAJADOR') && (
                    <div className="flex items-center space-x-2">
                      <input
                        id="preavisoGozado"
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-slate-900"
                        checked={form.parametrosCalculo.preavisoGozado ?? false}
                        onChange={(e) => handleParametrosChange('preavisoGozado', e.target.checked)}
                      />
                      <label htmlFor="preavisoGozado" className="text-gray-200 text-sm font-medium">
                        El trabajador ya laboró el preaviso
                      </label>
                    </div>
                  )}

                  {form.parametrosCalculo.motivoSalida === 'RENUNCIA' && (
                    <div className="flex items-center space-x-2">
                      <input
                        id="retiroVoluntario"
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-slate-900"
                        checked={form.parametrosCalculo.condiciones?.retiroVoluntario ?? false}
                        onChange={(e) => handleCondicionesChange('retiroVoluntario', e.target.checked)}
                      />
                      <label htmlFor="retiroVoluntario" className="text-gray-200 text-sm font-medium">
                        Retiro voluntario (15+ años)
                      </label>
                    </div>
                  )}

                  {form.parametrosCalculo.motivoSalida === 'FALLECIMIENTO' && (
                    <div className="flex items-center space-x-2">
                      <input
                        id="fallecimientoNatural"
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-slate-900"
                        checked={form.parametrosCalculo.condiciones?.fallecimientoNatural ?? false}
                        onChange={(e) => handleCondicionesChange('fallecimientoNatural', e.target.checked)}
                      />
                      <label htmlFor="fallecimientoNatural" className="text-gray-200 text-sm font-medium">
                        Fallecimiento natural
                      </label>
                    </div>
                  )}

                  {error && (
                    <div className="text-sm text-red-400 bg-red-900/40 border border-red-500/40 rounded-md px-3 py-2">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto bg-brand-900 hover:bg-brand-800 text-white font-medium"
                    >
                      {loading ? 'Calculando...' : 'Calcular cesantías'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      className="w-full md:w-auto border-white/30 text-gray-100 hover:bg-white/10"
                    >
                      Limpiar formulario
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card variant="liquid" className="border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Resultado</CardTitle>
                <CardDescription className="text-gray-300">
                  Detalle de bases salariales, tiempos y rubros de liquidación.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!result && (
                  <p className="text-gray-400 text-sm">
                    Completa el formulario y presiona &quot;Calcular cesantías&quot; para ver el detalle de la
                    liquidación.
                  </p>
                )}

                {result && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-200 mb-2">
                        Bases salariales
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-200">
                        <div>
                          <span className="text-gray-400">Salario base mensual: </span>
                          <span>{formatCurrency(result.bases.salarioBaseMensual)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Salario base diario: </span>
                          <span>{formatCurrency(result.bases.salarioBaseDiario)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Salario promedio mensual: </span>
                          <span>{formatCurrency(result.bases.salarioPromedioMensual)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Salario promedio diario: </span>
                          <span>{formatCurrency(result.bases.salarioPromedioDiario)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Modo de promedio: </span>
                          <span>{result.metadata.salaryAverageMode}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-200 mb-2">Tiempos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-200">
                        <div>
                          <span className="text-gray-400">Antigüedad: </span>
                          <span>
                            {result.tiempos.anos} años, {result.tiempos.meses} meses, {result.tiempos.dias} días
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Total días laborados (360): </span>
                          <span>{result.tiempos.totalDias}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Días año natural (13er): </span>
                          <span>{result.tiempos.diasAnoNatural}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Días desde julio (14to): </span>
                          <span>{result.tiempos.diasDesdeJulio}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-200 mb-2">
                        Rubros de liquidación
                      </h3>
                      <div className="space-y-1 text-sm text-gray-200">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Preaviso:</span>
                          <span>{formatCurrency(result.rubros.preaviso)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cesantía bruta:</span>
                          <span>{formatCurrency(result.rubros.cesantiaBruta)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">RAP aplicado:</span>
                          <span>{formatCurrency(result.rubros.rapAplicado)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cesantía neta:</span>
                          <span>{formatCurrency(result.rubros.cesantiaNeta)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Vacaciones proporcionales:</span>
                          <span>{formatCurrency(result.rubros.vacaciones)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">13er mes proporcional:</span>
                          <span>{formatCurrency(result.rubros.aguinaldo)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">14to mes proporcional:</span>
                          <span>{formatCurrency(result.rubros.decimoCuarto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Reserva laboral:</span>
                          <span>{formatCurrency(result.rubros.reservaLaboralEnTotal)}</span>
                        </div>
                        <div className="border-t border-white/10 mt-2 pt-2 flex justify-between font-semibold text-white">
                          <span>Total a pagar:</span>
                          <span>{formatCurrency(result.rubros.totalPagar)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                          {result.metadata.reservaLaboralDisclaimer}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}

