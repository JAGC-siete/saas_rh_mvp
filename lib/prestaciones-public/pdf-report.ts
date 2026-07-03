import { Buffer } from 'buffer'
import { PDF, drawLiquidPdfHeader } from '../pdf/liquid-theme'

export interface PrestacionesReportData {
  salarioBaseMensual: number
  salarioPromedioMensual: number
  fechaIngreso: string
  fechaEgreso: string
  antiguedadTexto: string
  motivoSalida: string
  preavisoGozado: boolean
  rubros: {
    preaviso: number
    cesantiaBruta: number
    rapAplicado: number
    cesantiaNeta: number
    vacaciones: number
    aguinaldo: number
    decimoCuarto: number
    reservaLaboralEnTotal: number
    totalPagar: number
  }
  reservaLaboralDisclaimer?: string
}

export async function generatePrestacionesReportPDF(
  data: PrestacionesReportData
): Promise<Buffer> {
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
          Title: `Reporte de Prestaciones - Humano SISU`,
          Author: 'Humano SISU',
          Subject: 'Reporte de cálculo de prestaciones',
          Keywords: 'prestaciones, cesantía, preaviso, Honduras',
          Creator: 'Humano SISU - Calculadora de Prestaciones'
        }
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => {
        try {
          resolve(Buffer.concat(buffers))
        } catch (e) {
          reject(e)
        }
      })

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height

      let y = drawLiquidPdfHeader(doc, {
        title: 'Reporte de cálculo de prestaciones (Honduras)',
        subtitle: 'Estimación orientativa',
      })

      doc.fontSize(12).fillColor(PDF.bodyText).text('DATOS DEL CÁLCULO:', 30, y)
      y += 16
      doc.rect(30, y, pageWidth - 60, 92).stroke(PDF.panelBorder)
      doc.fontSize(10)
      doc.text('Fecha de ingreso:', 40, y + 10)
      doc.text(data.fechaIngreso, 160, y + 10)
      doc.text('Fecha de egreso:', 40, y + 26)
      doc.text(data.fechaEgreso, 160, y + 26)
      doc.text('Antigüedad (360):', 40, y + 42)
      doc.text(data.antiguedadTexto, 160, y + 42)
      doc.text('Motivo:', 40, y + 58)
      doc.text(data.motivoSalida, 160, y + 58)
      doc.text('Preaviso gozado:', 40, y + 74)
      doc.text(data.preavisoGozado ? 'Sí' : 'No', 160, y + 74)

      y += 110
      doc.fontSize(10).fillColor('#666666')
      doc.text(`Salario base mensual: ${formatHNL(data.salarioBaseMensual)}`, 40, y)
      doc.text(`Salario promedio mensual: ${formatHNL(data.salarioPromedioMensual)}`, 300, y)
      doc.fillColor('#000000')

      y += 24
      doc.fontSize(12).text('RESUMEN:', 30, y)
      y += 18
      doc.rect(30, y, pageWidth - 60, 34).fill(PDF.successBg).stroke(PDF.successBorder)
      doc.fontSize(11).fillColor(PDF.successText).text('TOTAL ESTIMADO A RECIBIR', 40, y + 9)
      doc.fontSize(16).fillColor(PDF.success).text(formatHNL(data.rubros.totalPagar), 40, y + 22)
      doc.fillColor(PDF.bodyText)

      y += 55
      doc.fontSize(12).text('DESGLOSE POR CONCEPTO:', 30, y)
      y += 18

      const rows: { label: string; amount: number }[] = [
        { label: 'Preaviso', amount: data.rubros.preaviso },
        { label: 'Cesantía (bruta)', amount: data.rubros.cesantiaBruta },
        { label: 'RAP aplicado', amount: data.rubros.rapAplicado },
        { label: 'Cesantía (neta)', amount: data.rubros.cesantiaNeta },
        { label: 'Vacaciones', amount: data.rubros.vacaciones },
        { label: '13vo proporcional', amount: data.rubros.aguinaldo },
        { label: '14vo proporcional', amount: data.rubros.decimoCuarto },
        { label: 'Reserva laboral', amount: data.rubros.reservaLaboralEnTotal },
      ]

      rows.forEach((r) => {
        if (y > pageHeight - 160) {
          doc.addPage()
          y = 30
        }
        doc.rect(30, y, pageWidth - 60, 28).stroke('#000000')
        doc.fontSize(10).fillColor('#000000').text(r.label, 40, y + 8)
        doc.fontSize(11).fillColor('#000000').text(formatHNL(r.amount), pageWidth - 110, y + 8, {
          align: 'right',
          width: 70
        })
        y += 32
      })

      if (data.reservaLaboralDisclaimer) {
        y += 8
        if (y > pageHeight - 100) {
          doc.addPage()
          y = 30
        }
        doc.fontSize(8).fillColor('#666666').text(data.reservaLaboralDisclaimer, 30, y, {
          width: pageWidth - 60,
          align: 'left',
        })
        y += 36
      }

      // Footer
      const footerY = pageHeight - 60
      doc.rect(0, footerY, pageWidth, 60).fill('#f5f5f5')
      doc.fontSize(9).fillColor('#666666').text(
        'Este reporte fue generado por la Calculadora de Prestaciones de Humano SISU.',
        30,
        footerY + 10,
        { align: 'center', width: pageWidth - 60 }
      )
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      doc.fontSize(9).fillColor('#1976d2').text(`${siteUrl}/activar`, 30, footerY + 28, {
        align: 'center',
        width: pageWidth - 60
      })

      doc.end()
    } catch (err: any) {
      reject(err)
    }
  })
}

