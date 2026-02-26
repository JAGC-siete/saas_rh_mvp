/**
 * Resolves ZKTeco device PIN to employee.
 * Search order: employee_aliases -> employee_code -> dni (normalized)
 */

import { SupabaseClient } from '@supabase/supabase-js';

function normalizeForMatch(value: string | number | null | undefined): string | undefined {
  if (value == null) return undefined;
  const str = String(value).trim();
  const digits = str.replace(/\D/g, '');
  return digits || str || undefined;
}

export interface EmployeeForAttendance {
  id: string;
  company_id: string;
  work_schedule_id: string | null;
  dni: string;
  pay_type: string | null;
}

/**
 * Resolves PIN to employee. Order: aliases -> employee_code -> dni.
 */
export async function resolveEmployeeByPin(
  supabase: SupabaseClient,
  companyId: string,
  pin: string
): Promise<EmployeeForAttendance | null> {
  const pinStr = String(pin).trim();
  const pinNormalized = normalizeForMatch(pin);

  if (!pinStr) return null;

  // 1. employee_aliases: alias = PIN (exact match)
  const { data: aliasMatch } = await supabase
    .from('employee_aliases')
    .select('employee_id')
    .eq('alias', pinStr)
    .limit(1)
    .maybeSingle();

  if (aliasMatch?.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id, company_id, work_schedule_id, dni, pay_type')
      .eq('id', aliasMatch.employee_id)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .single();

    if (emp) return emp as EmployeeForAttendance;
  }

  // 2. employee_code: exact match or normalized
  const { data: employees } = await supabase
    .from('employees')
    .select('id, company_id, work_schedule_id, dni, pay_type, employee_code')
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (employees) {
    const byCode = employees.find((e) => {
      const code = e.employee_code;
      if (!code) return false;
      return code === pinStr || normalizeForMatch(code) === pinNormalized;
    });
    if (byCode) {
      const { employee_code: _, ...rest } = byCode;
      return rest as EmployeeForAttendance;
    }

    // 3. dni: normalized match
    const byDni = employees.find((e) => {
      const normalized = normalizeForMatch(e.dni);
      return normalized === pinNormalized;
    });
    if (byDni) {
      const { employee_code: __, ...rest } = byDni;
      return rest as EmployeeForAttendance;
    }
  }

  return null;
}
