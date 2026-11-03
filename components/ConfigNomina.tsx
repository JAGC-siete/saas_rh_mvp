// Payroll Configuration Component with readable glass effect
// Fixes white text visibility issues in dark theme

import React, { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { intlLocale } from '../lib/i18n/app/locale'
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

function frequencyKey(freq: PayrollUiFrequency): 'monthly' | 'weekly' | 'biweekly' {
  if (freq === 'monthly') return 'monthly'
  if (freq === 'weekly') return 'weekly'
  return 'biweekly'
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
  const tn = useTranslations('payroll.config')
  const locale = intlLocale(useLocale())
  const bold = { b: (chunks: React.ReactNode) => <span className="font-semibold">{chunks}</span> }
  const monthName = new Date(year, month - 1).toLocaleDateString(locale, { month: 'long' })
  const isMonthly = paymentFrequency === 'monthly'
  const isWeekly = paymentFrequency === 'weekly'

  const biweeklyLabels = useMemo(() => {
    const fs = paymentCutDates?.biweekly_first_start ?? 1
    const fe = paymentCutDates?.biweekly_first_end ?? 15
    const ss = paymentCutDates?.biweekly_second_start ?? 16
    const se = paymentCutDates?.biweekly_second_end ?? 30
    return {
      q1: tn('q1', { start: fs, end: fe }),
      q2: tn('q2', { start: ss, end: se }),
    }
  }, [paymentCutDates, tn])

  const monthlyRangeLabel = useMemo(() => {
    if (paymentCutDates?.monthly_type === 'custom') {
      const ms = paymentCutDates.monthly_start ?? 1
      const me = paymentCutDates.monthly_end ?? 30
      return tn('cut', { start: ms, end: me })
    }
    return tn('fullMonth')
  }, [paymentCutDates, tn])

  const periodSummary = useMemo(() => {
    if (isMonthly) return tn('summaryMonthly', { month: monthName, year, range: monthlyRangeLabel })
    if (isWeekly) return tn('summaryWeekly', { month: monthName, year, n: quincena })
    return tn('summaryBiweekly', { month: monthName, year, half: quincena === 2 ? biweeklyLabels.q2 : biweeklyLabels.q1 })
  }, [isMonthly, isWeekly, monthName, year, monthlyRangeLabel, quincena, biweeklyLabels, tn])

  // Fecha de cierre del período seleccionado (null en semanal: la semana no se mapea a fechas aquí)
  const periodBounds = useMemo(() => {
    if (isWeekly) return null
    const lastDay = new Date(year, month, 0).getDate()
    let start: number
    let end: number
    if (isMonthly) {
      const custom = paymentCutDates?.monthly_type === 'custom'
      start = custom ? paymentCutDates?.monthly_start ?? 1 : 1
      end = custom ? paymentCutDates?.monthly_end ?? lastDay : lastDay
    } else if (quincena === 2) {
      start = paymentCutDates?.biweekly_second_start ?? 16
      end = paymentCutDates?.biweekly_second_end ?? lastDay
    } else {
      start = paymentCutDates?.biweekly_first_start ?? 1
      end = paymentCutDates?.biweekly_first_end ?? 15
    }
    // Corte que cruza de mes (p. ej. 26–10): el cierre cae en el mes siguiente
    const endMonthIndex = end < start ? month : month - 1
    const endLastDay = new Date(year, endMonthIndex + 1, 0).getDate()
    return {
      start: new Date(year, month - 1, Math.min(start, lastDay)),
      end: new Date(year, endMonthIndex, Math.min(end, endLastDay), 23, 59, 59),
    }
  }, [isWeekly, isMonthly, year, month, quincena, paymentCutDates])

  const now = Date.now()
  const periodNotStarted = periodBounds !== null && periodBounds.start.getTime() > now
  const periodInProgress = periodBounds !== null && !periodNotStarted && periodBounds.end.getTime() > now
  const formatDay = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })

  const description = isMonthly
    ? tn('descMonthly')
    : isWeekly
      ? tn('descWeekly')
      : tn('descBiweekly')

  return (
    <Card variant="liquid" className="backdrop-blur-md bg-white/10 border border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-xl font-semibold">{tn('title')}</CardTitle>
        <CardDescription className="text-gray-200 text-base">
          {description}
          <span className="block mt-1 text-sm text-gray-300">
            {tn.rich('mode', {
              freq: tn(`freq.${frequencyKey(paymentFrequency)}`),
              b: (chunks) => <span className="font-semibold text-white">{chunks}</span>,
            })}
            <span className="text-gray-400">{tn('settings')}</span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`grid grid-cols-1 gap-4 ${isMonthly ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {/* Año */}
          <div>
            <label htmlFor="year" className="block text-sm font-semibold text-white/90 mb-2">
              {tn('year')}
            </label>
            <Select
              value={year.toString()}
              onValueChange={(value) => onYearChange(parseInt(value))}
            >
              <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10
                                        text-white data-[placeholder]:text-white/70
                                        focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                        hover:bg-white/15 transition-colors">
                <SelectValue placeholder={tn('selectYear')} />
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
              {tn('month')}
            </label>
            <Select
              value={month.toString()}
              onValueChange={(value) => onMonthChange(parseInt(value))}
            >
              <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10
                                        text-white data-[placeholder]:text-white/70
                                        focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                        hover:bg-white/15 transition-colors">
                <SelectValue placeholder={tn('selectMonth')} />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(monthOption => (
                  <SelectItem 
                    key={monthOption} 
                    value={monthOption.toString()}
                    className="text-white hover:bg-white/20 focus:bg-white/20"
                  >
                    {new Date(year, monthOption - 1).toLocaleDateString(locale, { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quincena / Semana — oculto en mensual */}
          {!isMonthly && (
            <div>
              <label htmlFor="period-slot" className="block text-sm font-semibold text-white/90 mb-2">
                {isWeekly ? tn('week') : tn('fortnight')}
              </label>
              <Select
                value={quincena.toString()}
                onValueChange={(value) => onQuincenaChange(parseInt(value))}
              >
                <SelectTrigger className="w-full rounded-xl border border-white/20 bg-white/10
                                          text-white data-[placeholder]:text-white/70
                                          focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                          hover:bg-white/15 transition-colors">
                  <SelectValue placeholder={isWeekly ? tn('selectWeek') : tn('selectFortnight')} />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-md bg-white/10 text-white border border-white/20">
                  {isWeekly ? (
                    <>
                      <SelectItem value="1" className="text-white hover:bg-white/20 focus:bg-white/20">1 (1–7)</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-white/20 focus:bg-white/20">2 (8–14)</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-white/20 focus:bg-white/20">3 (15–21)</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-white/20 focus:bg-white/20">{tn('week4')}</SelectItem>
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
            {loading ? tn('generating') : tn('generate')}
          </Button>

          <Button
            variant="outline"
            onClick={onReset}
            disabled={loading}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            {tn('reset')}
          </Button>
        </div>

        {/* Current Selection Display */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="text-sm text-gray-200">
            <span className="font-semibold">{tn('selected')}</span> {periodSummary}
            {deductionModeLabel && (
              <>
                {' '}
                · <span className="font-semibold">{tn('deductionMode')}</span> {deductionModeLabel}
                <span className="text-gray-400">{tn('settings')}</span>
              </>
            )}
          </div>
        </div>

        {(periodInProgress || periodNotStarted) && periodBounds && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2 p-3 rounded-lg border border-amber-400/30 bg-amber-500/10 text-sm text-amber-100"
          >
            <Icon name="clock" className="h-4 w-4 mt-0.5 shrink-0 text-amber-300" />
            {periodNotStarted ? (
              <span>
                {tn.rich('future', { date: formatDay(periodBounds.start), ...bold })}
              </span>
            ) : (
              <span>
                {tn.rich('inProgress', { date: formatDay(periodBounds.end), ...bold })}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
