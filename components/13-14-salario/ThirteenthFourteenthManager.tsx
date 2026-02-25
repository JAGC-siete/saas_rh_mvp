import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useCompanyContext } from '../../lib/useCompanyContext'
import { use1314SalarioManager, type Tipo1314 } from '../../lib/hooks/use1314SalarioManager'
import { Loader2 } from 'lucide-react'

export default function ThirteenthFourteenthManager() {
  const { companyId, company, loading: companyLoading, error: companyError } = useCompanyContext()
  const {
    year,
    tipo,
    data,
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
        <Card variant="glass">
          <CardContent className="pt-6">
            <p className="text-red-400">
              {companyError || 'No se pudo cargar el contexto de la empresa.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-white">13 & 14 Salario</h1>
        <p className="text-gray-300">
          Cálculo de Aguinaldo (13avo) y Decimocuarto Mes (14avo) según ley hondureña
        </p>
      </div>

      {/* Selector de parámetros */}
      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-xl font-semibold">Configuración</CardTitle>
          <CardDescription className="text-gray-200 text-base">
            Selecciona el año y el tipo de cálculo (13avo o 14avo)
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
                    13avo (Aguinaldo - Diciembre)
                  </SelectItem>
                  <SelectItem
                    value="14AVO"
                    className="text-white hover:bg-white/20 focus:bg-white/20"
                  >
                    14avo (Junio)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón Preview */}
            <div className="flex items-end">
              <Button
                onClick={fetchPreview}
                disabled={loading}
                className="w-full md:w-auto bg-brand-900 hover:bg-brand-800 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  'Generar Preview'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card variant="glass" className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-6">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Área de datos (placeholder por ahora) */}
      <Card variant="glass">
        <CardContent className="pt-6">
          {data.length === 0 ? (
            <p className="text-gray-400">
              Haz clic en &quot;Generar Preview&quot; para cargar los datos.
            </p>
          ) : (
            <p className="text-gray-300">
              {data.length} empleado(s) con datos calculados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
