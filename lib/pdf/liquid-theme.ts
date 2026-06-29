/**
 * PDFKit theme — Infraestructura Líquida (static mesh/glass approximation for print).
 */

import { LIQUID } from '../brand/liquid-tokens'

export const PDF = {
  headerBg: LIQUID.brand900,
  headerBgDeep: LIQUID.bgStart,
  headerText: '#ffffff',
  bodyText: LIQUID.ink,
  bodyMuted: LIQUID.inkMuted,
  bodyMutedLight: LIQUID.textMuted,
  panelBg: LIQUID.panelBg,
  panelBgAlt: LIQUID.panelBgAlt,
  panelBorder: LIQUID.panelBorder,
  accent: LIQUID.brand500,
  accentDark: LIQUID.brand900,
  success: LIQUID.successDark,
  successBg: '#ecfdf5',
  successBorder: LIQUID.success,
  successText: '#047857',
  tableHeader: LIQUID.brand900,
  tableHeaderText: '#ffffff',
  tableStripe: '#f1f5f9',
  tableBorder: LIQUID.panelBorder,
  primaryDefault: LIQUID.brand900,
  footerMuted: LIQUID.textMuted,
  white: '#ffffff',
} as const

export const PDF_TYPE = {
  brand: 20,
  ref: 8.5,
  section: 9,
  label: 7,
  value: 9,
  body: 8,
  price: 20,
  savings: 8,
  footnote: 6.5,
  bankMono: 8,
} as const

type PdfDoc = PDFKit.PDFDocument

/** Dark brand header band. Returns Y position for body content. */
export function drawLiquidPdfHeader(
  doc: PdfDoc,
  options: { title: string; subtitle?: string; tagline?: string; height?: number }
): number {
  const pageWidth = doc.page.width
  const h = options.height ?? 80

  doc.rect(0, 0, pageWidth, h).fill(PDF.headerBg)
  doc.fillColor(PDF.headerText)

  const tagline = options.tagline ?? 'Humano SISU'
  doc.fontSize(18).text(tagline.toUpperCase(), 30, 14, { align: 'center', width: pageWidth - 60 })

  if (options.subtitle) {
    doc.fontSize(10).text(options.subtitle, 30, 36, { align: 'center', width: pageWidth - 60 })
  }

  doc.fontSize(12).text(options.title, 30, options.subtitle ? 52 : 38, {
    align: 'center',
    width: pageWidth - 60,
  })

  doc.fillColor(PDF.bodyText)
  return h + 20
}

export function drawLiquidSectionTitle(doc: PdfDoc, text: string, x: number, y: number): void {
  doc.fillColor(PDF.accentDark).font('Helvetica-Bold').fontSize(11).text(text.toUpperCase(), x, y)
  doc.fillColor(PDF.bodyText)
}

export function drawLiquidPanel(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { fill?: string; stroke?: string; radius?: number }
): void {
  const fill = options?.fill ?? PDF.panelBg
  const stroke = options?.stroke ?? PDF.panelBorder
  const radius = options?.radius ?? 8
  doc.roundedRect(x, y, w, h, radius).fill(fill)
  doc.roundedRect(x, y, w, h, radius).lineWidth(0.8).stroke(stroke)
}

export function drawLiquidHighlightBox(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { variant?: 'success' | 'neutral' }
): void {
  const variant = options?.variant ?? 'success'
  if (variant === 'success') {
    doc.rect(x, y, w, h).fill(PDF.successBg).stroke(PDF.successBorder)
  } else {
    drawLiquidPanel(doc, x, y, w, h)
  }
}

export function drawLiquidTableHeader(
  doc: PdfDoc,
  x: number,
  y: number,
  colWidths: number[],
  labels: string[],
  rowHeight: number
): void {
  let cx = x
  for (let i = 0; i < labels.length; i++) {
    doc.rect(cx, y, colWidths[i], rowHeight).fillAndStroke(PDF.tableHeader, PDF.bodyText)
    doc.fillColor(PDF.tableHeaderText).font('Helvetica-Bold').fontSize(8)
    doc.text(labels[i], cx + 4, y + 4, { width: colWidths[i] - 8 })
    cx += colWidths[i]
  }
  doc.fillColor(PDF.bodyText).font('Helvetica')
}

export const PDF_FOOTER_RESERVE = 44

