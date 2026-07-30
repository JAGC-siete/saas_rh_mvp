import { Buffer } from 'buffer'
import {
  formatDateForHonduras,
  formatDateOnlyForHonduras,
  formatDateTimeForHonduras,
  nowInHonduras,
} from '../timezone'
import {
  defaultPdfPrimaryColor,
  drawBrandedReceiptHeader,
  drawLiquidFooter,
  drawLiquidPanel,
  drawLiquidSectionTitle,
  PDF,
} from '../pdf/liquid-theme'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 30
const PAD = 12
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

export interface DeductionPlanAuthPdfInput {
  company_name: string
  employee_name: string
  employee_code?: string | null
  employee_dni?: string | null
  department?: string | null
  position?: string | null
  field_key: string
  field_label: string
  monto_total: number
  monto_por_plazo: number
  plazos_totales: number
  plazos_aplicados?: number
  fecha_inicio: string
  fecha_fin?: string | null
  activo?: boolean
  logoBuffer?: Buffer | null
  primaryColor?: string
}

function formatCurrency(n: number): string {
  return `L. ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatPlanDate(d: string | null | undefined): string {
  if (!d) return '—'
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? formatDateOnlyForHonduras(d) : formatDateForHonduras(d)
}

function kvRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW = 130
): void {
  doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyMuted)
  doc.text(label, x, y, { lineBreak: false, width: labelW })
  doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyText)
  doc.text(value, x + labelW, y, {
    lineBreak: false,
    width: CONTENT_WIDTH - labelW - PAD * 2,
  })
}

/**
 * PDF individual de autorización/recibo de un plan de deducción para firma del empleado.
 * Portrait A4 — distinto del reporte masivo landscape de planes.
 */
export async function generateDeductionPlanAuthPDF(
  input: DeductionPlanAuthPdfInput
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const primaryColor = defaultPdfPrimaryColor(input.primaryColor)
      const companyName = (input.company_name || 'Empresa').trim() || 'Empresa'
      const concept = (input.field_label || input.field_key || 'Deducción').trim()
      const montoTotal = Number(input.monto_total) || 0
      const montoPorPlazo = Number(input.monto_por_plazo) || 0
      const plazos = Number(input.plazos_totales) || 0
      const employeeName = (input.employee_name || 'Empleado').trim()

      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: MARGIN,
        autoFirstPage: true,
        info: {
          Title: `Autorización de deducción — ${concept}`,
          Author: 'Sistema Hondureño de Recursos Humanos',
          Subject: 'Autorización de plan de deducción',
          Keywords: 'deducciones, autorización, nómina, firma',
          Creator: 'HR SaaS System',
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

      // Avoid PDFKit auto-pagination from footer/signature drawing near bottom
      doc.page.margins.bottom = 0

      let yPos = drawBrandedReceiptHeader(doc, {
        primaryColor,
        companyName,
        title: 'Autorización de Deducción',
        subtitle: concept,
        logoBuffer: input.logoBuffer ?? null,
      })

      // Empleado
      drawLiquidSectionTitle(doc, 'Datos del empleado', MARGIN, yPos)
      yPos += 16
      const empBoxH = 72
      drawLiquidPanel(doc, MARGIN, yPos, CONTENT_WIDTH, empBoxH)
      kvRow(doc, 'Nombre:', employeeName, MARGIN + PAD, yPos + 12)
      kvRow(
        doc,
        'Código:',
        input.employee_code?.trim() || '—',
        MARGIN + PAD,
        yPos + 28
      )
      kvRow(doc, 'Identidad (DNI):', input.employee_dni?.trim() || '—', MARGIN + PAD, yPos + 44)
      if (input.department || input.position) {
        const deptPos = [input.department, input.position].filter(Boolean).join(' · ')
        kvRow(doc, 'Puesto / Depto:', deptPos || '—', MARGIN + PAD, yPos + 56)
      }
      yPos += empBoxH + 16

      // Plan
      drawLiquidSectionTitle(doc, 'Detalle del plan', MARGIN, yPos)
      yPos += 16
      const planBoxH = 110
      drawLiquidPanel(doc, MARGIN, yPos, CONTENT_WIDTH, planBoxH)
      kvRow(doc, 'Concepto:', concept, MARGIN + PAD, yPos + 12)
      kvRow(doc, 'Monto total:', formatCurrency(montoTotal), MARGIN + PAD, yPos + 28)
      kvRow(doc, 'Monto por plazo:', formatCurrency(montoPorPlazo), MARGIN + PAD, yPos + 44)
      kvRow(doc, 'Número de plazos:', String(plazos), MARGIN + PAD, yPos + 60)
      kvRow(doc, 'Fecha de inicio:', formatPlanDate(input.fecha_inicio), MARGIN + PAD, yPos + 76)
      if (input.fecha_fin) {
        kvRow(doc, 'Fecha de fin:', formatPlanDate(input.fecha_fin), MARGIN + PAD, yPos + 92)
      }
      yPos += planBoxH + 18

      // Texto de autorización
      drawLiquidSectionTitle(doc, 'Declaración y autorización', MARGIN, yPos)
      yPos += 16

      const authText =
        `Por medio del presente documento, yo ${employeeName}, empleado(a) de ${companyName}, ` +
        `declaro conocer y aceptar el plan de deducción por concepto de «${concept}» por un monto total de ` +
        `${formatCurrency(montoTotal)}, el cual será descontado de mi salario en ${plazos} plazo(s) de ` +
        `${formatCurrency(montoPorPlazo)} cada uno, a partir de ${formatPlanDate(input.fecha_inicio)}, ` +
        `en el día de pago correspondiente a cada período de nómina.\n\n` +
        `Autorizo expresamente a ${companyName} a realizar dichos descuentos mediante nómina hasta completar ` +
        `el monto total indicado, o hasta la cancelación del plan conforme a las políticas de la empresa.\n\n` +
        `Asimismo, confirmo haber recibido o solicitado el beneficio/concepto objeto de este plan, ` +
        `según corresponda a la naturaleza de «${concept}».`

      doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyText)
      const textHeight = doc.heightOfString(authText, {
        width: CONTENT_WIDTH,
        align: 'justify',
      })
      doc.text(authText, MARGIN, yPos, {
        width: CONTENT_WIDTH,
        align: 'justify',
      })
      yPos += textHeight + 28

      // Firmas
      drawLiquidSectionTitle(doc, 'Firmas', MARGIN, yPos)
      yPos += 18

      const sigBoxW = (CONTENT_WIDTH - 16) / 2
      const sigBoxH = 56

      doc.font('Helvetica').fontSize(8.5).fillColor(PDF.bodyMuted)
      doc.text('Firma del empleado', MARGIN, yPos, { lineBreak: false })
      doc.text('Fecha', MARGIN + sigBoxW + 16, yPos, { lineBreak: false })
      drawLiquidPanel(doc, MARGIN, yPos + 12, sigBoxW, sigBoxH, { fill: PDF.white, radius: 6 })
      drawLiquidPanel(doc, MARGIN + sigBoxW + 16, yPos + 12, sigBoxW, sigBoxH, {
        fill: PDF.white,
        radius: 6,
      })
      yPos += 12 + sigBoxH + 20

      doc.font('Helvetica').fontSize(8.5).fillColor(PDF.bodyMuted)
      doc.text('Firma de la empresa / autorizado', MARGIN, yPos, { lineBreak: false })
      doc.text('Testigo (opcional)', MARGIN + sigBoxW + 16, yPos, { lineBreak: false })
      drawLiquidPanel(doc, MARGIN, yPos + 12, sigBoxW, sigBoxH, { fill: PDF.white, radius: 6 })
      drawLiquidPanel(doc, MARGIN + sigBoxW + 16, yPos + 12, sigBoxW, sigBoxH, {
        fill: PDF.white,
        radius: 6,
      })
      yPos += 12 + sigBoxH + 24

      doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyMuted)
      doc.text(
        'Documento generado para firma manuscrita. No constituye firma electrónica.',
        MARGIN,
        yPos,
        { width: CONTENT_WIDTH, align: 'left', lineBreak: false }
      )

      const footerY = PAGE_HEIGHT - 36
      doc.fontSize(7).fillColor(PDF.footerMuted).text(
        `Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`,
        MARGIN,
        footerY - 14,
        { align: 'center', width: CONTENT_WIDTH, lineBreak: false }
      )
      drawLiquidFooter(doc, 'Humano SISU · Sistema Hondureño de Recursos Humanos', {
        y: footerY,
        fontSize: 7,
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
