import { calculatePayroll } from '../payroll-client-specific'
import { resolveDisplayNet } from './resolve-display-net'

/**
 * Same display net as voucher PDF: bruto − (statutory + customs from metadata).
 * Use for portal list / email body so UI matches the receipt PDF.
 */
export async function resolveRunLineDisplayNet(
  companyId: string,
  line: {
    eff_bruto?: number | null
    eff_ihss?: number | null
    eff_rap?: number | null
    eff_isr?: number | null
    eff_neto?: number | null
    metadata?: Record<string, unknown> | null
  },
  supabase?: unknown
): Promise<number> {
  const bruto = Number(line.eff_bruto) || 0
  const metadata = (line.metadata as Record<string, unknown> | null) ?? {}
  const calcResult = await calculatePayroll(companyId, bruto, metadata, supabase as any)
  const customDeductions = calcResult.totalDeduccionesAdicionales
  const statutory =
    (Number(line.eff_ihss) || 0) + (Number(line.eff_rap) || 0) + (Number(line.eff_isr) || 0)
  return resolveDisplayNet({
    bruto,
    totalDeductions: statutory + customDeductions,
    customDeductions,
    storedNeto: Number(line.eff_neto) || 0,
  })
}
