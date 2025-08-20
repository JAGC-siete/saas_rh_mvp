import { Buffer } from 'buffer'

export interface PlanillaItem {
  id: string
  name: string
  bank: string
  bank_account: string
  department: string
  monthly_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  total_earnings: number
  IHSS: number
  RAP: number
  ISR: number
  total_deductions: number
  total: number
  notes_on_ingress?: string
  notes_on_deductions?: string
}

/**
 * Generates a consolidated payroll PDF (3 pages: executive summary, payroll table, bank details)
 * Returns a Buffer that can be sent as application/pdf
 */
export async function generateConsolidatedPayrollPDF(
  planilla: PlanillaItem[],
  periodo: string,
  quincena: number,
  generatedByEmail?: string
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 30,
        info: {
          Title: `Planilla Quincenal - ${periodo} Q${quincena}`,
          Author: 'Sistema de Recursos Humanos',
          Subject: 'Nómina Quincenal',
          Keywords: 'nómina, planilla, Paragon, Honduras',
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

      // ===== PAGE 1: HEADER & EXEC SUMMARY =====
      doc.rect(0, 0, 595, 100).fill('#1e40af')
      doc.fillColor('white')
      doc.fontSize(24).text('PARAGON HONDURAS', 30, 20, { align: 'center', width: 535 })
      doc.fontSize(16).text('Sistema de Recursos Humanos', 30, 50, { align: 'center', width: 535 })
      doc.fontSize(14).text(`PLANILLA QUINCENAL - ${periodo} Q${quincena}`, 30, 75, { align: 'center', width: 535 })

      doc.fillColor('black')
      doc.fontSize(10).text('INFORMACIÓN DE LA EMPRESA:', 30, 120)
      doc.fontSize(9).text('Paragon Honduras', 30, 135)
      doc.fontSize(9).text('Dirección: Tegucigalpa, Honduras', 30, 150)
      doc.fontSize(9).text('Teléfono: +504 XXXX-XXXX', 30, 165)
      doc.fontSize(9).text('Email: info@paragonhonduras.com', 30, 180)

      doc.fontSize(10).text('INFORMACIÓN DEL PERÍODO:', 300, 120)
      doc.fontSize(9).text(`Período: ${periodo}`, 300, 135)
      doc.fontSize(9).text(`Quincena: ${quincena === 1 ? 'Primera (1-15)' : 'Segunda (16-fin de mes)'}`, 300, 150)
      doc.fontSize(9).text(`Fecha de generación: ${new Date().toLocaleDateString('es-HN')}`, 300, 165)
      if (generatedByEmail) {
        doc.fontSize(9).text(`Generado por: ${generatedByEmail}`, 300, 180)
      }

      const totalGross = planilla.reduce((sum, row) => sum + row.total_earnings, 0)
      const totalDeductions = planilla.reduce((sum, row) => sum + row.total_deductions, 0)
      const totalNet = planilla.reduce((sum, row) => sum + row.total, 0)
      const totalEmployees = planilla.length

      doc.rect(30, 200, 535, 80).stroke()
      doc.fontSize(12).text('RESUMEN EJECUTIVO', 35, 210)
      doc.fontSize(10).text('Total Empleados:', 40, 230)
      doc.fontSize(10).text(totalEmployees.toString(), 200, 230)
      doc.fontSize(10).text('Total Salario Bruto:', 40, 245)
      doc.fontSize(10).text(`L. ${totalGross.toFixed(2)}`, 200, 245)
      doc.fontSize(10).text('Total Deducciones:', 40, 260)
      doc.fontSize(10).text(`L. ${totalDeductions.toFixed(2)}`, 200, 260)
      doc.fontSize(10).text('Total Salario Neto:', 40, 275)
      doc.fontSize(10).text(`L. ${totalNet.toFixed(2)}`, 200, 275)

      const deptTotals: { [key: string]: { count: number, gross: number, net: number } } = {}
      planilla.forEach((row) => {
        const dept = row.department || 'Sin Departamento'
        if (!deptTotals[dept]) {
          deptTotals[dept] = { count: 0, gross: 0, net: 0 }
        }
        deptTotals[dept].count++
        deptTotals[dept].gross += row.total_earnings
        deptTotals[dept].net += row.total
      })
      doc.fontSize(10).text('TOTALES POR DEPARTAMENTO:', 300, 230)
      let deptY = 245
      Object.entries(deptTotals).forEach(([dept, totals]) => {
        if (deptY < 275) {
          doc.fontSize(9).text(`${dept}: ${totals.count} emp. - L. ${totals.net.toFixed(2)}`, 300, deptY)
          deptY += 12
        }
      })

      // ===== PAGE 2: PAYROLL TABLE =====
      doc.addPage()
      doc.fontSize(14).text('DETALLE DE NÓMINA POR EMPLEADO', 30, 30, { align: 'center', width: 535 })

      const headers = ['Código', 'Nombre', 'Departamento', 'Días Trab.', 'Salario Base', 'Devengado', 'IHSS', 'RAP', 'ISR', 'Deducciones', 'Neto']
      const colWidths = [40, 80, 60, 35, 50, 50, 35, 35, 35, 50, 50]
      const startX = 30
      let y = 70
      const rowHeight = 15

      headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        doc.fillColor('black')
      })
      y += rowHeight

      let pageCount = 1
      planilla.forEach((row) => {
        if (y > 750) {
          doc.addPage()
          y = 30
          pageCount++
          doc.fontSize(10).text(`Página ${pageCount} - Continuación`, 30, 15)
        }
        const values = [
          row.id || '',
          row.name,
          row.department,
          row.days_worked.toString(),
          `L. ${row.monthly_salary.toFixed(2)}`,
          `L. ${row.total_earnings.toFixed(2)}`,
          `L. ${row.IHSS.toFixed(2)}`,
          `L. ${row.RAP.toFixed(2)}`,
          `L. ${row.ISR.toFixed(2)}`,
          `L. ${row.total_deductions.toFixed(2)}`,
          `L. ${row.total.toFixed(2)}`
        ]
        values.forEach((val, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, y, colWidths[i], rowHeight).stroke()
          doc.fontSize(7).text(val.toString(), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        })
        y += rowHeight
      })

      y += 5
      doc.rect(startX, y, 535, rowHeight).fillAndStroke('#f3f4f6', '#000')
      doc.fontSize(9).text('TOTALES:', startX + 5, y + 4)
      doc.fontSize(9).text(`L. ${totalGross.toFixed(2)}`, startX + 200, y + 4)
      doc.fontSize(9).text(`L. ${totalDeductions.toFixed(2)}`, startX + 350, y + 4)
      doc.fontSize(9).text(`L. ${totalNet.toFixed(2)}`, startX + 450, y + 4)

      // ===== PAGE 3: BANK DETAILS & NOTES =====
      doc.addPage()
      doc.fontSize(14).text('INFORMACIÓN BANCARIA Y NOTAS', 30, 30, { align: 'center', width: 535 })

      doc.fontSize(10).text('DETALLE BANCARIO PARA TRANSFERENCIAS:', 30, 60)
      const bankHeaders = ['Código', 'Nombre', 'Banco', 'Cuenta', 'Monto Neto']
      const bankColWidths = [40, 120, 80, 100, 80]
      const bankStartX = 30
      let bankY = 80
      const bankRowHeight = 15

      bankHeaders.forEach((h, i) => {
        const x = bankStartX + bankColWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, bankY, bankColWidths[i], bankRowHeight).fillAndStroke('#1e40af', '#000')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, bankY + 4, { width: bankColWidths[i] - 4, align: 'center' })
        doc.fillColor('black')
      })
      bankY += bankRowHeight

      planilla.forEach((row) => {
        if (bankY > 750) {
          doc.addPage()
          bankY = 30
        }
        const bankValues = [
          row.id || '',
          row.name,
          row.bank || 'No especificado',
          row.bank_account || 'No especificado',
          `L. ${row.total.toFixed(2)}`
        ]
        bankValues.forEach((val, i) => {
          const x = bankStartX + bankColWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, bankY, bankColWidths[i], bankRowHeight).stroke()
          doc.fontSize(8).text(val.toString(), x + 2, bankY + 4, { width: bankColWidths[i] - 4, align: 'center' })
        })
        bankY += bankRowHeight
      })

      doc.fontSize(10).text('NOTAS IMPORTANTES:', 30, bankY + 20)
      doc.fontSize(9).text('• Esta planilla ha sido generada automáticamente por el sistema de recursos humanos.', 30, bankY + 35)
      doc.fontSize(9).text('• Los montos están calculados según la legislación laboral de Honduras.', 30, bankY + 50)
      doc.fontSize(9).text('• Las deducciones incluyen: IHSS, RAP, ISR (según tabla progresiva).', 30, bankY + 65)
      doc.fontSize(9).text('• Verificar que la información bancaria sea correcta antes de procesar pagos.', 30, bankY + 80)
      doc.fontSize(9).text('• Para consultas, contactar al departamento de recursos humanos.', 30, bankY + 95)

      doc.fontSize(8).text('Documento generado automáticamente - Paragon Honduras - Sistema de Recursos Humanos', 30, 800, { align: 'center', width: 535 })
      doc.fontSize(8).text(`Fecha de generación: ${new Date().toLocaleString('es-HN')}`, 30, 815, { align: 'center', width: 535 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

