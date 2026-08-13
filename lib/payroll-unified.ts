// Unified payroll data fetching and merging
// Merges planilla and detalle data in the client without backend changes

import {
  coalescePlanillaPayType,
  isHourBasedPlanillaPayType,
  type EffectivePayType,
} from './payroll/resolve-effective-pay-type'

export type PlanillaRow = {
  employee_id: string;
  name: string;
  base_salary: number;
  total_earnings: number;
  IHSS: number;
  RAP: number;
  ISR: number;
  total_deducciones: number;
  total: number;
  days_worked: number;
  days_absent: number;
  late_days: number;
  department?: string;
  line_id?: string;
  pay_type?: 'fixed' | 'hourly' | 'admin_floor';
  edited?: boolean;
  /** Horas extra (AHC o piso admin) en el período */
  horas_extras?: number;
  // Campos específicos para hourly / admin_floor
  total_hours_worked?: number;
  hourly_rate?: number;
};

export type DetalleRow = {
  employee_id: string;
  horas_trabajadas: number;
  extras: {
    horas: number;
    monto: number;
  };
  observaciones?: string;
  status?: 'sin_planilla' | 'sin_asistencia' | 'completo';
};

export type UnifiedRow = PlanillaRow & DetalleRow;

export type RunLineMergeSource = {
  eff_hours?: number | null
  eff_bruto?: number | null
  eff_neto?: number | null
  eff_ihss?: number | null
  eff_rap?: number | null
  eff_isr?: number | null
  edited?: boolean | null
  metadata?: Record<string, unknown> | null
}

/**
 * days_worked for display/merge.
 * fixed: eff_hours stores days.
 * hourly|admin_floor: eff_hours stores clock hours — use metadata.days_worked (or row fallback), never eff_hours.
 */
export function resolveDaysWorkedForUnifiedRow(
  payType: EffectivePayType | string | undefined,
  line: Pick<RunLineMergeSource, 'eff_hours' | 'metadata'>,
  rowFallbackDays?: number
): number {
  const meta = line.metadata || {}
  const metaDays = Number(meta.days_worked)
  if (Number.isFinite(metaDays) && metaDays >= 0) return metaDays

  const effective = coalescePlanillaPayType(payType ?? meta.pay_type)
  if (isHourBasedPlanillaPayType(effective)) {
    const fb = Number(rowFallbackDays)
    return Number.isFinite(fb) && fb >= 0 ? fb : 0
  }

  const eff = Number(line.eff_hours)
  if (Number.isFinite(eff)) return eff
  const fb = Number(rowFallbackDays)
  return Number.isFinite(fb) ? fb : 0
}

/** Merge payroll_run_lines effective values without corrupting days↔hours. */
export function mergeRunLineIntoUnifiedRow(
  row: UnifiedRow,
  line: RunLineMergeSource
): UnifiedRow {
  const meta = line.metadata || undefined
  const payType = coalescePlanillaPayType(
    meta?.pay_type ?? row.pay_type
  )
  const days_worked = resolveDaysWorkedForUnifiedRow(payType, line, row.days_worked)

  const metaHx = Number(meta?.horas_extras)
  const extrasHoras = Number.isFinite(metaHx)
    ? metaHx
    : Number(row.horas_extras ?? row.extras?.horas) || 0

  let total_hours_worked = row.total_hours_worked
  if (isHourBasedPlanillaPayType(payType)) {
    const metaHours = Number(meta?.total_hours_worked)
    if (Number.isFinite(metaHours) && metaHours >= 0) {
      total_hours_worked = metaHours
    } else {
      const effH = Number(line.eff_hours)
      if (Number.isFinite(effH)) total_hours_worked = effH
    }
  }

  const effBruto =
    line.eff_bruto !== undefined && line.eff_bruto !== null
      ? Number(line.eff_bruto)
      : Number(row.total_earnings) || 0
  const effNeto =
    line.eff_neto !== undefined && line.eff_neto !== null
      ? Number(line.eff_neto)
      : row.total
  const totalDeducciones = effBruto - (effNeto ?? 0)

  return {
    ...row,
    pay_type: payType,
    days_worked,
    ...(total_hours_worked !== undefined ? { total_hours_worked } : {}),
    ...(meta ? { metadata: meta } : {}),
    ...(line.eff_neto !== undefined && line.eff_neto !== null
      ? { total: Number(line.eff_neto) }
      : {}),
    ...(line.eff_bruto !== undefined && line.eff_bruto !== null
      ? { total_earnings: Number(line.eff_bruto) }
      : {}),
    ...(line.eff_ihss !== undefined && line.eff_ihss !== null
      ? { IHSS: Number(line.eff_ihss) }
      : {}),
    ...(line.eff_rap !== undefined && line.eff_rap !== null
      ? { RAP: Number(line.eff_rap) }
      : {}),
    ...(line.eff_isr !== undefined && line.eff_isr !== null
      ? { ISR: Number(line.eff_isr) }
      : {}),
    ...(line.edited !== undefined && line.edited !== null
      ? { edited: Boolean(line.edited) }
      : {}),
    horas_extras: extrasHoras,
    horas_trabajadas: total_hours_worked ?? row.horas_trabajadas ?? 0,
    extras: { horas: extrasHoras, monto: row.extras?.monto ?? 0 },
    total_deducciones: Math.round(Math.max(0, totalDeducciones) * 100) / 100,
  } as UnifiedRow
}

