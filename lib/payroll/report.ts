import { Buffer } from 'buffer'
import { formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras } from '../timezone'



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
  metadata?: Record<string, any> // Custom fields metadata
}

/**
 * Custom field definition from payroll config
 */
interface CustomFieldDef {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' | 'calculation_helper'
  required: boolean
  default: any
}

/**
 * Generates a consolidated payroll PDF (3 pages: executive summary, payroll table, bank details)
 * Returns a Buffer that can be sent as application/pdf
 * 
 * NEW: Supports dynamic columns for custom fields based on payroll configuration
 */
export async function generateConsolidatedPayrollPDF(
  planilla: PlanillaItem[],
  periodo: string,
  quincena: number,
  generatedByEmail?: string,
  companyName?: string,
  customFieldsConfig?: Record<string, CustomFieldDef | string>
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
        info: {
          Title: `Planilla Quincenal - ${periodo} Q${quincena}`,
          Author: 'Sistema Hondureño de Recursos Humanos',
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
      const pageWidth = doc.page.width
      doc.rect(0, 0, pageWidth, 90).fill('#0b4fa1')
      doc.fillColor('white')
      doc.fontSize(22).text(companyName || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS', 30, 20, { align: 'center', width: pageWidth - 60 })
      doc.fontSize(13).text('Planilla Quincenal', 30, 46, { align: 'center', width: pageWidth - 60 })
      doc.fontSize(12).text(`${periodo} • Quincena ${quincena}`, 30, 66, { align: 'center', width: pageWidth - 60 })

      // Body base styles
      doc.fillColor('#0f172a')
      doc.fontSize(11).text('INFORMACIÓN DEL PERÍODO:', 30, 110)
      doc.fontSize(10).text(`Período: ${periodo}`, 30, 126)
      doc.fontSize(10).text(`Quincena: ${quincena === 1 ? 'Primera (1-15)' : 'Segunda (16-fin de mes)'}`, 30, 142)
      doc.fontSize(10).text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, 30, 158)
      if (generatedByEmail) {
        doc.fontSize(10).text(`Generado por: ${generatedByEmail}`, 30, 174)
      }

      const totalGross = planilla.reduce((sum, row) => sum + row.total_earnings, 0)
      const totalDeductions = planilla.reduce((sum, row) => sum + row.total_deductions, 0)
      const totalNet = planilla.reduce((sum, row) => sum + row.total, 0)
      const totalEmployees = planilla.length

      doc.rect(30, 200, pageWidth - 60, 90).stroke()
      doc.fontSize(12).text('RESUMEN EJECUTIVO', 40, 210)
      doc.fontSize(10).text('Total Empleados:', 45, 232)
      doc.fontSize(10).text(totalEmployees.toString(), 200, 232)
      doc.fontSize(10).text('Total Salario Bruto:', 45, 248)
      doc.fontSize(10).text(formatHNL(totalGross), 200, 248)
      doc.fontSize(10).text('Total Deducciones:', 45, 264)
      doc.fontSize(10).text(formatHNL(totalDeductions), 200, 264)
      doc.fontSize(10).text('Total Salario Neto:', 45, 280)
      doc.fontSize(10).text(formatHNL(totalNet), 200, 280)

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
      doc.fontSize(10).text('TOTALES POR DEPARTAMENTO:', 360, 232)
      let deptY = 245
      Object.entries(deptTotals).forEach(([dept, totals]) => {
        if (deptY < 275) {
          doc.fontSize(9).text(`${dept}: ${totals.count} emp. - L. ${totals.net.toFixed(2)}`, 360, deptY)
          deptY += 12
        }
      })

      // ===== PAGE 2: PAYROLL TABLE =====
      doc.addPage()
      const tablePageWidth = doc.page.width
      doc.fontSize(14).fillColor('#0f172a').text('DETALLE DE NÓMINA POR EMPLEADO', 30, 24, { align: 'center', width: tablePageWidth - 60 })

      // Build dynamic headers based on custom fields config
      const baseHeaders = ['Código', 'Nombre', 'Departamento', 'Días Trab.', 'Salario Base']
      const earningsHeaders: string[] = []
      const deductionsHeaders: string[] = []
      const standardDeductionsHeaders = ['IHSS', 'RAP', 'ISR']
      const finalHeaders = ['Devengado', 'Deducciones', 'Neto']
      
      // Extract custom fields by category
      if (customFieldsConfig) {
        for (const [fieldName, fieldDef] of Object.entries(customFieldsConfig)) {
          const def = typeof fieldDef === 'string' 
            ? { label: fieldDef, category: 'earnings' as const, type: 'number' as const, required: false, default: 0 }
            : fieldDef
          
          if (def.category === 'earnings') {
            earningsHeaders.push(def.label || fieldName)
          } else if (def.category === 'deductions') {
            deductionsHeaders.push(def.label || fieldName)
          }
        }
      }
      
      // Combine all headers
      const allHeaders = [
        ...baseHeaders,
        ...earningsHeaders,
        ...finalHeaders.slice(0, 1), // Devengado
        ...standardDeductionsHeaders,
        ...deductionsHeaders,
        ...finalHeaders.slice(1) // Deducciones, Neto
      ]
      
      // Calculate column widths dynamically
      // Base widths: [78, 110, 82, 49, 73] for base headers
      // Custom field columns: 60 each (can be adjusted)
      const baseColWidths = [78, 110, 82, 49, 73]
      const customFieldWidth = 60
      const earningsColWidths = earningsHeaders.map(() => customFieldWidth)
      const devengadoWidth = 73
      const standardDeductionsWidths = [51, 49, 51]
      const deductionsColWidths = deductionsHeaders.map(() => customFieldWidth)
      const finalColWidths = [73, 73] // Deducciones, Neto
      
      const colWidths = [
        ...baseColWidths,
        ...earningsColWidths,
        devengadoWidth,
        ...standardDeductionsWidths,
        ...deductionsColWidths,
        ...finalColWidths
      ]
      
      // Adjust widths if table is too wide (fit to page width - margins)
      const totalWidth = colWidths.reduce((a, b) => a + b, 0)
      const availableWidth = tablePageWidth - 80 // margins
      if (totalWidth > availableWidth) {
        const scaleFactor = availableWidth / totalWidth
        for (let i = 0; i < colWidths.length; i++) {
          colWidths[i] = Math.floor(colWidths[i] * scaleFactor)
        }
      }

      const startX = 40
      let y = 60
      const rowHeight = 17

      // Draw headers
      allHeaders.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#0b4fa1', '#0f172a')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        doc.fillColor('#0f172a')
      })
      y += rowHeight

      // Helper to get custom field value from metadata
      const getCustomFieldValue = (row: PlanillaItem, fieldName: string): string => {
        if (!row.metadata || !row.metadata[fieldName]) {
          return formatHNL(0)
        }
        const value = row.metadata[fieldName]
        if (typeof value === 'number') {
          return formatHNL(value)
        } else if (typeof value === 'boolean') {
          return value ? 'Sí' : 'No'
        }
        return String(value || '')
      }
      
      let pageCount = 1
      planilla.forEach((row) => {
        if (y > doc.page.height - 60) {
          doc.addPage()
          y = 40
          pageCount++
          doc.fontSize(10).fillColor('#475569').text(`Página ${pageCount} - Continuación`, 40, 20)
          
          // Redraw headers on new page
          allHeaders.forEach((h, i) => {
            const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
            doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#0b4fa1', '#0f172a')
            doc.fillColor('white')
            doc.fontSize(8).text(h, x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
            doc.fillColor('#0f172a')
          })
          y += rowHeight
        }
        
        // Build values array with custom fields
        const values: string[] = [
          row.id || '',
          row.name,
          row.department,
          row.days_worked.toString(),
          formatHNL(row.monthly_salary)
        ]
        
        // Add custom earnings fields
        if (customFieldsConfig) {
          for (const [fieldName, fieldDef] of Object.entries(customFieldsConfig)) {
            const def = typeof fieldDef === 'string' 
              ? { label: fieldDef, category: 'earnings' as const, type: 'number' as const, required: false, default: 0 }
              : fieldDef
            if (def.category === 'earnings') {
              values.push(getCustomFieldValue(row, fieldName))
            }
          }
        }
        
        // Add Devengado (total earnings)
        values.push(formatHNL(row.total_earnings))
        
        // Add standard deductions
        values.push(formatHNL(row.IHSS))
        values.push(formatHNL(row.RAP))
        values.push(formatHNL(row.ISR))
        
        // Add custom deductions fields
        if (customFieldsConfig) {
          for (const [fieldName, fieldDef] of Object.entries(customFieldsConfig)) {
            const def = typeof fieldDef === 'string' 
              ? { label: fieldDef, category: 'deductions' as const, type: 'number' as const, required: false, default: 0 }
              : fieldDef
            if (def.category === 'deductions') {
              values.push(getCustomFieldValue(row, fieldName))
            }
          }
        }
        
        // Add final columns
        values.push(formatHNL(row.total_deductions))
        values.push(formatHNL(row.total))
        
        values.forEach((val, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, y, colWidths[i], rowHeight).stroke()
          doc.fontSize(8).fillColor('#0f172a').text(val.toString(), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        })
        y += rowHeight
      })

      y += 6
      const totalsWidth = colWidths.reduce((a, b) => a + b, 0)
      doc.rect(startX, y, totalsWidth, rowHeight).fillAndStroke('#f3f4f6', '#0f172a')
      doc.fontSize(10).fillColor('#0f172a').text('TOTALES:', startX + 6, y + 5)
      doc.fontSize(10).text(formatHNL(totalGross), startX + totalsWidth * 0.45, y + 5)
      doc.fontSize(10).text(formatHNL(totalDeductions), startX + totalsWidth * 0.65, y + 5)
      doc.fontSize(10).text(formatHNL(totalNet), startX + totalsWidth * 0.82, y + 5)

      // ===== PAGE 3: BANK DETAILS & NOTES =====
      doc.addPage()
      const bankPageWidth = doc.page.width
      doc.fontSize(14).fillColor('#0f172a').text('INFORMACIÓN BANCARIA Y NOTAS', 30, 24, { align: 'center', width: bankPageWidth - 60 })

      doc.fontSize(10).text('DETALLE BANCARIO PARA TRANSFERENCIAS:', 30, 60)
      const bankHeaders = ['Código', 'Nombre', 'Banco', 'Cuenta', 'Monto Neto']
      const bankColWidths = [70, 210, 120, 180, 120]
      const bankStartX = 40
      let bankY = 60
      const bankRowHeight = 17

      bankHeaders.forEach((h, i) => {
        const x = bankStartX + bankColWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, bankY, bankColWidths[i], bankRowHeight).fillAndStroke('#0b4fa1', '#0f172a')
        doc.fillColor('white')
        doc.fontSize(9).text(h, x + 2, bankY + 4, { width: bankColWidths[i] - 4, align: 'center' })
        doc.fillColor('#0f172a')
      })
      bankY += bankRowHeight

      planilla.forEach((row) => {
        if (bankY > doc.page.height - 60) {
          doc.addPage()
          bankY = 40
        }
        const bankValues = [
          row.id || '',
          row.name,
          row.bank || 'No especificado',
          row.bank_account || 'No especificado',
          formatHNL(row.total)
        ]
        bankValues.forEach((val, i) => {
          const x = bankStartX + bankColWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, bankY, bankColWidths[i], bankRowHeight).stroke()
          doc.fontSize(9).fillColor('#0f172a').text(val.toString(), x + 2, bankY + 4, { width: bankColWidths[i] - 4, align: 'center' })
        })
        bankY += bankRowHeight
      })

      doc.fontSize(10).fillColor('#0f172a').text('NOTAS IMPORTANTES:', 40, bankY + 22)
      doc.fontSize(9).fillColor('#334155').text('• Esta planilla ha sido generada automáticamente por el Sistema Hondureño de Recursos Humanos.', 40, bankY + 38)
      doc.fontSize(9).text('• Los montos están calculados según la legislación laboral de Honduras.', 40, bankY + 53)
      doc.fontSize(9).text('• Las deducciones incluyen: IHSS, RAP, ISR (según tabla progresiva).', 40, bankY + 68)
      doc.fontSize(9).text('• Verificar que la información bancaria sea correcta antes de procesar pagos.', 40, bankY + 83)
      doc.fontSize(9).text('• Para consultas, contactar al departamento de recursos humanos.', 40, bankY + 98)

      doc.fontSize(8).fillColor('#64748b').text('SISU: Sistema Hondureño de Recursos Humanos', 40, doc.page.height - 35, { align: 'center', width: bankPageWidth - 80 })
      doc.fontSize(8).text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 40, doc.page.height - 20, { align: 'center', width: bankPageWidth - 80 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

