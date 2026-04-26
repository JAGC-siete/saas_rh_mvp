import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { normalizeCountryCode } from '../../../lib/country/supported'
import { isPayrollCountryEngineEnabled } from '../../../lib/features/payroll-country-flags'
import { isPayrollCalendarPeriodInFuture } from '../../../lib/timezone'
import {
  resolvePayrollPeriodContext,
  type PreviewPaymentFrequency,
  type PaymentCutDatesInput,
} from '../../../lib/payroll/fixed-line-recalc'

function mapFreq(v: string): PreviewPaymentFrequency {
  const x = (v || '').toLowerCase()
  if (x === 'mensual' || x === 'monthly') return 'monthly'
  if (x === 'semanal' || x === 'weekly') return 'weekly'
  if (x === 'quincenal' || x === 'biweekly') return 'biweekly'
  return 'biweekly'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, companyCountryCode, companyTimezone } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const countryCode = normalizeCountryCode(companyCountryCode)
    if (!isPayrollCountryEngineEnabled(countryCode)) {
      return res.status(403).json({ error: 'Nómina no habilitada para este país', code: 'PAYROLL_COUNTRY_DISABLED' })
    }

    const year = typeof req.query.year === 'string' ? parseInt(req.query.year, 10) : NaN
    const month = typeof req.query.month === 'string' ? parseInt(req.query.month, 10) : NaN
    const quincena = typeof req.query.quincena === 'string' ? parseInt(req.query.quincena, 10) : NaN
    const tipo = typeof req.query.tipo === 'string' ? req.query.tipo : 'CON'

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(quincena)) {
      return res.status(400).json({ error: 'year, month y quincena son requeridos' })
    }

    const tz = companyTimezone || 'America/Tegucigalpa'
    if (isPayrollCalendarPeriodInFuture(year, month, tz)) {
      return res.status(400).json({ error: 'Período inválido', message: 'No se puede generar nómina para períodos futuros' })
    }

    // Same config resolution as preview.ts (payment_frequency + cut dates).
    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('metadata, payment_frequency, quincena_config')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    const payrollMetadata = payrollConfig?.metadata || {}
    const qcCol = payrollConfig?.quincena_config as
      | { first_start?: number; first_end?: number; second_start?: number; second_end?: number }
      | null
    const metaCutDates = (payrollMetadata as any)?.payment_cut_dates || {}

    const paymentFrequency = mapFreq((payrollConfig?.payment_frequency || (payrollMetadata as any)?.payment_frequency || 'quincenal') as string)
    const hasCustomQuincena = !!(qcCol && (qcCol.first_start != null || qcCol.first_end != null || qcCol.second_start != null || qcCol.second_end != null))

    const paymentCutDates: PaymentCutDatesInput = qcCol
      ? {
          biweekly_type: metaCutDates.biweekly_type === 'custom' || hasCustomQuincena ? 'custom' : 'standard',
          biweekly_first_start: qcCol.first_start ?? metaCutDates.biweekly_first_start ?? 1,
          biweekly_first_end: qcCol.first_end ?? metaCutDates.biweekly_first_end ?? 15,
          biweekly_second_start: qcCol.second_start ?? metaCutDates.biweekly_second_start ?? 16,
          biweekly_second_end: qcCol.second_end ?? metaCutDates.biweekly_second_end ?? 30,
          monthly_type: metaCutDates.monthly_type || 'standard',
          monthly_start: metaCutDates.monthly_start ?? 1,
          monthly_end: metaCutDates.monthly_end ?? 30,
        }
      : {
          biweekly_type: metaCutDates.biweekly_type || 'standard',
          biweekly_first_start: metaCutDates.biweekly_first_start ?? 1,
          biweekly_first_end: metaCutDates.biweekly_first_end ?? 15,
          biweekly_second_start: metaCutDates.biweekly_second_start ?? 16,
          biweekly_second_end: metaCutDates.biweekly_second_end ?? 30,
          monthly_type: metaCutDates.monthly_type || 'standard',
          monthly_start: metaCutDates.monthly_start ?? 1,
          monthly_end: metaCutDates.monthly_end ?? 30,
        }

    const periodCtx = resolvePayrollPeriodContext(year, month, quincena, paymentFrequency, paymentCutDates)
    const { fechaInicio, fechaFin } = periodCtx

    // Scope to company via employees.company_id
    const { data: emps, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')

    if (empErr) return res.status(500).json({ error: empErr.message })
    const employeeIds = (emps || []).map((e: any) => e.id)
    if (employeeIds.length === 0) {
      return res.status(200).json({
        success: true,
        status: 'GREEN',
        missingAHC: 0,
        completeRecords: 0,
        ahcRecords: 0,
        totalRecords: 0,
        canProceed: true,
        recommendedAction: 'Sin empleados activos',
        period: { year, month, quincena, tipo, from: fechaInicio, to: fechaFin },
      })
    }

    const { data: completeRecords, error: recErr } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact' })
      .in('employee_id', employeeIds)
      .gte('date', fechaInicio)
      .lte('date', fechaFin)
      .not('check_in', 'is', null)
      .not('check_out', 'is', null)

    if (recErr) return res.status(500).json({ error: recErr.message })
    const completeRecordIds = (completeRecords || []).map((r: any) => r.id).filter(Boolean)

    // Total records (for context)
    const { count: totalRecordsCount } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .in('employee_id', employeeIds)
      .gte('date', fechaInicio)
      .lte('date', fechaFin)

    let ahcCount = 0
    if (completeRecordIds.length > 0) {
      const { count } = await supabase
        .from('attendance_hours_calculation')
        .select('id', { count: 'exact', head: true })
        .in('attendance_record_id', completeRecordIds)
      ahcCount = count ?? 0
    }

    const completeCount = completeRecordIds.length
    const missing = Math.max(0, completeCount - ahcCount)
    const status = missing === 0 ? 'GREEN' : 'YELLOW'

    return res.status(200).json({
      success: true,
      status,
      missingAHC: missing,
      completeRecords: completeCount,
      ahcRecords: ahcCount,
      totalRecords: totalRecordsCount ?? 0,
      canProceed: true,
      recommendedAction:
        missing > 0
          ? 'Usa «Recalcular pendientes» para completar los cálculos antes de cerrar la nómina.'
          : 'Las horas de asistencia ya están listas para este período.',
      period: { year, month, quincena, tipo, from: fechaInicio, to: fechaFin },
    })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    console.error('payroll preflight:', e)
    return res.status(500).json({
      error: 'Error ejecutando preflight',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}