export type UnifiedResumen = {
  empleados: number;
  total_bruto: number;
  total_deducciones: {
    IHSS: number;
    RAP: number;
    ISR: number;
    otros: number;
  };
  total_neto: number;
  total_dias_trabajados: number;
  total_horas_extras: number;
};

/** Map preview/planilla row → UnifiedRow, preserving AHC overtime hours (Caso 1 display). */
export function mapPlanillaItemToUnifiedRow(p: PlanillaRow | Record<string, unknown>): UnifiedRow {
  const hx = Number((p as { horas_extras?: unknown }).horas_extras)
  const extrasHoras = Number.isFinite(hx) ? hx : 0
  const totalHours = Number((p as { total_hours_worked?: unknown }).total_hours_worked) || 0
  return {
    ...(p as PlanillaRow),
    horas_trabajadas: totalHours,
    extras: { horas: extrasHoras, monto: 0 },
    observaciones: '',
    status: 'completo' as const,
    pay_type: (p as { pay_type?: 'fixed' | 'hourly' | 'admin_floor' }).pay_type || 'fixed',
  }
}

export function summarizeUnifiedRows(rows: UnifiedRow[]): UnifiedResumen {
  return rows.reduce(
    (acc, r) => {
      acc.empleados += 1
      acc.total_bruto += r.total_earnings || 0
      acc.total_deducciones.IHSS += r.IHSS || 0
      acc.total_deducciones.RAP += r.RAP || 0
      acc.total_deducciones.ISR += r.ISR || 0
      acc.total_deducciones.otros +=
        (r.total_deducciones || 0) - (r.IHSS || 0) - (r.RAP || 0) - (r.ISR || 0)
      acc.total_neto += r.total || 0
      acc.total_dias_trabajados += r.days_worked || 0
      acc.total_horas_extras += r.extras?.horas || 0
      return acc
    },
    {
      empleados: 0,
      total_bruto: 0,
      total_deducciones: { IHSS: 0, RAP: 0, ISR: 0, otros: 0 },
      total_neto: 0,
      total_dias_trabajados: 0,
      total_horas_extras: 0,
    } as UnifiedResumen
  )
}

