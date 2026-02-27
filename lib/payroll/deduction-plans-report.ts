import { Buffer } from 'buffer'
import { formatDateForHonduras, nowInHonduras } from '../timezone'

export interface DeductionPlanPDFItem {
  field_key: string
  field_label: string
  employee_name: string
  employee_code?: string
  activo: boolean
  monto_total: number
  plazos_totales: number
  plazos_aplicados: number
  plazos_restantes: number
  fecha_inicio: string
  fecha_fin: string | null
}

/**
 * Generates a PDF report of employee deduction plans.
 * Returns a Buffer that can be sent as application/pdf.
 */
export async function generateDeductionPlansReportPDF(
  plans: DeductionPlanPDFItem[],
  companyName?: string,
  generatedByEmail?: string
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const formatCurrency = (n: number) =>
        `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const formatDate = (d: string | null) =>
        d ? formatDateForHonduras(d) : '-'

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
        info: {
          Title: 'Reporte de Planes de Deducción',
          Author: 'Sistema Hondureño de Recursos Humanos',
          Subject: 'Planes de Deducción',
          Keywords: 'deducciones, planes, nómina, Honduras',
          Creator: 'HR SaaS System'
        }
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => {
        try {
          const pdf = Buffer.concat(buffers)
          resolve(pdf)
        } catch (e) {
          reject(e)
        }
      })

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height

      // Header (coherente con payroll)
      doc.rect(0, 0, pageWidth, 90).fill('#0b4fa1')
      doc.fillColor('white')
      doc.fontSize(22).text(
        companyName || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS',
        30,
        20,
        { align: 'center', width: pageWidth - 60 }
      )
      doc.fontSize(13).text('Reporte de Planes de Deducción', 30, 46, {
        align: 'center',
        width: pageWidth - 60
      })
      doc.fontSize(12).text(
        `Generado: ${formatDateForHonduras(nowInHonduras())}`,
        30,
        66,
        { align: 'center', width: pageWidth - 60 }
      )

      doc.fillColor('#0f172a')
      doc.fontSize(11).text('INFORMACIÓN DEL REPORTE:', 30, 110)
      doc.fontSize(10).text(
        `Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`,
        30,
        126
      )
      if (generatedByEmail) {
        doc.fontSize(10).text(`Generado por: ${generatedByEmail}`, 30, 142)
      }

      // Resumen ejecutivo
      const totalPlans = plans.length
      const activos = plans.filter((p) => p.activo).length
      const inactivos = totalPlans - activos
      const empleadosUnicos = new Set(plans.map((p) => p.employee_name)).size
      const totalMonto = plans.reduce((s, p) => s + p.monto_total, 0)

      doc.rect(30, 170, pageWidth - 60, 90).stroke()
      doc.fontSize(12).text('RESUMEN EJECUTIVO', 40, 180)
      doc.fontSize(9).text('Total planes:', 45, 200)
      doc.fontSize(9).text(String(totalPlans), 200, 200)
      doc.fontSize(9).text('Activos:', 45, 216)
      doc.fontSize(9).text(String(activos), 200, 216)
      doc.fontSize(9).text('Inactivos:', 45, 232)
      doc.fontSize(9).text(String(inactivos), 200, 232)
      doc.fontSize(9).text('Empleados con planes:', 45, 248)
      doc.fontSize(9).text(String(empleadosUnicos), 200, 248)
      doc.fontSize(9).text('Monto total (planes activos):', 360, 200)
      doc.fontSize(9).text(formatCurrency(totalMonto), 520, 200)

      if (plans.length === 0) {
        doc.fontSize(10).text('No hay planes de deducción registrados.', 30, 290)
        doc.end()
        return
      }

      // Tabla de planes
      doc.addPage({ size: 'A4', layout: 'landscape' })
      const tableStartY = 30
      const rowHeight = 14
      const colWidths = [70, 90, 35, 55, 45, 55, 55, 50, 50]
      const headers = [
        'Tipo',
        'Empleado',
        'Activa',
        'Monto total',
        'Cuotas',
        'Aplicadas',
        'Restantes',
        'Inicio',
        'Fin'
      ]
      const startX = 40
      let y = tableStartY

      // Header row
      headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#0b4fa1', '#0f172a')
        doc.fillColor('white')
        doc.fontSize(7).text(h, x + 2, y + 3, { width: colWidths[i] - 4, align: 'center' })
        doc.fillColor('#0f172a')
      })
      y += rowHeight

      plans.forEach((p) => {
        if (y > pageHeight - 50) {
          doc.addPage({ size: 'A4', layout: 'landscape' })
          y = 30
        }

        const rowData = [
          p.field_label || p.field_key.replace(/_/g, ' '),
          `${p.employee_name}${p.employee_code ? ` (${p.employee_code})` : ''}`.slice(0, 25),
          p.activo ? 'Sí' : 'No',
          formatCurrency(p.monto_total),
          String(p.plazos_totales),
          String(p.plazos_aplicados ?? 0),
          String(p.plazos_restantes ?? p.plazos_totales - (p.plazos_aplicados ?? 0)),
          formatDate(p.fecha_inicio),
          formatDate(p.fecha_fin)
        ]

        rowData.forEach((cell, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, y, colWidths[i], rowHeight).stroke()
          doc.fontSize(7).text(String(cell).slice(0, 20), x + 2, y + 3, {
            width: colWidths[i] - 4,
            ellipsis: true
          })
        })
        y += rowHeight
      })

      doc.end()
    } catch (error: unknown) {
      reject(error)
    }
  })
}
