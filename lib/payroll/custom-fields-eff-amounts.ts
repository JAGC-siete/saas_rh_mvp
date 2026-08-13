/**
 * Custom-field earnings must not stack on an `eff_bruto` that already includes them.
 * Re-saves are idempotent; obvious double-counts heal back to calc_bruto + earnings.
 * Manual `/edit` bruto overrides (outside calc±N·earnings) are preserved.
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function nearlyEqual(a: number, b: number, eps = 0.02): boolean {
  return Math.abs(a - b) <= eps
}

export function resolveCustomFieldsBaseBruto(input: {
  calcBruto: number
  currentEffBruto: number
  priorIngresosAdicionales: number
}): number {
  const calcBruto = Math.max(0, Number(input.calcBruto) || 0)
  const effBruto = Math.max(0, Number(input.currentEffBruto) || 0)
  const prior = Number(input.priorIngresosAdicionales) || 0

  if (prior === 0) {
    return round2(effBruto)
  }

  const once = round2(calcBruto + prior)
  const twice = round2(calcBruto + 2 * prior)

  // Fresh calc+customs, or already-doubled (legacy bug): anchor to engine baseline.
  if (nearlyEqual(effBruto, once) || nearlyEqual(effBruto, twice)) {
    return round2(calcBruto)
  }

  // Manual bruto edit (or other override): strip only the prior custom earnings.
  return round2(Math.max(0, effBruto - prior))
}

export function computeCustomFieldsEffectiveAmounts(input: {
  calcBruto: number
  currentEffBruto: number
  priorIngresosAdicionales: number
  ingresosAdicionales: number
  deduccionesAdicionales: number
  effIhss: number
  effRap: number
  effIsr: number
}): { baseBruto: number; newEffBruto: number; newEffNeto: number } {
  const baseBruto = resolveCustomFieldsBaseBruto({
    calcBruto: input.calcBruto,
    currentEffBruto: input.currentEffBruto,
    priorIngresosAdicionales: input.priorIngresosAdicionales,
  })
  const ingresos = Number(input.ingresosAdicionales) || 0
  const deducciones = Number(input.deduccionesAdicionales) || 0
  const statutory =
    (Number(input.effIhss) || 0) +
    (Number(input.effRap) || 0) +
    (Number(input.effIsr) || 0)

  const newEffBruto = round2(baseBruto + ingresos)
  const newEffNeto = round2(newEffBruto - statutory - deducciones)

  return { baseBruto, newEffBruto, newEffNeto }
}

export function isPayrollRunEditableForCustomFields(
  status: string | null | undefined
): boolean {
  return status === 'draft' || status === 'edited'
}
