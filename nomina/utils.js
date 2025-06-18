export function calcularISR(salarioBase) {
  const ingresoAnual = salarioBase * 12;
  const rentaNeta = ingresoAnual - 40000;
  if (rentaNeta <= 217493.16) return 0;
  if (rentaNeta <= 494224.40) return ((rentaNeta - 217493.16) * 0.15) / 12;
  if (rentaNeta <= 771252.37) return (41610.33 + (rentaNeta - 494224.40) * 0.20) / 12;
  return (96916.30 + (rentaNeta - 771252.37) * 0.25) / 12;
}

export const formatoLempiras = n => new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  minimumFractionDigits: 2
}).format(n);
