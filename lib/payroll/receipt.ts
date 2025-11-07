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
  custom_deductions?: Array<{ name: string; amount: number }>
}

export async function generateEmployeeReceiptPDF(
  record: EmployeeReceiptInput,
  periodo: string,
  quincena: number,
  companyId?: string,
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

      // Header - compacto
      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      doc.rect(0, 0, pageWidth, 60).fill('#0b4fa1')
      doc.fillColor('white')
      doc.fontSize(16).text(companyName || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS', 30, 12, { align: 'center', width: 535 })
      doc.fontSize(11).text('Recibo de Nómina Quincenal', 30, 32, { align: 'center', width: 535 })
      doc.fontSize(10).text(`${periodo} • Quincena ${quincena}`, 30, 48, { align: 'center', width: 535 })
      doc.fillColor('#000000') // Texto negro

      // Footer SISU
      const footerY = pageHeight - 20
      doc.fontSize(7).fillColor('#666666').text('SISU: Sistema Hondureño de Recursos Humanos', 30, footerY, { align: 'center', width: pageWidth - 60 })

      // Employee info - compacto
      let yPos = 80
      doc.fontSize(11).fillColor('#000000').text('INFORMACIÓN DEL EMPLEADO:', 30, yPos)
      yPos += 18
      doc.rect(30, yPos, pageWidth - 60, 50).stroke('#000000')
      doc.fontSize(9).fillColor('#000000').text('Código:', 40, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text(record.employee_code || 'N/A', 120, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text('Nombre:', 40, yPos + 22)
      doc.fontSize(9).fillColor('#000000').text(record.employee_name || 'N/A', 120, yPos + 22)
      doc.fontSize(9).fillColor('#000000').text('Departamento:', 40, yPos + 36)
      doc.fontSize(9).fillColor('#000000').text(record.department || 'N/A', 120, yPos + 36)
      doc.fontSize(9).fillColor('#000000').text('Posición:', 300, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text(record.position || 'N/A', 380, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text('Período:', 300, yPos + 22)
      doc.fontSize(9).fillColor('#000000').text(`${record.period_start} - ${record.period_end}`, 380, yPos + 22)
      doc.fontSize(9).fillColor('#000000').text('Días Trabajados:', 300, yPos + 36)
      doc.fontSize(9).fillColor('#000000').text(record.days_worked.toString(), 380, yPos + 36)

      // Earnings - compacto
      yPos += 60
      doc.fontSize(11).fillColor('#000000').text('DETALLE DE INGRESOS:', 30, yPos)
      yPos += 15
      doc.rect(30, yPos, pageWidth - 60, 30).stroke('#000000')
      doc.fontSize(9).fillColor('#000000').text('Concepto:', 40, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text('Monto:', 450, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text('Salario Base (Quincenal):', 40, yPos + 20)
      doc.fontSize(9).fillColor('#000000').text(formatHNL(record.base_salary), 450, yPos + 20, { align: 'right' })

      // Deductions - incluir personalizadas
      yPos += 40
      doc.fontSize(11).fillColor('#000000').text('DETALLE DE DEDUCCIONES:', 30, yPos)
      yPos += 15
      
      // Calcular altura dinámica según número de deducciones
      const customDeductionsCount = record.custom_deductions?.length || 0
      const deductionsHeight = 30 + (customDeductionsCount * 12) + 15 // Base + custom + total
      doc.rect(30, yPos, pageWidth - 60, deductionsHeight).stroke('#000000')
      
      doc.fontSize(9).fillColor('#000000').text('Concepto:', 40, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text('Monto:', 450, yPos + 8)
      
      let deductionY = yPos + 20
      doc.fontSize(9).fillColor('#000000').text('IHSS:', 40, deductionY)
      doc.fontSize(9).fillColor('#000000').text(formatHNL(record.social_security), 450, deductionY, { align: 'right' })
      deductionY += 12
      doc.fontSize(9).fillColor('#000000').text('RAP:', 40, deductionY)
      doc.fontSize(9).fillColor('#000000').text(formatHNL(record.professional_tax), 450, deductionY, { align: 'right' })
      deductionY += 12
      doc.fontSize(9).fillColor('#000000').text('ISR:', 40, deductionY)
      doc.fontSize(9).fillColor('#000000').text(formatHNL(record.income_tax), 450, deductionY, { align: 'right' })
      
      // Custom deductions
      if (record.custom_deductions && record.custom_deductions.length > 0) {
        deductionY += 12
        record.custom_deductions.forEach(ded => {
          doc.fontSize(9).fillColor('#000000').text(ded.name + ':', 40, deductionY)
          doc.fontSize(9).fillColor('#000000').text(formatHNL(ded.amount), 450, deductionY, { align: 'right' })
          deductionY += 12
        })
      }
      
      deductionY += 3
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Total Deducciones:', 40, deductionY)
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text(formatHNL(record.total_deductions), 450, deductionY, { align: 'right' })
      doc.font('Helvetica') // Reset to normal

      // Summary - compacto
      yPos += deductionsHeight + 15
      doc.fontSize(11).fillColor('#000000').text('RESUMEN FINAL:', 30, yPos)
      yPos += 15
      doc.rect(30, yPos, pageWidth - 60, 30).fillAndStroke('#f0f0f0', '#000000')
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('TOTAL A RECIBIR:', 40, yPos + 8)
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text(formatHNL(record.net_salary), 450, yPos + 8, { align: 'right' })
      doc.font('Helvetica') // Reset to normal

      // Bank - compacto
      yPos += 40
      doc.fontSize(11).fillColor('#000000').text('INFORMACIÓN BANCARIA:', 30, yPos)
      yPos += 15
      doc.rect(30, yPos, pageWidth - 60, 35).stroke('#000000')
      doc.fontSize(9).fillColor('#000000').text('Banco:', 40, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text(record.bank_name || 'No especificado', 120, yPos + 8)
      doc.fontSize(9).fillColor('#000000').text('Número de Cuenta:', 40, yPos + 20)
      doc.fontSize(9).fillColor('#000000').text(record.bank_account || 'No especificado', 120, yPos + 20)
      doc.fontSize(9).fillColor('#000000').text('Monto a Transferir:', 300, yPos + 8)
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text(formatHNL(record.net_salary), 450, yPos + 8, { align: 'right' })
      doc.font('Helvetica') // Reset to normal

      // Notes & signatures - compacto
      yPos += 45
      doc.fontSize(9).fillColor('#000000').text('NOTAS:', 30, yPos)
      yPos += 12
      doc.fontSize(8).fillColor('#000000').text('• Este recibo es un documento oficial emitido por la empresa.', 30, yPos)
      yPos += 10
      doc.fontSize(8).fillColor('#000000').text('• Los montos están calculados según la legislación laboral de Honduras.', 30, yPos)
      yPos += 10
      doc.fontSize(8).fillColor('#000000').text('• Para consultas, contactar al departamento de recursos humanos.', 30, yPos)
      
      yPos += 15
      doc.fontSize(9).fillColor('#000000').text('Firma del Empleado:', 30, yPos)
      doc.rect(30, yPos + 12, 200, 25).stroke('#000000')
      doc.fontSize(9).fillColor('#000000').text('Firma del Autorizado:', 300, yPos)
      doc.rect(300, yPos + 12, 200, 25).stroke('#000000')
      
      // Fecha de generación
      doc.fontSize(7).fillColor('#666666').text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 30, footerY - 10, { align: 'center', width: pageWidth - 60 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

