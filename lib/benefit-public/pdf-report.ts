import { Buffer } from 'buffer'
import { PDF, drawLiquidPdfHeader } from '../pdf/liquid-theme'
import type { BenefitCalculationResult } from '../payroll/thirteenth-fourteenth/calculate'

export interface BenefitReportData extends BenefitCalculationResult {
  fechaIngreso: string
  label: string
}

export async function generateBenefitReportPDF(data: BenefitReportData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const formatHNL = (n: number) =>
        `L. ${Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 30,
        info: {
          Title: `Reporte ${data.label} - Humano SISU`,
          Author: 'Humano SISU',
          Subject: `Cálculo de ${data.label} Honduras`,
          Keywords: `${data.label}, Honduras, prestaciones, Humano SISU`,
          Creator: 'Humano SISU - Calculadora pública',
        },
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const pageWidth = doc.page.width
      let y = drawLiquidPdfHeader(doc, {
        title: `Reporte de ${data.label}`,
        subtitle: 'Honduras — estimación orientativa',
      })

      doc.fontSize(10).fillColor(PDF.bodyText)
      doc.text(`Fecha de ingreso: ${data.fechaIngreso}`, 30, y)
      y += 16
      doc.text(`Período: ${data.periodo.inicio} → ${data.periodo.fin}`, 30, y)
      y += 16
      doc.text(`Modo de cálculo: ${data.modoCalculo === 'anual' ? 'Pago anual (promedio)' : 'Proporcional'}`, 30, y)
      y += 16
      doc.text(`Salario base: ${formatHNL(data.salarioBaseMensual)}`, 30, y)
      y += 16
      doc.text(`Salario usado en fórmula: ${formatHNL(data.salarioUsado)}`, 30, y)
      y += 16
      doc.text(`Días en período (360): ${data.diasEnPeriodo}`, 30, y)

      if (data.tipo === '14AVO' && data.elegible14voAnual === false) {
        y += 16
        doc.fillColor('#b45309').text(
          'Aviso: menos de 200 días en el ciclo jul–jun para pago anual íntegro del 14vo.',
          30,
          y,
          { width: pageWidth - 60 }
        )
        doc.fillColor(PDF.bodyText)
      }

      y += 28
      doc.rect(30, y, pageWidth - 60, 40).fill(PDF.successBg).stroke(PDF.successBorder)
      doc.fontSize(11).fillColor(PDF.successText).text(`MONTO ESTIMADO (${data.label})`, 40, y + 8)
      doc.fontSize(18).fillColor(PDF.success).text(formatHNL(data.monto), 40, y + 22)

      y += 55
      doc.fontSize(10).fillColor(PDF.bodyMuted)
      doc.text(data.desglose.formula, 30, y)
      y += 14
      doc.text(
        `(${formatHNL(data.desglose.salarioMensual)} ÷ ${data.desglose.divisor}) × ${data.desglose.diasEnPeriodo} días`,
        30,
        y
      )

      y += 24
      doc.fillColor('#b45309').text(
        'Sin deducciones de ISR, Seguro Social ni RAP (salvo pensión alimenticia judicial).',
        30,
        y,
        { width: pageWidth - 60 }
      )

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