export async function fetchUnifiedPayroll(
  companyId: string, 
  year: number, 
  month: number, 
  quincena: number,
  tipo: string = 'CON'
): Promise<{ rows: UnifiedRow[]; resumen: UnifiedResumen; runId?: string; status?: string; incompleteRecordsAlert?: { employee_id: string; employee_name: string; dates: string[] }[] }> {
  // Validate input parameters
  if (!companyId || !year || !month || !quincena) {
    throw new Error('Parámetros requeridos faltantes')
  }
  if (month < 1 || month > 12) {
    throw new Error('Mes inválido (debe ser 1-12)')
  }
  if (quincena < 1 || quincena > 2) {
    throw new Error('Quincena inválida (debe ser 1 o 2)')
  }

  try {
    // Fetch only the preview data which contains all active employees with attendance
    // Add cache-busting to ensure fresh data
    const timestamp = Date.now()
    const planillaRes = await fetch(`/api/payroll/preview?year=${year}&month=${month}&quincena=${quincena}&tipo=${tipo}&_t=${timestamp}`);

    if (!planillaRes.ok) {
      throw new Error(`Error fetching payroll data: ${planillaRes.status} ${planillaRes.statusText}`)
    }

    const planillaData = await planillaRes.json();
    
    // Extract separated arrays from API response (new format)
    const planilla_fixed: PlanillaRow[] = Array.isArray(planillaData.planilla_fixed) ? planillaData.planilla_fixed : [];
    const planilla_hourly: PlanillaRow[] = Array.isArray(planillaData.planilla_hourly) ? planillaData.planilla_hourly : [];
    
    // Fallback to combined planilla for backward compatibility
    const planilla: PlanillaRow[] = planilla_fixed.length > 0 || planilla_hourly.length > 0
      ? [...planilla_fixed, ...planilla_hourly]
      : (Array.isArray(planillaData.planilla) ? planillaData.planilla : []);
    
    console.log('📊 Payroll data loaded:', {
      planillaFixedCount: planilla_fixed.length,
      planillaHourlyCount: planilla_hourly.length,
      planillaCount: planilla.length,
      planillaDataKeys: Object.keys(planillaData)
    });
    
    console.log('🔍 DEBUG - Planilla data sample:', planilla.slice(0, 3));

    // Convert planilla data to unified format (base rows without metadata)
    let rows: UnifiedRow[] = planilla.map((p) => mapPlanillaItemToUnifiedRow(p))

    // If we have a run_id, fetch run lines to enrich rows with metadata
    if (planillaData.run_id) {
      try {
        const linesRes = await fetch(`/api/payroll/run-lines?run_id=${encodeURIComponent(planillaData.run_id)}&_t=${timestamp}`)
        if (linesRes.ok) {
          const { lines } = await linesRes.json()
          // Build quick lookup by line_id and by employee_id
          const byLineId: Record<string, any> = {}
          const byEmployee: Record<string, any> = {}
          ;(lines || []).forEach((l: any) => {
            if (l?.id) byLineId[l.id] = l
            if (l?.employee_id) byEmployee[l.employee_id] = l
          })

          // Merge metadata and effective values into rows (never map clock hours → days_worked)
          rows = rows.map((r) => {
            const lid = (r as any).line_id as string | undefined
            const line =
              (lid && byLineId[lid]) || byEmployee[r.employee_id]
            return line ? mergeRunLineIntoUnifiedRow(r, line) : r
          })
        } else {
          console.warn('No se pudo cargar run-lines para metadata:', linesRes.status)
        }
      } catch (e) {
        console.warn('Error cargando run-lines:', e)
      }
    }

    const resumen = summarizeUnifiedRows(rows)

    // Incluir run_id y status si están disponibles en la respuesta
    const result: { rows: UnifiedRow[]; resumen: UnifiedResumen; runId?: string; status?: string; incompleteRecordsAlert?: { employee_id: string; employee_name: string; dates: string[] }[] } = { rows, resumen };
    
    if (planillaData.run_id) {
      result.runId = planillaData.run_id;
      console.log('🔍 DEBUG - Run ID included in result:', planillaData.run_id);
    }
    
    if (planillaData.status) {
      result.status = planillaData.status;
      console.log('🔍 DEBUG - Status included in result:', planillaData.status);
    }

    if (planillaData.incompleteRecordsAlert && planillaData.incompleteRecordsAlert.length > 0) {
      result.incompleteRecordsAlert = planillaData.incompleteRecordsAlert;
    }

    return result;
  } catch (error) {
    console.error('Error fetching unified payroll:', error);
    throw error;
  }
}

// Get current period in Honduras timezone
export function getCurrentPeriod(): { year: number; month: number; quincena: number } {
  const now = new Date();
  const tgu = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'America/Tegucigalpa', 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric' 
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {} as any);

  const year = Number(tgu.year);
  const month = Number(tgu.month);
  const day = Number(tgu.day);
  const quincena = day <= 15 ? 1 : 2;

  return { year, month, quincena };
}
