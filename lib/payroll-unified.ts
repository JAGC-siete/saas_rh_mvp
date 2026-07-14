// Unified payroll data fetching and merging
// Merges planilla and detalle data in the client without backend changes

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
    pay_type: (p as { pay_type?: 'fixed' | 'hourly' }).pay_type || 'fixed',
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

          // Merge metadata and effective values into rows
          rows = rows.map((r) => {
            const lid = (r as any).line_id as string | undefined
            const line =
              (lid && byLineId[lid]) || byEmployee[r.employee_id]
            if (line) {
              const effBruto = Number(line.eff_bruto) || Number(r.total_earnings) || 0
              const effNeto = Number(line.eff_neto) ?? r.total
              // total_deducciones = bruto - neto (incluye IHSS, RAP, ISR + deducciones de planes)
              const totalDeducciones = effBruto - (effNeto ?? 0)
              return { 
                ...r, 
                ...(line.metadata ? { metadata: line.metadata } : {}),
                ...(line.eff_neto !== undefined ? { total: Number(line.eff_neto) } : {}),
                ...(line.eff_bruto !== undefined ? { total_earnings: Number(line.eff_bruto) } : {}),
                ...(line.eff_ihss !== undefined ? { IHSS: Number(line.eff_ihss) } : {}),
                ...(line.eff_rap !== undefined ? { RAP: Number(line.eff_rap) } : {}),
                ...(line.eff_isr !== undefined ? { ISR: Number(line.eff_isr) } : {}),
                ...(line.eff_hours !== undefined ? { days_worked: Number(line.eff_hours) } : {}),
                ...(line.edited !== undefined ? { edited: line.edited } : {}),
                total_deducciones: Math.round(Math.max(0, totalDeducciones) * 100) / 100
              } as any
            }
            return r
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
