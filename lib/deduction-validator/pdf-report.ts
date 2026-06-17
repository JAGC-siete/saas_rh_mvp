import { Buffer } from 'buffer'
import { PDF, drawLiquidPdfHeader } from '../pdf/liquid-theme'

export interface DeductionReportData {
  salary: number
  grossSalary: number
  monthlyGrossSalary: number
  paymentModality: 'quincenal' | 'mensual'
  year: number
  ihss: number
  ihssPercentage: number
  rap: number
  rapPercentage: number
  isr: number
  isrPercentage: number
  totalDeductions: number
  netSalary: number
  constants: {
    minimumWage: number
    ihssCeiling: number
  }
}

export async function generateDeductionReportPDF(
  data: DeductionReportData
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const formatHNL = (n: number) => 
        `L. ${Number(n || 0).toLocaleString('es-HN', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 30,
        info: {
          Title: `Reporte de Deducciones de Nómina - ${data.year} - Humano SISU`,
          Author: 'Humano SISU',
          Subject: 'Reporte de Validación de Deducciones',
          Keywords: 'deducciones, nómina, IHSS, RAP, ISR, Honduras',
          Creator: 'Humano SISU - Calculadora de Deducciones'
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

      let yPos = drawLiquidPdfHeader(doc, {
        title: 'Reporte de Validación de Deducciones de Nómina',
        subtitle: 'Sistema de Recursos Humanos — Honduras',
      })

      // Información del cálculo
      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      doc.fontSize(12).fillColor(PDF.bodyText).text('INFORMACIÓN DEL CÁLCULO:', 30, yPos)
      yPos += 20
      doc.rect(30, yPos, pageWidth - 60, 70).stroke(PDF.panelBorder)
      
      doc.fontSize(10).fillColor(PDF.bodyText)
      doc.text('Modalidad de Pago:', 40, yPos + 8)
      doc.text(data.paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual', 180, yPos + 8)
      
      doc.text('Año Fiscal:', 40, yPos + 24)
      doc.text(data.year.toString(), 180, yPos + 24)
      
      doc.text('Salario Bruto:', 40, yPos + 40)
      doc.text(formatHNL(data.grossSalary), 180, yPos + 40)
      
      if (data.paymentModality === 'quincenal') {
        doc.text('Salario Mensual Equivalente:', 300, yPos + 8)
        doc.text(formatHNL(data.monthlyGrossSalary), 480, yPos + 8)
      }

      // Constantes fiscales
      yPos += 85
      doc.fontSize(10).fillColor(PDF.bodyMuted)
      doc.text(`Salario Mínimo (${data.year}): ${formatHNL(data.constants.minimumWage)}`, 40, yPos)
      doc.text(`Tope IHSS (${data.year}): ${formatHNL(data.constants.ihssCeiling)}`, 300, yPos)

      // Resumen de resultados
      yPos += 25
      doc.fontSize(12).fillColor(PDF.bodyText).text('RESUMEN DE RESULTADOS:', 30, yPos)
      yPos += 20

      // Salario neto destacado
      doc.rect(30, yPos, pageWidth - 60, 35).fill(PDF.successBg).stroke(PDF.successBorder)
      doc.fontSize(11).fillColor(PDF.successText).text('SALARIO NETO', 40, yPos + 8)
      doc.fontSize(16).fillColor(PDF.success).text(formatHNL(data.netSalary), 40, yPos + 20)

      // Desglose de deducciones
      yPos += 50
      doc.fontSize(12).fillColor(PDF.bodyText).text('DESGLOSE DE DEDUCCIONES:', 30, yPos)
      yPos += 20

      // Tabla de deducciones
      const deductionsTable = [
        { label: 'IHSS', description: 'Instituto Hondureño de Seguridad Social', amount: data.ihss, percentage: data.ihssPercentage },
        { label: 'RAP', description: 'Régimen de Ahorro para Pensiones', amount: data.rap, percentage: data.rapPercentage },
        { label: 'ISR', description: 'Impuesto sobre la Renta', amount: data.isr, percentage: data.isrPercentage }
      ]

      deductionsTable.forEach((ded, index) => {
        if (yPos > pageHeight - 100) {
          doc.addPage()
          yPos = 30
        }

        doc.rect(30, yPos, pageWidth - 60, 35).stroke(PDF.panelBorder)
        doc.fontSize(10).fillColor(PDF.bodyText)
        doc.text(ded.label, 40, yPos + 8)
        doc.fontSize(8).fillColor(PDF.bodyMuted).text(ded.description, 40, yPos + 18)
        doc.fontSize(11).fillColor(PDF.bodyText).text(formatHNL(ded.amount), 450, yPos + 8, { align: 'right', width: 80 })
        doc.fontSize(9).fillColor(PDF.bodyMuted).text(`${ded.percentage.toFixed(2)}%`, 450, yPos + 18, { align: 'right', width: 80 })
        yPos += 40
      })

      // Total de deducciones
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = 30
      }

      doc.rect(30, yPos, pageWidth - 60, 30).fill('#ffebee').stroke('#f44336')
      doc.fontSize(11).fillColor('#c62828').text('TOTAL DE DEDUCCIONES', 40, yPos + 6)
      doc.fontSize(14).fillColor('#b71c1c').text(formatHNL(data.totalDeductions), 450, yPos + 6, { align: 'right', width: 80 })

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      const activarUrl = `${siteUrl}/activar?country=HND&utm_source=calculadora-deducciones-hnd&utm_medium=pdf&utm_campaign=deduction-report`
      const demoWhatsApp = 'https://wa.me/50432226773?text=' + encodeURIComponent(
        'Hola, calculé deducciones en Humano SISU (Honduras) y me gustaría una demo personalizada.'
      )

      const footerHeight = 88
      const footerY = pageHeight - footerHeight
      doc.rect(0, footerY, pageWidth, footerHeight).fill('#f5f5f5')
      doc.fontSize(8).fillColor('#666666').text(
        'Generado por la Calculadora de Deducciones de Humano SISU — mismo motor que la nómina profesional.',
        30,
        footerY + 8,
        { align: 'center', width: 535 }
      )
      doc.fontSize(10).fillColor(PDF.accent).text(
        'Deja de calcular en Excel. Automatiza IHSS, RAP e ISR sin errores.',
        30,
        footerY + 24,
        { align: 'center', width: 535 }
      )
      doc.fontSize(9).fillColor('#1976d2').text(
        `Activar gratis: ${activarUrl}`,
        30,
        footerY + 42,
        { align: 'center', width: 535 }
      )
      doc.fontSize(9).fillColor('#128c7e').text(
        `Agendar demo por WhatsApp: ${demoWhatsApp}`,
        30,
        footerY + 58,
        { align: 'center', width: 535 }
      )

      doc.end()

    } catch (error: any) {
      reject(error)
    }
  })
}

