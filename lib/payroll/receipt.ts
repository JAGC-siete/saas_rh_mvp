import { Buffer } from 'buffer'
import { formatDateTimeForHonduras, nowInHonduras } from '../timezone'



export interface EmployeeReceiptInput {
  employee_code?: string
  employee_name?: string
  department?: string
  position?: string
  period_start: string
  period_end: string
  days_worked: number
  base_salary: number
  income_tax: number
  professional_tax: number
  social_security: number
  total_deductions: number
  net_salary: number
  bank_name?: string
  bank_account?: string
}

export async function generateEmployeeReceiptPDF(
  record: EmployeeReceiptInput,
  periodo: string,
  quincena: number,
  companyName?: string
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 30,
        info: {
          Title: `Recibo de Nómina - ${record.employee_name || 'Empleado'} - ${periodo} Q${quincena}`,
          Author: 'Sistema Hondureño de Recursos Humanos',
          Subject: 'Recibo de Nómina Individual',
          Keywords: 'recibo, nómina, empleado, Paragon, Honduras',
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

      // Header
      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      doc.rect(0, 0, pageWidth, 80).fill('#0b4fa1')
      doc.fillColor('white')
      doc.fontSize(18).text(companyName || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS', 30, 16, { align: 'center', width: 535 })
      doc.fontSize(12).text('Recibo de Nómina Quincenal', 30, 38, { align: 'center', width: 535 })
      doc.fontSize(11).text(`${periodo} • Quincena ${quincena}`, 30, 56, { align: 'center', width: 535 })
      doc.fillColor('#0f172a')

      // Footer SISU (usar límites reales de la página)
      const footerY = pageHeight - 24
      doc.fontSize(8).fillColor('#64748b').text('SISU: Sistema Hondureño de Recursos Humanos', 30, footerY, { align: 'center', width: pageWidth - 60 })

      // Employee info
      doc.fontSize(12).text('INFORMACIÓN DEL EMPLEADO:', 30, 100)
      doc.rect(30, 115, pageWidth - 60, 60).stroke()
      doc.fontSize(10).text('Código:', 40, 125)
      doc.fontSize(10).text(record.employee_code || 'N/A', 120, 125)
      doc.fontSize(10).text('Nombre:', 40, 140)
      doc.fontSize(10).text(record.employee_name || 'N/A', 120, 140)
      doc.fontSize(10).text('Departamento:', 40, 155)
      doc.fontSize(10).text(record.department || 'N/A', 120, 155)
      doc.fontSize(10).text('Posición:', 300, 125)
      doc.fontSize(10).text(record.position || 'N/A', 380, 125)
      doc.fontSize(10).text('Período:', 300, 140)
      doc.fontSize(10).text(`${record.period_start} - ${record.period_end}`, 380, 140)
      doc.fontSize(10).text('Días Trabajados:', 300, 155)
      doc.fontSize(10).text(record.days_worked.toString(), 380, 155)

      // Earnings
      doc.fontSize(12).text('DETALLE DE INGRESOS:', 30, 200)
      doc.rect(30, 215, 535, 40).stroke()
      doc.fontSize(10).text('Concepto:', 40, 225)
      doc.fontSize(10).text('Monto:', 400, 225)
      doc.fontSize(10).text('Salario Base (Quincenal):', 40, 240)
      doc.fontSize(10).text(formatHNL(record.base_salary), 400, 240)

      // Deductions
      doc.fontSize(12).text('DETALLE DE DEDUCCIONES:', 30, 280)
      doc.rect(30, 295, 535, 80).stroke()
      doc.fontSize(10).text('Concepto:', 40, 305)
      doc.fontSize(10).text('Monto:', 400, 305)
      doc.fontSize(10).text('IHSS:', 40, 320)
      doc.fontSize(10).text(formatHNL(record.social_security), 400, 320)
      doc.fontSize(10).text('RAP:', 40, 335)
      doc.fontSize(10).text(formatHNL(record.professional_tax), 400, 335)
      doc.fontSize(10).text('ISR:', 40, 350)
      doc.fontSize(10).text(formatHNL(record.income_tax), 400, 350)
      doc.fontSize(10).text('Total Deducciones:', 40, 365)
      doc.fontSize(10).text(formatHNL(record.total_deductions), 400, 365)

      // Summary
      doc.fontSize(12).text('RESUMEN FINAL:', 30, 400)
      doc.rect(30, 415, pageWidth - 60, 40).fillAndStroke('#f3f4f6', '#0f172a')
      doc.fontSize(12).text('TOTAL A RECIBIR:', 40, 425)
      doc.fontSize(14).text(formatHNL(record.net_salary), 400, 425, { align: 'right' })

      // Bank
      doc.fontSize(12).text('INFORMACIÓN BANCARIA:', 30, 480)
      doc.rect(30, 495, pageWidth - 60, 40).stroke()
      doc.fontSize(10).text('Banco:', 40, 505)
      doc.fontSize(10).text(record.bank_name || 'No especificado', 120, 505)
      doc.fontSize(10).text('Número de Cuenta:', 40, 520)
      doc.fontSize(10).text(record.bank_account || 'No especificado', 120, 520)
      doc.fontSize(10).text('Monto a Transferir:', 300, 505)
      doc.fontSize(10).text(formatHNL(record.net_salary), 400, 505)

      // Notes & signatures
      doc.fontSize(10).text('NOTAS:', 30, 560)
      doc.fontSize(9).text('• Este recibo es un documento oficial emitido por la empresa.', 30, 575)
      doc.fontSize(9).text('• Los montos están calculados según la legislación laboral de Honduras.', 30, 590)
      doc.fontSize(9).text('• Para consultas, contactar al departamento de recursos humanos.', 30, 605)
      doc.fontSize(10).text('Firma del Empleado:', 30, 650)
      doc.rect(30, 665, 200, 30).stroke()
      doc.fontSize(10).text('Firma del Autorizado:', 300, 650)
      doc.rect(300, 665, 200, 30).stroke()
      // Fecha de generación cerca del footer
      doc.fontSize(8).fillColor('#64748b').text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 30, footerY - 14, { align: 'center', width: pageWidth - 60 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

