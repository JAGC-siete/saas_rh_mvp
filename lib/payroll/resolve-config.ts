/**
 * Resolve payroll configuration from 3 layers
 * Capa 3 (adjustments) > Capa 2 (company config) > Capa 1 (labor laws)
 */

import { createAdminClient } from '../supabase/server'

export type PaymentFrequency = 'quincenal' | 'mensual'

export interface ResolvedPayrollConfig {
  paymentFrequency: PaymentFrequency
  quincenaConfig: {
    first_start: number
    first_end: number
    second_start: number
    second_end: number
  }
}

const DEFAULT_QUINCENA = {
  first_start: 1,
  first_end: 15,
  second_start: 16,
  second_end: 30,
}

/**
 * Resolve payment frequency for employee
 * Order: employees.payment_frequency > company_payroll_configs.payment_frequency > 'mensual'
 */
export async function resolvePaymentFrequency(
  employeeId: string,
  companyId: string,
  supabase?: any
): Promise<PaymentFrequency> {
  const client = supabase ?? createAdminClient()

  const { data: employee } = await client
    .from('employees')
    .select('payment_frequency')
    .eq('id', employeeId)
    .single()

  if (employee?.payment_frequency) {
    return employee.payment_frequency as PaymentFrequency
  }

  const { data: config } = await client
    .from('company_payroll_configs')
    .select('payment_frequency')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (config?.payment_frequency) {
    return config.payment_frequency as PaymentFrequency
  }

  return 'mensual'
}

/**
 * Resolve full payroll config (frequency + quincena dates)
 */
export async function resolvePayrollConfig(
  employeeId: string,
  companyId: string,
  supabase?: any
): Promise<ResolvedPayrollConfig> {
  const client = supabase ?? createAdminClient()

  const { data: employee } = await client
    .from('employees')
    .select('payment_frequency, quincena_config')
    .eq('id', employeeId)
    .single()

  const { data: config } = await client
    .from('company_payroll_configs')
    .select('payment_frequency, quincena_config')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  const paymentFrequency: PaymentFrequency =
    employee?.payment_frequency ??
    config?.payment_frequency ??
    'mensual'

  const quincenaConfig = {
    ...DEFAULT_QUINCENA,
    ...(config?.quincena_config as Record<string, number>),
    ...(employee?.quincena_config as Record<string, number>),
  }

  return {
    paymentFrequency,
    quincenaConfig: {
      first_start: quincenaConfig.first_start ?? 1,
      first_end: quincenaConfig.first_end ?? 15,
      second_start: quincenaConfig.second_start ?? 16,
      second_end: quincenaConfig.second_end ?? 30,
    },
  }
}
