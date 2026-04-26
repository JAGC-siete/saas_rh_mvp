import PDFDocument from 'pdfkit'
import { getDateRange } from '../attendance'
import { formatDateOnlyForHonduras } from '../timezone'

// Types for type safety and elegance
interface AttendanceRecord {
  id: string
  date: string
  status: 'present' | 'late' | 'absent'
  check_in?: string
  check_out?: string
  late_minutes?: number
  employees?: {
    name: string
    employee_code: string
    role: string
    position?: string
  }
}

interface PDFGenerationParams {
  attendanceRecords: AttendanceRecord[]
  startDate: string
  endDate: string
  userEmail: string
  preset?: string
  role?: string
  employeeName?: string
}

interface AttendanceTotals {
  present: number
  late: number
  absent: number
  total: number
  attendanceRate: number
  punctualityRate: number
}

// Constants for consistency
const PDF_CONFIG = {
  margin: 50,
  headerFontSize: 18,
  subheaderFontSize: 10,
  bodyFontSize: 9,
  footerFontSize: 8,
  timezone: 'America/Tegucigalpa' as const,
  colors: {
    primary: '#1e40af',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    muted: '#94a3b8'
  }
} as const

/**
 * Divine PDF Generator - Bulletproof Architecture
 * 
 * This class encapsulates all PDF generation logic with:
 * - Type safety
 * - Comprehensive error handling
 * - Proper buffer management
 * - Elegant formatting
 * - Honduras timezone consistency
 */
export class AttendancePDFGenerator {
  private doc: any
  private chunks: Buffer[] = []
  private pageCount: number = 0

  constructor() {
    this.doc = new PDFDocument({ 
      margin: PDF_CONFIG.margin,
      bufferPages: true,
      autoFirstPage: true
    })
    
    this.setupEventHandlers()
  }

  /**
   * Setup event handlers for proper buffer management
   */
  private setupEventHandlers(): void {
    this.doc.on('data', (chunk: Buffer) => {
      this.chunks.push(chunk)
    })

    this.doc.on('pageAdded', () => {
      this.pageCount++
    })
  }

