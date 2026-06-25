import { Buffer } from 'buffer'
import { PDF, drawLiquidPdfHeader } from '../pdf/liquid-theme'

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'

export async function generateGodfatherComparisonPdf(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 36,
        info: {
          Title: 'Cuánto le cuesta a tu empresa seguir en Excel — Humano SISU',
          Author: 'Humano SISU',
          Subject: 'Comparativa Excel vs automatización de planilla',
          Keywords: 'planilla, Excel, nómina, Honduras, Humano SISU',
          Creator: 'Humano SISU - Calculadora de Deducciones',
        },
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const activarUrl = `${SITE_BASE}/activar?country=HND&utm_source=calculadora-deducciones-hnd&utm_medium=email&utm_campaign=godfather-pdf`

      let y = drawLiquidPdfHeader(doc, {
        title: 'Cuánto le cuesta a tu empresa seguir en Excel',
        subtitle: 'Comparativa de una página — para dejar en la impresora o enviar al jefe',
      })

      doc.fontSize(11).fillColor(PDF.bodyText).text(
        'No es un reclamo. Es un dato que ayuda a la empresa a ser más rentable.',
        36,
        y,
        { width: 520 }
      )
      y += 28

      const rows = [
        ['Tiempo en planilla manual', '~15-20 h/mes en Excel', 'Minutos con motor legal SISU'],
        ['Errores en IHSS / RAP / ISR', 'Riesgo alto (copiar tablas)', 'Parámetros legales actualizados'],
        ['Constancias y vouchers', '3-5 días (RR.HH. ocupado)', '~2 segundos (autogestión)'],
        ['Costo de oportunidad', 'Domingos del Lic. + multas', 'Equipo enfocado en crecer'],
      ]

      const colWidths = [140, 170, 170]
      const startX = 36
      let tableY = y

      doc.rect(startX, tableY, 520, 22).fill(PDF.tableHeader)
      doc.fontSize(9).fillColor(PDF.tableHeaderText)
      ;['Rubro', 'Modo Cavernícola', 'Modo Pro (SISU)'].forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 6
        doc.text(h, x, tableY + 6, { width: colWidths[i] - 8 })
      })
      tableY += 22

      rows.forEach((row, idx) => {
        const fill = idx % 2 === 0 ? PDF.tableStripe : PDF.white
        doc.rect(startX, tableY, 520, 36).fill(fill).stroke(PDF.tableBorder)
        doc.fontSize(8.5).fillColor(PDF.bodyText)
        row.forEach((cell, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 6
          doc.text(cell, x, tableY + 8, { width: colWidths[i] - 8 })
        })
        tableY += 36
      })

      y = tableY + 20
      doc.fontSize(10).fillColor(PDF.bodyMuted).text(
        'Humano SISU usa el mismo motor que la calculadora pública de deducciones. Activación sin tarjeta.',
        36,
        y,
        { width: 520 }
      )
      y += 36
      doc.fontSize(11).fillColor(PDF.accent).text(`Activar gratis: ${activarUrl}`, 36, y, { width: 520, link: activarUrl })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
