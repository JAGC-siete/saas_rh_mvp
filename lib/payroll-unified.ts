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
  quincena: number
): Promise<{ rows: UnifiedRow[]; resumen: UnifiedResumen }> {
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
    // Fetch both datasets in parallel
    const [planillaRes, detalleRes] = await Promise.all([
      fetch(`/api/payroll/preview?year=${year}&month=${month}&quincena=${quincena}&tipo=CON`),
      fetch(`/api/payroll/records?periodo=${year}-${month.toString().padStart(2, '0')}&quincena=${quincena}`)
    ]);

    if (!planillaRes.ok || !detalleRes.ok) {
      const planillaError = planillaRes.ok ? null : `Planilla: ${planillaRes.status} ${planillaRes.statusText}`
      const detalleError = detalleRes.ok ? null : `Detalle: ${detalleRes.status} ${detalleRes.statusText}`
      throw new Error(`Error fetching payroll data. ${planillaError || ''} ${detalleError || ''}`.trim())
    }

    const planilla: PlanillaRow[] = await planillaRes.json();
    const detalle: DetalleRow[] = await detalleRes.json();

    // Merge by employee_id
    const byId = new Map<string, UnifiedRow>();

    // Start with planilla data
    for (const p of planilla) {
      byId.set(p.employee_id, {
        ...p,
        horas_trabajadas: 0,
        extras: { horas: 0, monto: 0 },
        observaciones: '',
        status: 'completo' as const
      });
    }

    // Merge with detalle data
    for (const d of detalle) {
      const existing = byId.get(d.employee_id);
      if (existing) {
        byId.set(d.employee_id, { ...existing, ...d, status: 'completo' });
      } else {
        // Employee in detalle but not in planilla
        byId.set(d.employee_id, {
          name: 'Empleado sin planilla',
          base_salary: 0,
          total_earnings: 0,
          IHSS: 0,
          RAP: 0,
          ISR: 0,
          total_deducciones: 0,
          total: 0,
          days_worked: 0,
          days_absent: 0,
          late_days: 0,
          department: 'N/A',
          ...d,
          status: 'sin_planilla' as const
        });
      }
    }

    // Mark employees in planilla but not in detalle
    for (const [id, row] of byId.entries()) {
      if (row.status === 'completo' && !detalle.find(d => d.employee_id === id)) {
        row.status = 'sin_asistencia';
        row.horas_trabajadas = 0;
        row.extras = { horas: 0, monto: 0 };
        row.observaciones = 'Sin datos de asistencia';
      }
    }

    const rows = Array.from(byId.values());

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

    return { rows, resumen };
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
