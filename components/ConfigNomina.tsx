// Payroll Configuration Component with readable glass effect
// Fixes white text visibility issues in dark theme

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Icon } from './Icon'

interface ConfigNominaProps {
  year: number
  month: number
  quincena: number
  tipo: string
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  onQuincenaChange: (quincena: number) => void
  onTipoChange: (tipo: string) => void
  onPreview: () => void
  onReset: () => void
  loading?: boolean
  canPreview?: boolean
}

export default function ConfigNomina({
  year,
  month,
  quincena,
  tipo,
  onYearChange,
  onMonthChange,
  onQuincenaChange,
  onTipoChange,
  onPreview,
  onReset,
  loading = false,
  canPreview = false
}: ConfigNominaProps) {
  const monthName = new Date(year, month - 1).toLocaleDateString('es-HN', { month: 'long' })

  return (
    <Card className="backdrop-blur-md bg-white/10 border border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-xl font-semibold">Configuración de Nómina</CardTitle>
        <CardDescription className="text-gray-200 text-base">
          Define los parámetros para generar la nómina (año, mes, quincena y tipo de deducciones)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Año */}
          <div>
            <label htmlFor="year" className="block text-sm font-semibold text-white/90 mb-2">
              Año
            </label>
            <Select
              value={year.toString()}
              onValueChange={(value) => onYearChange(parseInt(value))}
            >
              <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10
                                        text-white data-[placeholder]:text-white/70
                                        focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                        hover:bg-white/15 transition-colors">
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(yearOption => (
                  <SelectItem 
                    key={yearOption} 
                    value={yearOption.toString()}
                    className="text-white hover:bg-white/20 focus:bg-white/20"
                  >
                    {yearOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mes */}
          <div>
            <label htmlFor="month" className="block text-sm font-semibold text-white/90 mb-2">
              Mes
            </label>
            <Select
              value={month.toString()}
              onValueChange={(value) => onMonthChange(parseInt(value))}
            >
              <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10
                                        text-white data-[placeholder]:text-white/70
                                        focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                        hover:bg-white/15 transition-colors">
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(monthOption => (
                  <SelectItem 
                    key={monthOption} 
                    value={monthOption.toString()}
                    className="text-white hover:bg-white/20 focus:bg-white/20"
                  >
                    {new Date(year, monthOption - 1).toLocaleDateString('es-HN', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quincena */}
          <div>
            <label htmlFor="quincena" className="block text-sm font-semibold text-white/90 mb-2">
              Quincena
            </label>
            <Select
              value={quincena.toString()}
              onValueChange={(value) => onQuincenaChange(parseInt(value))}
            >
              <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10
                                        text-white data-[placeholder]:text-white/70
                                        focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                        hover:bg-white/15 transition-colors">
                <SelectValue placeholder="Seleccionar quincena" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                <SelectItem 
                  value="1" 
                  className="text-white hover:bg-white/20 focus:bg-white/20"
                >
                  1 (1-15)
                </SelectItem>
                <SelectItem 
                  value="2" 
                  className="text-white hover:bg-white/20 focus:bg-white/20"
                >
                  2 (16-31)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div>
            <label htmlFor="tipo" className="block text-sm font-semibold text-white/90 mb-2">
              Tipo
            </label>
            <Select
              value={tipo}
              onValueChange={onTipoChange}
            >
              <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10
                                        text-white data-[placeholder]:text-white/70
                                        focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                        hover:bg-white/15 transition-colors">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                <SelectItem 
                  value="CON" 
                  className="text-white hover:bg-white/20 focus:bg-white/20"
                >
                  Con deducciones
                </SelectItem>
                <SelectItem 
                  value="SIN" 
                  className="text-white hover:bg-white/20 focus:bg-white/20"
                >
                  Sin deducciones
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-6">
          <Button
            onClick={onPreview}
            disabled={!canPreview || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Icon name="eye" className="h-4 w-4" />
            {loading ? 'Generando...' : 'Generar Preview'}
          </Button>

          <Button
            variant="outline"
            onClick={onReset}
            disabled={loading}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            Resetear Filtros
          </Button>
        </div>

        {/* Current Selection Display */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="text-sm text-gray-200">
            <span className="font-semibold">Período seleccionado:</span> {monthName} {year} - Quincena {quincena} - {tipo === 'CON' ? 'Con deducciones' : 'Sin deducciones'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
