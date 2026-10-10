import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useCompanyContext } from '../../lib/useCompanyContext'
import { useCompanyMoney } from '../../lib/hooks/useCompanyMoney'
import { use1314SalarioManager, type Tipo1314, type Salario1314Row } from '../../lib/hooks/use1314SalarioManager'
import { formatDateOnlyForHonduras } from '../../lib/timezone'
import { Loader2, Gift, Users, DollarSign, AlertTriangle } from 'lucide-react'

const WARNING_TEXT: Record<NonNullable<Salario1314Row['warning']>, string> = {
  missing_hire_date: 'Falta la fecha de ingreso. Agrégala en su ficha para calcular el monto.',
  missing_salary: 'Falta el salario base. Agrégalo en su ficha para calcular el monto.',
}

export default function ThirteenthFourteenthManager() {
  const { companyId, company, loading: companyLoading, error: companyError } = useCompanyContext()
  const { format: formatCurrency } = useCompanyMoney()
  const {
    year,
    tipo,
    data,
    total,
    periodo,
    loading,
    error,
    setYear,
    setTipo,
    fetchPreview
  } = use1314SalarioManager()

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <Card variant="liquid">
          <CardContent className="pt-6">
            <p className="text-red-400">
              {companyError || 'No se pudo cargar el contexto de la empresa.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const warningsCount = data.filter((r) => r.warning).length

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-500/20 p-2.5">
          <Gift className="h-7 w-7 text-indigo-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">13.º y 14.º salario</h1>
          <p className="text-gray-300 mt-1">
            Cálculo de Aguinaldo (13avo) y Decimocuarto Mes (14avo) según ley hondureña
          </p>
        </div>
      </div>

      {/* Selector de parámetros */}
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-xl font-semibold">Configuración</CardTitle>
          <CardDescription className="text-gray-200 text-base">
            Elige el año y el tipo. El 14.º de un año es el que se paga en junio de ese año.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Año */}
            <div>
              <label htmlFor="year-1314" className="block text-sm font-semibold text-white/90 mb-2">
                Año
              </label>
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
              >
                <SelectTrigger
                  id="year-1314"
                  className="w-full rounded-xl border border-white/20 bg-white/10 text-white data-[placeholder]:text-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 hover:bg-white/15 transition-colors"
                >
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
                    (yearOption) => (
                      <SelectItem
                        key={yearOption}
                        value={yearOption.toString()}
                        className="text-white hover:bg-white/20 focus:bg-white/20"
                      >
                        {yearOption}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo (13AVO / 14AVO) */}
            <div>
              <label htmlFor="tipo-1314" className="block text-sm font-semibold text-white/90 mb-2">
                Tipo
              </label>
              <Select
                value={tipo}
                onValueChange={(value) => setTipo(value as Tipo1314)}
              >
                <SelectTrigger
                  id="tipo-1314"
                  className="w-full rounded-xl border border-white/20 bg-white/10 text-white data-[placeholder]:text-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 hover:bg-white/15 transition-colors"
                >
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                  <SelectItem
                    value="13AVO"
                    className="text-white hover:bg-white/20 focus:bg-white/20"
                  >
                    13.º (aguinaldo) — se paga en diciembre
                  </SelectItem>
                  <SelectItem
                    value="14AVO"
                    className="text-white hover:bg-white/20 focus:bg-white/20"
                  >
                    14.º — se paga en junio
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón Preview */}
            <div className="flex items-end">
              <Button
                onClick={fetchPreview}
                disabled={loading}
                className="w-full md:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  'Generar vista previa'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card variant="liquid" className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-6">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Resumen y tabla de resultados */}
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-xl font-semibold">
            Resultados {tipo === '13AVO' ? '13.º (aguinaldo)' : '14.º'} {year}
          </CardTitle>
          <CardDescription className="text-gray-200 text-base">
            {periodo
              ? `Período del ${formatDateOnlyForHonduras(periodo.inicio)} al ${formatDateOnlyForHonduras(periodo.fin)}. Montos brutos: por ley no llevan deducción de IHSS ni RAP.`
              : 'Empleados activos y montos calculados con su salario base.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-white/5 py-16 text-center">
              <Gift className="mx-auto h-12 w-12 text-gray-500/60 mb-4" />
              <p className="text-gray-400 font-medium">
                Sin datos para mostrar
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Selecciona año y tipo, luego haz clic en &quot;Generar vista previa&quot; para cargar los cálculos.
              </p>
            </div>
          ) : (
            <>
              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-500/20 p-2">
                    <Users className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Empleados</p>
                    <p className="text-xl font-semibold text-white">{data.length}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/20 p-2">
                    <DollarSign className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total a pagar</p>
                    <p className="text-xl font-semibold text-white">{formatCurrency(total)}</p>
                  </div>
                </div>
              </div>

              {warningsCount > 0 && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    {warningsCount === 1
                      ? '1 empleado no tiene los datos completos y no suma al total.'
                      : `${warningsCount} empleados no tienen los datos completos y no suman al total.`}{' '}
                    Revisa los avisos en la tabla.
                  </p>
                </div>
              )}

              {/* Tabla de empleados */}
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20 text-left text-gray-300 bg-white/5">
                      <th className="pb-3 pt-2 px-4 font-semibold text-white/90">Empleado</th>
                      <th className="hidden sm:table-cell pb-3 pt-2 px-4 text-right font-semibold text-white/90">Salario base</th>
                      <th className="pb-3 pt-2 px-4 text-center font-semibold text-white/90">Días</th>
                      <th className="pb-3 pt-2 px-4 text-right font-semibold text-white/90">
                        Monto {tipo === '13AVO' ? '13.º' : '14.º'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr
                        key={row.employee_id}
                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-white">
                          <p>{row.name || '-'}</p>
                          {row.hire_date && (
                            <p className="text-xs text-gray-400">
                              Ingreso: {formatDateOnlyForHonduras(row.hire_date)}
                            </p>
                          )}
                          {row.warning && (
                            <p className="mt-1 text-xs text-amber-300">{WARNING_TEXT[row.warning]}</p>
                          )}
                        </td>
                        <td className="hidden sm:table-cell py-3 px-4 text-right text-gray-300">
                          {formatCurrency(row.base_salary)}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-300">
                          {row.days_worked || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-white whitespace-nowrap">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
