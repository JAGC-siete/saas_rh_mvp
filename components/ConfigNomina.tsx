// Payroll Configuration Component with readable glass effect
// Fixes white text visibility issues in dark theme

import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Icon } from './Icon'
import type { PayrollUiCutDates, PayrollUiFrequency } from '../types/payroll'

export type { PayrollUiCutDates, PayrollUiFrequency }

interface ConfigNominaProps {
  year: number
  month: number
  quincena: number
  paymentFrequency?: PayrollUiFrequency
  paymentCutDates?: PayrollUiCutDates | null
  deductionModeLabel?: string
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  onQuincenaChange: (quincena: number) => void
  onPreview: () => void
  onReset: () => void
  loading?: boolean
  canPreview?: boolean
}

function frequencyLabel(freq: PayrollUiFrequency): string {
  if (freq === 'monthly') return 'mensual'
  if (freq === 'weekly') return 'semanal'
  return 'quincenal'
}

export default function ConfigNomina({
  year,
  month,
  quincena,
  paymentFrequency = 'biweekly',
  paymentCutDates = null,
  deductionModeLabel,
  onYearChange,
  onMonthChange,
  onQuincenaChange,
  onPreview,
  onReset,
  loading = false,
  canPreview = false,
}: ConfigNominaProps) {
  const monthName = new Date(year, month - 1).toLocaleDateString('es-HN', { month: 'long' })
  const isMonthly = paymentFrequency === 'monthly'
  const isWeekly = paymentFrequency === 'weekly'

  const biweeklyLabels = useMemo(() => {
    const fs = paymentCutDates?.biweekly_first_start ?? 1
    const fe = paymentCutDates?.biweekly_first_end ?? 15
    const ss = paymentCutDates?.biweekly_second_start ?? 16
    const se = paymentCutDates?.biweekly_second_end ?? 30
    return {
      q1: `1.ª quincena (${fs}–${fe})`,
      q2: `2.ª quincena (${ss}–${se})`,
    }
  }, [paymentCutDates])

  const monthlyRangeLabel = useMemo(() => {
    if (paymentCutDates?.monthly_type === 'custom') {
      const ms = paymentCutDates.monthly_start ?? 1
      const me = paymentCutDates.monthly_end ?? 30
      return `Corte ${ms}–${me}`
    }
    return 'Mes completo'
  }, [paymentCutDates])

  const periodSummary = useMemo(() => {
    if (isMonthly) return `${monthName} ${year} · Mensual (${monthlyRangeLabel})`
    if (isWeekly) return `${monthName} ${year} · Semana ${quincena}`
    return `${monthName} ${year} · ${quincena === 2 ? biweeklyLabels.q2 : biweeklyLabels.q1}`
  }, [isMonthly, isWeekly, monthName, year, monthlyRangeLabel, quincena, biweeklyLabels])

  const description = isMonthly
    ? 'Define el período para generar la nómina (año y mes)'
    : isWeekly
      ? 'Define el período para generar la nómina (año, mes y semana)'
      : 'Define el período para generar la nómina (año, mes y quincena)'

  return (
    <Card variant="liquid" className="backdrop-blur-md bg-white/10 border border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-xl font-semibold">Configuración de Nómina</CardTitle>
        <CardDescription className="text-gray-200 text-base">
          {description}
          <span className="block mt-1 text-sm text-gray-300">
            Modalidad: <span className="font-semibold text-white">{frequencyLabel(paymentFrequency)}</span>
            <span className="text-gray-400"> (Parámetros)</span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`grid grid-cols-1 gap-4 ${isMonthly ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
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

          {/* Quincena / Semana — oculto en mensual */}
          {!isMonthly && (
            <div>
              <label htmlFor="period-slot" className="block text-sm font-semibold text-white/90 mb-2">
                {isWeekly ? 'Semana' : 'Quincena'}
              </label>
              <Select
                value={quincena.toString()}
                onValueChange={(value) => onQuincenaChange(parseInt(value))}
              >
                <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10
                                          text-white data-[placeholder]:text-white/70
                                          focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                          hover:bg-white/15 transition-colors">
                  <SelectValue placeholder={isWeekly ? 'Seleccionar semana' : 'Seleccionar quincena'} />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                  {isWeekly ? (
                    <>
                      <SelectItem value="1" className="text-white hover:bg-white/20 focus:bg-white/20">1 (1–7)</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-white/20 focus:bg-white/20">2 (8–14)</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-white/20 focus:bg-white/20">3 (15–21)</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-white/20 focus:bg-white/20">4 (22–fin)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="1" className="text-white hover:bg-white/20 focus:bg-white/20">
                        {biweeklyLabels.q1}
                      </SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-white/20 focus:bg-white/20">
                        {biweeklyLabels.q2}
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
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
            <span className="font-semibold">Período seleccionado:</span> {periodSummary}
            {deductionModeLabel && (
              <>
                {' '}
                · <span className="font-semibold">Modo:</span> {deductionModeLabel}
                <span className="text-gray-400"> (Parámetros)</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
