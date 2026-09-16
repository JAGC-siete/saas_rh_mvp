/**
 * Exportación CSV de la bandeja de leads. Vive en el cliente: el dueño ya tiene
 * los datos en pantalla y no hace falta otro round-trip al servidor.
 */

import { formatDateTimeForHonduras } from '../timezone'

export interface LandingLeadCsvRow {
  created_at: string
  full_name: string
  email: string | null
  phone: string | null
  message: string | null
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function landingLeadsToCsv(leads: LandingLeadCsvRow[]): string {
  const header = ['Fecha', 'Nombre', 'Correo', 'Teléfono', 'Mensaje']
  const lines = [header.join(',')]

  for (const lead of leads) {
    lines.push(
      [
        csvCell(formatDateTimeForHonduras(lead.created_at)),
        csvCell(lead.full_name),
        csvCell(lead.email ?? ''),
        csvCell(lead.phone ?? ''),
        csvCell(lead.message ?? ''),
      ].join(',')
    )
  }

  return `${lines.join('\r\n')}\r\n`
}

/** Dispara la descarga en el navegador. No-op en el servidor. */
export function downloadLandingLeadsCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
