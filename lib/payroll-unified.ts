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

export async function fetchUnifiedPayroll(
  companyId: string, 
  year: number, 
  month: number, 
  quincena: number,
  tipo: string = 'CON'
): Promise<{ rows: UnifiedRow[]; resumen: UnifiedResumen; runId?: string }> {
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
    
    // Extract the actual array from the API response
    const planilla: PlanillaRow[] = Array.isArray(planillaData.planilla) ? planillaData.planilla : [];
    
    console.log('📊 Payroll data loaded:', {
      planillaCount: planilla.length,
      planillaDataKeys: Object.keys(planillaData)
    });
    
    console.log('🔍 DEBUG - Planilla data sample:', planilla.slice(0, 3));

    // Convert planilla data to unified format
    const rows: UnifiedRow[] = planilla.map(p => ({
      ...p,
      horas_trabajadas: 0,
      extras: { horas: 0, monto: 0 },
      observaciones: '',
      status: 'completo' as const
    }));

    // Calculate summary
    const resumen = rows.reduce((acc, r) => {
      acc.empleados += 1;
      acc.total_bruto += r.total_earnings || 0;
      acc.total_deducciones.IHSS += r.IHSS || 0;
      acc.total_deducciones.RAP += r.RAP || 0;
      acc.total_deducciones.ISR += r.ISR || 0;
      acc.total_deducciones.otros += (r.total_deducciones || 0) - (r.IHSS || 0) - (r.RAP || 0) - (r.ISR || 0);
      acc.total_neto += r.total || 0;
      acc.total_dias_trabajados += r.days_worked || 0;
      acc.total_horas_extras += r.extras?.horas || 0;
      return acc;
    }, {
      empleados: 0,
      total_bruto: 0,
      total_deducciones: { IHSS: 0, RAP: 0, ISR: 0, otros: 0 },
      total_neto: 0,
      total_dias_trabajados: 0,
      total_horas_extras: 0
    } as UnifiedResumen);

    // Incluir run_id si está disponible en la respuesta
    const result: { rows: UnifiedRow[]; resumen: UnifiedResumen; runId?: string } = { rows, resumen };
    
    if (planillaData.run_id) {
      result.runId = planillaData.run_id;
      console.log('🔍 DEBUG - Run ID included in result:', planillaData.run_id);
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
