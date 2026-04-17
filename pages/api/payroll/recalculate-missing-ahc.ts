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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role, companyCountryCode, companyTimezone } = await requireCompanyAccess(req, res)

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const countryCode = normalizeCountryCode(companyCountryCode)
    if (!isPayrollCountryEngineEnabled(countryCode)) {
      return res.status(403).json({ error: 'Nómina no habilitada para este país', code: 'PAYROLL_COUNTRY_DISABLED' })
    }

    const body = req.body || {}
    const year = typeof body.year === 'number' ? body.year : parseInt(String(body.year || ''), 10)
    const month = typeof body.month === 'number' ? body.month : parseInt(String(body.month || ''), 10)
    const quincena = typeof body.quincena === 'number' ? body.quincena : parseInt(String(body.quincena || ''), 10)
    const tipo = typeof body.tipo === 'string' ? body.tipo : 'CON'

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(quincena)) {
      return res.status(400).json({ error: 'year, month y quincena son requeridos' })
    }

    const tz = companyTimezone || 'America/Tegucigalpa'
    if (isPayrollCalendarPeriodInFuture(year, month, tz)) {
      return res.status(400).json({ error: 'Período inválido', message: 'No se puede generar nómina para períodos futuros' })
    }

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

    const { data: emps, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')

    if (empErr) return res.status(500).json({ error: empErr.message })
    const employeeIds = (emps || []).map((e: any) => e.id)
    if (employeeIds.length === 0) {
      return res.status(200).json({ success: true, calculated: 0, missing: 0, message: 'Sin empleados activos' })
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
    const recordRows = (completeRecords || []) as { id: string | null | undefined }[]
    const completeRecordIds = recordRows
      .map((r) => r.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (completeRecordIds.length === 0) {
      return res.status(200).json({ success: true, calculated: 0, missing: 0, message: 'Sin registros completos (check_in/check_out)' })
    }

    const { data: existingAhc, error: ahcErr } = await supabase
      .from('attendance_hours_calculation')
      .select('attendance_record_id')
      .in('attendance_record_id', completeRecordIds)

    if (ahcErr) return res.status(500).json({ error: ahcErr.message })
    const ahcRows = (existingAhc || []) as { attendance_record_id: string | null | undefined }[]
    const existing = new Set(
      ahcRows
        .map((r) => r.attendance_record_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
    const missingIds = completeRecordIds.filter((id) => !existing.has(id))

    if (missingIds.length === 0) {
      return res.status(200).json({ success: true, calculated: 0, missing: 0, message: 'AHC ya está completo' })
    }

    const { data: results, error: rpcErr } = await supabase.rpc('calculate_attendance_hours_batch', {
      p_record_ids: missingIds,
      p_law_year: year,
    })

    if (rpcErr) return res.status(500).json({ error: rpcErr.message })

    return res.status(200).json({
      success: true,
      missing: missingIds.length,
      calculated: (results || []).length,
      period: { from: fechaInicio, to: fechaFin, year, month, quincena, tipo },
    })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    console.error('payroll recalculate-missing-ahc:', e)
    return res.status(500).json({
      error: 'Error al recalcular horas pendientes',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}

