/**
 * Net shown on voucher / planilla must match the same total_deductions shown
 * (statutory + custom). Always bruto − total so the PDF is self-consistent even when
 * stored `eff_neto` omits customs or double-counts a metadata.isr mirror of eff_isr.
 *
 * `customDeductions` / `storedNeto` remain in the signature for call-site compatibility.
 */

export function resolveDisplayNet(params: {
  bruto: number
  totalDeductions: number
  customDeductions: number
  storedNeto: number
}): number {
  const bruto = Number(params.bruto) || 0
  const totalDeductions = Number(params.totalDeductions) || 0
  void params.customDeductions
  void params.storedNeto

  return Math.max(0, Math.round((bruto - totalDeductions) * 100) / 100)
}