export function drawLiquidFooter(
  doc: PdfDoc,
  text: string,
  options?: { y?: number; fontSize?: number }
): void {
  const pageWidth = doc.page.width
  const pageHeight = doc.page.height
  const y = options?.y ?? pageHeight - 40
  const fontSize = options?.fontSize ?? 8

  doc.fontSize(fontSize).fillColor(PDF.footerMuted).text(text, 30, y, {
    align: 'center',
    width: pageWidth - 60,
  })
  doc.fillColor(PDF.bodyText)
}

/** Stamp generation date + brand line on every page (multi-page reports). */
export function registerLiquidPageFooter(
  doc: PdfDoc,
  options: { brandLine?: string; generatedAt?: string }
): void {
  const brandLine = options.brandLine ?? 'Humano SISU · Sistema Hondureño de Recursos Humanos'
  const generatedAt = options.generatedAt
  let painting = false

  const paint = () => {
    if (painting) return
    painting = true
    try {
      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const margin = 30
      // Stay above PDFKit's bottom margin to avoid auto page-break → pageAdded recursion.
      const footerY = pageHeight - PDF_FOOTER_RESERVE
      const contentWidth = pageWidth - margin * 2

      if (generatedAt) {
        doc.fontSize(7).fillColor(PDF.footerMuted).text(`Fecha de generación: ${generatedAt}`, margin, footerY - 12, {
          align: 'center',
          width: contentWidth,
          lineBreak: false,
        })
      }
      drawLiquidFooter(doc, brandLine, { y: footerY, fontSize: 7 })
    } finally {
      painting = false
    }
  }

  doc.on('pageAdded', () => paint())
  paint()
}

export function drawLiquidTableRowBackground(
  doc: PdfDoc,
  x: number,
  y: number,
  width: number,
  height: number,
  rowIndex: number
): void {
  doc.rect(x, y, width, height).fill(rowIndex % 2 === 1 ? PDF.tableStripe : PDF.white)
}

export function strokeLiquidTableCells(
  doc: PdfDoc,
  x: number,
  y: number,
  colWidths: number[],
  height: number
): void {
  let cx = x
  for (const w of colWidths) {
    doc.rect(cx, y, w, height).lineWidth(0.5).stroke(PDF.panelBorder)
    cx += w
  }
}

export function defaultPdfPrimaryColor(override?: string): string {
  if (override && /^#[0-9A-Fa-f]{6}$/.test(override)) return override
  return PDF.primaryDefault
}

/** Branded payroll receipt header (company name or logo + period). */
export function drawBrandedReceiptHeader(
  doc: PdfDoc,
  options: {
    primaryColor: string
    companyName: string
    title?: string
    subtitle: string
    logoBuffer?: Buffer | null
  }
): number {
  const pageWidth = doc.page.width
  const margin = 30
  const contentWidth = pageWidth - margin * 2
  const hasLogo = !!options.logoBuffer
  const h = hasLogo ? 78 : 74
  const title = options.title ?? 'Recibo de Nómina'

  doc.rect(0, 0, pageWidth, h).fill(options.primaryColor)
  doc.rect(0, h - 3, pageWidth, 3).fill(PDF.accent)
  doc.fillColor(PDF.headerText)

  if (hasLogo && options.logoBuffer) {
    doc.image(options.logoBuffer, pageWidth / 2 - 42, 8, { fit: [84, 38], align: 'center' })
    doc.font('Helvetica-Bold').fontSize(11).text(title, margin, 48, {
      align: 'center',
      width: contentWidth,
      lineBreak: false,
    })
    doc.font('Helvetica').fontSize(9).fillColor('#bfdbfe').text(options.subtitle, margin, 62, {
      align: 'center',
      width: contentWidth,
      lineBreak: false,
    })
  } else {
    doc.font('Helvetica-Bold').fontSize(15).text(options.companyName, margin, 14, {
      align: 'center',
      width: contentWidth,
      lineBreak: false,
    })
    doc.font('Helvetica').fontSize(11).text(title, margin, 36, {
      align: 'center',
      width: contentWidth,
      lineBreak: false,
    })
    doc.fontSize(9).fillColor('#bfdbfe').text(options.subtitle, margin, 52, {
      align: 'center',
      width: contentWidth,
      lineBreak: false,
    })
  }

  doc.fillColor(PDF.bodyText).font('Helvetica')
  return h + 18
}
