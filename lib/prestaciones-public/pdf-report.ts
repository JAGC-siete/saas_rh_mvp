import { Buffer } from 'buffer'
import { formatDateTimeForHonduras, nowInHonduras } from '../timezone'
import {
  PDF,
  PDF_FOOTER_RESERVE,
  defaultPdfPrimaryColor,
  drawBrandedReceiptHeader,
  drawLiquidFooter,
  drawLiquidHighlightBox,
  drawLiquidPanel,
  drawLiquidSectionTitle,
  drawLiquidTableHeader,
} from '../pdf/liquid-theme'

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

const MARGIN = 30
const PAD = 12
const ROW_H = 16
const TABLE_HEADER_H = 20
const BRAND_LINE = 'Humano SISU · Sistema Hondureño de Recursos Humanos'

function formatHNL(n: number): string {
  return `L. ${Number(n || 0).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function writeAmount(
  doc: PDFKit.PDFDocument,
  text: string,
  y: number,
  pageWidth: number,
  options?: { bold?: boolean; color?: string }
): void {
  const contentWidth = pageWidth - MARGIN * 2
  if (options?.bold) doc.font('Helvetica-Bold')
  doc.fontSize(9).fillColor(options?.color ?? PDF.bodyText).text(text, MARGIN + PAD, y, {
    width: contentWidth - PAD * 2,
    align: 'right',
    lineBreak: false,
  })
  if (options?.bold) doc.font('Helvetica')
}

function drawKeyValuePanel(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  rows: Array<{ label: string; value: string }>
): number {
  const h = PAD * 2 + rows.length * ROW_H
  drawLiquidPanel(doc, x, y, w, h)
  rows.forEach((row, index) => {
    const rowY = y + PAD + index * ROW_H
    doc.font('Helvetica').fontSize(8.5).fillColor(PDF.bodyMuted).text(`${row.label}:`, x + PAD, rowY, {
      lineBreak: false,
    })
    doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyText).text(row.value, x + PAD + 118, rowY, {
      width: w - PAD * 2 - 122,
      lineBreak: false,
    })
  })
  return y + h
}

function drawLineItemPanel(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  items: Array<{ label: string; amount: string }>
): number {
  const h = TABLE_HEADER_H + PAD + items.length * ROW_H + PAD
  drawLiquidPanel(doc, x, y, w, h)

  const colConcept = Math.floor(w * 0.62)
  const colAmount = w - colConcept - 2
  drawLiquidTableHeader(doc, x + 1, y + 1, [colConcept, colAmount], ['Concepto', 'Monto'], TABLE_HEADER_H - 2)

  let rowY = y + TABLE_HEADER_H + 6
  items.forEach((item, idx) => {
    const stripe = idx % 2 === 1 ? PDF.tableStripe : PDF.white
    doc.rect(x + 1, rowY - 2, w - 2, ROW_H).fill(stripe)
    doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyText)
    doc.text(item.label, x + PAD, rowY, { lineBreak: false })
    writeAmount(doc, item.amount, rowY, doc.page.width)
    rowY += ROW_H
  })

  doc.font('Helvetica').fillColor(PDF.bodyText)
  return y + h
}

export async function generatePrestacionesReportPDF(
  data: PrestacionesReportData
): Promise<Buffer> {
  const primaryColor = defaultPdfPrimaryColor()
  const generatedAt = formatDateTimeForHonduras(nowInHonduras())
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: MARGIN,
        bufferPages: true,
        info: {
          Title: 'Reporte de Prestaciones - Humano SISU',
          Author: 'Humano SISU',
          Subject: 'Reporte de cálculo de prestaciones',
          Keywords: 'prestaciones, cesantía, preaviso, Honduras',
          Creator: 'Humano SISU - Calculadora de Prestaciones',
        },
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
      doc.on('error', reject)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const contentWidth = pageWidth - MARGIN * 2
      const footerY = pageHeight - PDF_FOOTER_RESERVE

      let y = drawBrandedReceiptHeader(doc, {
        primaryColor,
        companyName: 'Humano SISU',
        title: 'Cálculo de Prestaciones',
        subtitle: 'Honduras · Estimación orientativa',
      })

      drawLiquidSectionTitle(doc, 'Datos del cálculo', MARGIN, y)
      y += 16
      y =
        drawKeyValuePanel(doc, MARGIN, y, contentWidth, [
          { label: 'Fecha de ingreso', value: data.fechaIngreso },
          { label: 'Fecha de egreso', value: data.fechaEgreso },
          { label: 'Antigüedad (360)', value: data.antiguedadTexto },
          { label: 'Motivo', value: data.motivoSalida },
          { label: 'Preaviso gozado', value: data.preavisoGozado ? 'Sí' : 'No' },
          { label: 'Salario base mensual', value: formatHNL(data.salarioBaseMensual) },
          { label: 'Salario promedio mensual', value: formatHNL(data.salarioPromedioMensual) },
        ]) + 14

      const netBoxH = 44
      drawLiquidHighlightBox(doc, MARGIN, y, contentWidth, netBoxH, { variant: 'success' })
      doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF.successText)
      doc.text('Total estimado a recibir', MARGIN + PAD, y + 10, { lineBreak: false })
      doc.fontSize(16).fillColor(PDF.success)
      doc.text(formatHNL(data.rubros.totalPagar), MARGIN + PAD, y + 10, {
        width: contentWidth - PAD * 2,
        align: 'right',
        lineBreak: false,
      })
      doc.font('Helvetica').fillColor(PDF.bodyText)
      y += netBoxH + 14

      drawLiquidSectionTitle(doc, 'Desglose por concepto', MARGIN, y)
      y += 14
      y =
        drawLineItemPanel(doc, MARGIN, y, contentWidth, [
          { label: 'Preaviso', amount: formatHNL(data.rubros.preaviso) },
          { label: 'Cesantía (bruta)', amount: formatHNL(data.rubros.cesantiaBruta) },
          { label: 'RAP aplicado', amount: formatHNL(data.rubros.rapAplicado) },
          { label: 'Cesantía (neta)', amount: formatHNL(data.rubros.cesantiaNeta) },
          { label: 'Vacaciones proporcionales', amount: formatHNL(data.rubros.vacaciones) },
          { label: '13vo proporcional', amount: formatHNL(data.rubros.aguinaldo) },
          { label: '14vo proporcional', amount: formatHNL(data.rubros.decimoCuarto) },
          { label: 'Reserva laboral', amount: formatHNL(data.rubros.reservaLaboralEnTotal) },
        ]) + 12

      if (data.reservaLaboralDisclaimer) {
        drawLiquidSectionTitle(doc, 'Notas', MARGIN, y)
        y += 14
        const noteH = 48
        drawLiquidPanel(doc, MARGIN, y, contentWidth, noteH)
        doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyMuted).text(
          data.reservaLaboralDisclaimer,
          MARGIN + PAD,
          y + PAD,
          { width: contentWidth - PAD * 2, align: 'left' }
        )
        y += noteH + 10
      }

      doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyMuted).text(
        `Este reporte fue generado por la Calculadora de Prestaciones de Humano SISU. ${siteUrl}/activar`,
        MARGIN,
        Math.min(y + 4, footerY - 28),
        { width: contentWidth, align: 'center' }
      )

      doc.fontSize(7).fillColor(PDF.footerMuted).text(`Fecha de generación: ${generatedAt}`, MARGIN, footerY - 12, {
        align: 'center',
        width: contentWidth,
        lineBreak: false,
      })
      drawLiquidFooter(doc, BRAND_LINE, { y: footerY, fontSize: 7 })

      doc.end()
    } catch (err: unknown) {
      reject(err)
    }
  })
}