  /**
   * Generate the complete PDF document
   */
  async generatePDF(params: PDFGenerationParams): Promise<Buffer> {
    try {
      // Validate input data
      this.validateParams(params)
      
      // Generate document sections
      this.generateHeader(params)
      this.generateKPISummary(params.attendanceRecords)
      this.generateAttendanceTable(params.attendanceRecords)
      this.generateFooter()
      
      // Finalize document
      return await this.finalizeDocument()
      
    } catch (error) {
      console.error('❌ PDF Generation Error:', error)
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate input parameters with comprehensive checks
   */
  private validateParams(params: PDFGenerationParams): void {
    if (!params.attendanceRecords || !Array.isArray(params.attendanceRecords)) {
      throw new Error('attendanceRecords must be a non-empty array')
    }

    if (!params.startDate || !params.endDate) {
      throw new Error('startDate and endDate are required')
    }

    if (!params.userEmail || typeof params.userEmail !== 'string') {
      throw new Error('userEmail is required and must be a string')
    }

    // Validate date format
    const startDate = new Date(params.startDate)
    const endDate = new Date(params.endDate)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format for startDate or endDate')
    }

    if (startDate > endDate) {
      throw new Error('startDate cannot be after endDate')
    }
  }

  /**
   * Generate document header with filters and metadata
   */
  private generateHeader(params: PDFGenerationParams): void {
    const { from, to } = getDateRange(params.preset || 'today')
    
    // Main title
    this.doc
      .fontSize(PDF_CONFIG.headerFontSize)
      .fillColor(PDF_CONFIG.colors.primary)
      .text('Reporte de Asistencia', { align: 'center' })
      .moveDown(0.5)

    // Period information
    this.doc
      .fontSize(PDF_CONFIG.subheaderFontSize)
      .fillColor('black')
      .text(`Período: ${this.formatDate(from)} a ${this.formatDate(to)}`, { align: 'center' })
      .moveDown(0.3)

    // Filters
    const filters = [
      `Equipo: ${params.role || 'Todos'}`,
      `Empleado: ${params.employeeName || 'Todos'}`,
      `Generado por: ${params.userEmail}`,
      `Fecha de generación: ${this.formatDate(new Date().toISOString())}`
    ]

    filters.forEach(filter => {
      this.doc
        .fontSize(PDF_CONFIG.footerFontSize)
        .fillColor(PDF_CONFIG.colors.muted)
        .text(filter, { align: 'center' })
    })

    this.doc.moveDown(1)
  }

  /**
   * Generate KPI summary section
   */
  private generateKPISummary(records: AttendanceRecord[]): void {
    const totals = this.calculateTotals(records)
    
    this.doc
      .fontSize(PDF_CONFIG.subheaderFontSize)
      .fillColor(PDF_CONFIG.colors.primary)
      .text('Resumen Ejecutivo', { align: 'center' })
      .moveDown(0.5)

    // KPI Cards
    const kpiData = [
      { label: 'Asistencia', value: `${totals.attendanceRate.toFixed(1)}%`, color: PDF_CONFIG.colors.success },
      { label: 'Puntualidad', value: `${totals.punctualityRate.toFixed(1)}%`, color: PDF_CONFIG.colors.warning },
      { label: 'Presentes', value: totals.present.toString(), color: PDF_CONFIG.colors.success },
      { label: 'Tarde', value: totals.late.toString(), color: PDF_CONFIG.colors.warning },
      { label: 'Ausentes', value: totals.absent.toString(), color: PDF_CONFIG.colors.danger }
    ]

    // Create KPI table
    const tableTop = this.doc.y
    const colWidth = (this.doc.page.width - PDF_CONFIG.margin * 2) / kpiData.length

    kpiData.forEach((kpi, index) => {
      const x = PDF_CONFIG.margin + (index * colWidth)
      
      this.doc
        .rect(x, tableTop, colWidth, 40)
        .stroke()
        .fontSize(PDF_CONFIG.bodyFontSize)
        .fillColor(kpi.color)
        .text(kpi.value, x + 5, tableTop + 10, { width: colWidth - 10, align: 'center' })
        .fillColor('black')
        .text(kpi.label, x + 5, tableTop + 25, { width: colWidth - 10, align: 'center' })
    })

    this.doc.moveDown(3)
  }

  /**
   * Generate attendance table with proper formatting
   */
  private generateAttendanceTable(records: AttendanceRecord[]): void {
    if (records.length === 0) {
      this.doc
        .fontSize(PDF_CONFIG.bodyFontSize)
        .fillColor(PDF_CONFIG.colors.muted)
        .text('No hay registros de asistencia para el período seleccionado.', { align: 'center' })
      return
    }

    // Table headers
    this.doc
      .fontSize(PDF_CONFIG.bodyFontSize)
      .fillColor(PDF_CONFIG.colors.primary)
      .text('Detalle de Asistencia', { align: 'center' })
      .moveDown(0.5)

    // Group by role for better organization
    const groupedRecords = this.groupRecordsByRole(records)
    
    Object.entries(groupedRecords).forEach(([role, roleRecords]) => {
      this.generateRoleSection(role, roleRecords)
    })
  }

  /**
   * Generate section for a specific role/team
   */
  private generateRoleSection(role: string, records: AttendanceRecord[]): void {
    // Role header
    this.doc
      .fontSize(PDF_CONFIG.bodyFontSize)
      .fillColor(PDF_CONFIG.colors.primary)
      .text(`Equipo: ${role}`, { align: 'left' })
      .moveDown(0.3)

    // Table headers
    const tableTop = this.doc.y
    const colWidths = [80, 60, 80, 60, 60, 60] // Adjust based on content
    const headers = ['Empleado', 'Código', 'Fecha', 'Estado', 'Entrada', 'Salida']

    // Draw header row
    this.doc
      .fontSize(PDF_CONFIG.footerFontSize)
      .fillColor('white')
      .rect(PDF_CONFIG.margin, tableTop, this.doc.page.width - PDF_CONFIG.margin * 2, 20)
      .fill(PDF_CONFIG.colors.primary)

    let x = PDF_CONFIG.margin
    headers.forEach((header, index) => {
      this.doc
        .fillColor('white')
        .text(header, x + 2, tableTop + 5, { width: colWidths[index], align: 'center' })
      x += colWidths[index]
    })

    // Draw data rows
    let currentY = tableTop + 20
    records.forEach((record, index) => {
      // Zebra striping
      if (index % 2 === 0) {
        this.doc
          .rect(PDF_CONFIG.margin, currentY, this.doc.page.width - PDF_CONFIG.margin * 2, 15)
          .fill('#f8fafc')
      }

      // Row data
      x = PDF_CONFIG.margin
      const rowData = [
        this.truncateText(record.employees?.name || 'N/A', 15),
        record.employees?.employee_code || 'N/A',
        this.formatDate(record.date),
        this.getStatusLabel(record.status),
        this.formatTime(record.check_in),
        this.formatTime(record.check_out)
      ]

      rowData.forEach((data, dataIndex) => {
        this.doc
          .fontSize(PDF_CONFIG.footerFontSize)
          .fillColor('black')
          .text(data, x + 2, currentY + 3, { width: colWidths[dataIndex], align: 'center' })
        x += colWidths[dataIndex]
      })

      currentY += 15

      // Check if we need a new page
      if (currentY > this.doc.page.height - 100) {
        this.doc.addPage()
        currentY = PDF_CONFIG.margin
      }
    })

    this.doc.moveDown(1)
  }

  /**
   * Generate footer with pagination and confidentiality notice
   */
  private generateFooter(): void {
    // This will be called for each page after document is finalized
  }

  /**
   * Finalize document and return buffer
   */
  private async finalizeDocument(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.doc.on('end', () => {
        try {
          // Add footer to all pages
          this.addFooterToAllPages()
          resolve(Buffer.concat(this.chunks))
        } catch (error) {
          reject(error)
        }
      })

      this.doc.on('error', reject)
      this.doc.end()
    })
  }

  /**
   * Add footer to all pages
   */
  private addFooterToAllPages(): void {
    const range = this.doc.bufferedPageRange()
    
    for (let i = 0; i < range.count; i++) {
      this.doc.switchToPage(i)
      
      this.doc
        .fontSize(PDF_CONFIG.footerFontSize)
        .fillColor(PDF_CONFIG.colors.muted)
        .text('CONFIDENCIAL – Uso interno RH', PDF_CONFIG.margin, this.doc.page.height - 40, { width: 200 })
        .text(`Página ${i + 1} de ${range.count}`, PDF_CONFIG.margin, this.doc.page.height - 40, { 
          align: 'right', 
          width: this.doc.page.width - PDF_CONFIG.margin * 2 
        })
    }
  }

  // Utility methods
  private calculateTotals(records: AttendanceRecord[]): AttendanceTotals {
    const totals = records.reduce((acc, record) => {
      if (record.status === 'present') acc.present++
      else if (record.status === 'late') acc.late++
      else acc.absent++
      return acc
    }, { present: 0, late: 0, absent: 0 })

    const total = totals.present + totals.late + totals.absent
    const attendanceRate = total > 0 ? ((totals.present + totals.late) / total) * 100 : 0
    const punctualityRate = total > 0 ? (totals.present / total) * 100 : 0

    return { ...totals, total, attendanceRate, punctualityRate }
  }

  private groupRecordsByRole(records: AttendanceRecord[]): Record<string, AttendanceRecord[]> {
    return records.reduce((acc, record) => {
      const role = record.employees?.role || 'Sin equipo'
      if (!acc[role]) acc[role] = []
      acc[role].push(record)
      return acc
    }, {} as Record<string, AttendanceRecord[]>)
  }

  private formatDate(dateString: string): string {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return formatDateOnlyForHonduras(dateString)
      }
      return new Date(dateString).toLocaleDateString('es-HN', {
        timeZone: PDF_CONFIG.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  private formatTime(timeString?: string): string {
    if (!timeString) return '—'
    try {
      return new Date(timeString).toLocaleTimeString('es-HN', { 
        timeZone: PDF_CONFIG.timezone,
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Hora inválida'
    }
  }

  private getStatusLabel(status: string): string {
    const labels = {
      present: 'Presente',
      late: 'Tarde',
      absent: 'Ausente'
    }
    return labels[status as keyof typeof labels] || status
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }
}

/**
 * Main export function - Clean API
 */
export async function generateAttendancePDF(params: PDFGenerationParams): Promise<Buffer> {
  const generator = new AttendancePDFGenerator()
  return await generator.generatePDF(params)
}
