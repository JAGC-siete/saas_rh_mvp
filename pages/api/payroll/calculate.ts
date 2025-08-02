import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser, getOrCreateProfile, hasPermission } from '../../../lib/auth-helpers'

// Constantes específicas para Honduras
const SALARIO_MINIMO = 11903.13
const IHSS_FIJO = 595.16
const RAP_PORCENTAJE = 0.015
const TOLERANCIA_TARDANZA = 5 // minutos

// Cálculo de ISR según tabla progresiva de Honduras
function calcularISR(salarioBase: number): number {
  // Tabla progresiva simplificada para Honduras
  if (salarioBase <= 200000) {
    return 0
  } else if (salarioBase <= 350000) {
    return (salarioBase - 200000) * 0.15
  } else if (salarioBase <= 500000) {
    return 22500 + (salarioBase - 350000) * 0.20
  } else {
    return 52500 + (salarioBase - 500000) * 0.25
  }
}

function calcularIHSS(salarioBase: number): number {
  // IHSS: 2.5% del empleado + 2.5% del empleador (solo mostramos la parte del empleado)
  return Math.min(salarioBase * 0.025, IHSS_FIJO)
}

function calcularRAP(salarioBase: number): number {
  // RAP: 1.5% sobre el excedente del salario mínimo
  return Math.max(0, salarioBase - SALARIO_MINIMO) * RAP_PORCENTAJE
}

// Función para calcular tardanzas basada en horario de Paragon
function calcularTardanzas(registros: any[]): number {
  let tardanzas = 0
  const horaEntrada = 8 // 8:00 AM
  
  registros.forEach(registro => {
    if (registro.check_in) {
      const horaCheckIn = new Date(registro.check_in).getHours()
      const minutosCheckIn = new Date(registro.check_in).getMinutes()
      const minutosTotales = horaCheckIn * 60 + minutosCheckIn
      const horaEntradaMinutos = horaEntrada * 60
      
      if (minutosTotales > horaEntradaMinutos + TOLERANCIA_TARDANZA) {
        tardanzas++
      }
    }
  })
  
  return tardanzas
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 🔒 AUTENTICACIÓN REQUERIDA CON NUEVO HELPER
    const authResult = await authenticateUser(req, res, ['can_generate_payroll'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    console.log('🔐 Usuario autenticado para nómina:', { 
      userId: user.id, 
      role: userProfile.role,
      companyId: userProfile.company_id 
    })

    const { periodo, quincena, incluirDeducciones, soloEmpleadosConAsistencia = true } = req.body
    
    // Validaciones mejoradas
    if (!periodo || !quincena) {
      return res.status(400).json({ error: 'Periodo y quincena son requeridos' })
    }
    
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato: YYYY-MM)' })
    }
    
    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    // Validar que no sea un período futuro
    const [year, month] = periodo.split('-').map(Number)
    const currentDate = new Date()
    const periodDate = new Date(year, month - 1, 1)
    
    if (periodDate > currentDate) {
      return res.status(400).json({ 
        error: 'Período inválido',
        message: 'No se puede generar nómina para períodos futuros'
      })
    }

    // Calcular fechas del período
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = quincena === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`
    
    // El admin puede forzar deducciones en cualquier quincena
    const aplicarDeducciones = !!incluirDeducciones

    console.log('📅 Generando nómina para:', {
      periodo,
      quincena,
      fechaInicio,
      fechaFin,
      aplicarDeducciones,
      soloEmpleadosConAsistencia
    })

    // Obtener empleados activos (sin restricción de empresa)
    let employeesQuery = supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status, department_id')
      .eq('status', 'active')
      .order('name')

    // Si el usuario tiene company_id, filtrar por empresa
    if (userProfile.company_id) {
      employeesQuery = employeesQuery.eq('company_id', userProfile.company_id)
    }

    const { data: employees, error: empError } = await employeesQuery

    if (empError) {
      console.error('Error obteniendo empleados:', empError)
      return res.status(500).json({ error: 'Error obteniendo empleados' })
    }

    if (!employees || employees.length === 0) {
      return res.status(400).json({ 
        error: 'No hay empleados activos',
        message: 'No se encontraron empleados activos para generar la nómina'
      })
    }

    // Obtener registros de asistencia del período (sin restricción de empresa)
    let attendanceQuery = supabase
      .from('attendance_records')
      .select('employee_id, date, check_in, check_out, status')
      .gte('date', fechaInicio)
      .lte('date', fechaFin)

    // Si el usuario tiene company_id, filtrar por empresa
    if (userProfile.company_id) {
      attendanceQuery = attendanceQuery.eq('company_id', userProfile.company_id)
    }

    const { data: attendanceRecords, error: attError } = await attendanceQuery

    if (attError) {
      console.error('Error obteniendo registros de asistencia:', attError)
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    // Filtrar empleados según criterio de asistencia
    let empleadosParaNomina = employees
    
    if (soloEmpleadosConAsistencia) {
      empleadosParaNomina = employees.filter(emp =>
        attendanceRecords.some(record => 
          record.employee_id === emp.id && 
          record.check_in && 
          record.check_out &&
          record.status !== 'absent'
        )
      )
    }

    if (empleadosParaNomina.length === 0) {
      return res.status(400).json({ 
        error: 'No hay empleados con asistencia',
        message: 'No se encontraron empleados con asistencia completa para el período seleccionado'
      })
    }

    console.log(`👥 Procesando nómina para ${empleadosParaNomina.length} empleados`)

    // Calcular planilla
    const planilla = empleadosParaNomina.map(emp => {
      const registros = attendanceRecords.filter(record => 
        record.employee_id === emp.id && 
        record.check_in && 
        record.check_out
      )
      
      const days_worked = registros.length
      const days_absent = (quincena === 1 ? 15 : ultimoDia - 15) - days_worked
      const late_days = calcularTardanzas(registros)
      
      const base_salary = Number(emp.base_salary) || 0
      const total_earnings = base_salary / 2 // Salario quincenal
      
      let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0
      let notes_on_ingress = ''
      let notes_on_deductions = ''

      if (aplicarDeducciones) {
        IHSS = calcularIHSS(base_salary) / 2 // Dividir por 2 para quincena
        RAP = calcularRAP(base_salary) / 2
        ISR = calcularISR(base_salary) / 2
        total_deductions = IHSS + RAP + ISR
        total = total_earnings - total_deductions
      } else {
        total = total_earnings
      }

      // Notas automáticas mejoradas
      if (days_worked < (quincena === 1 ? 15 : ultimoDia - 15)) {
        notes_on_ingress = `Faltaron ${days_absent} días de asistencia completa.`
      }
      
      if (late_days > 0) {
        notes_on_ingress += ` ${late_days} días con tardanza.`
      }
      
      if (IHSS > 1000 || RAP > 1000 || ISR > 1000) {
        notes_on_deductions = 'Deducción atípica, revisar cálculo.'
      }

      // Validaciones específicas para Paragon
      if (base_salary < SALARIO_MINIMO) {
        notes_on_deductions += ' Salario por debajo del mínimo legal.'
      }

      return {
        name: emp.name,
        id: emp.dni,
        bank: emp.bank_name || '',
        bank_account: emp.bank_account || '',
        department: emp.department || 'Sin Departamento',
        monthly_salary: base_salary,
        days_worked,
        days_absent,
        late_days,
        total_earnings,
        IHSS: Math.round(IHSS * 100) / 100,
        RAP: Math.round(RAP * 100) / 100,
        ISR: Math.round(ISR * 100) / 100,
        total_deductions: Math.round(total_deductions * 100) / 100,
        total: Math.round(total * 100) / 100,
        notes_on_ingress,
        notes_on_deductions
      }
    })

    // Guardar en payroll_records
    const payrollRecords = planilla.map(item => ({
      employee_id: empleadosParaNomina.find(e => e.dni === item.id)?.id,
      period_start: fechaInicio,
      period_end: fechaFin,
      period_type: 'biweekly',
      base_salary: item.monthly_salary,
      gross_salary: item.total_earnings,
      income_tax: item.ISR,
      social_security: item.IHSS,
      professional_tax: item.RAP,
      total_deductions: item.total_deductions,
      net_salary: item.total,
      days_worked: item.days_worked,
      days_absent: item.days_absent,
      late_days: item.late_days,
      status: 'draft',
      notes_on_ingress: item.notes_on_ingress,
      notes_on_deductions: item.notes_on_deductions,
      generated_by: userProfile.employee_id,
      generated_at: new Date().toISOString()
    }))

    const { error: saveError } = await supabase
      .from('payroll_records')
      .upsert(payrollRecords, { 
        onConflict: 'employee_id,period_start,period_end',
        ignoreDuplicates: false 
      })
    
    if (saveError) {
      console.error('Error guardando nómina:', saveError)
      return res.status(500).json({ error: 'Error guardando nómina en la base de datos' })
    }

    console.log(`✅ Nómina generada exitosamente para ${planilla.length} empleados`)

    // Verificar si se solicita PDF
    const acceptHeader = req.headers.accept || ''
    if (acceptHeader.includes('application/pdf')) {
      // Generar PDF profesional para Paragon Honduras
      const PDFDocument = require('pdfkit')
      const doc = new PDFDocument({ 
        size: 'A4', 
        layout: 'portrait', 
        margin: 30,
        info: {
          Title: `Planilla Quincenal - Paragon Honduras - ${periodo} Q${quincena}`,
          Author: 'Sistema de Recursos Humanos',
          Subject: 'Nómina Quincenal',
          Keywords: 'nómina, planilla, Paragon, Honduras',
          Creator: 'HR SaaS System'
        }
      })
      
      let buffers: Buffer[] = []

      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => {
        const pdf = Buffer.concat(buffers)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename=planilla_paragon_${periodo}_q${quincena}.pdf`)
        res.send(pdf)
      })

      // ===== PÁGINA 1: HEADER Y RESUMEN EJECUTIVO =====
      
      // Header con logo y branding
      doc.rect(0, 0, 595, 100).fill('#1e40af')
      doc.fillColor('white')
      doc.fontSize(24).text('PARAGON HONDURAS', 30, 20, { align: 'center', width: 535 })
      doc.fontSize(16).text('Sistema de Recursos Humanos', 30, 50, { align: 'center', width: 535 })
      doc.fontSize(14).text(`PLANILLA QUINCENAL - ${periodo} Q${quincena}`, 30, 75, { align: 'center', width: 535 })
      
      // Reset colors
      doc.fillColor('black')
      
      // Información de la empresa
      doc.fontSize(10).text('INFORMACIÓN DE LA EMPRESA:', 30, 120)
      doc.fontSize(9).text('Paragon Honduras', 30, 135)
      doc.fontSize(9).text('Dirección: Tegucigalpa, Honduras', 30, 150)
      doc.fontSize(9).text('Teléfono: +504 XXXX-XXXX', 30, 165)
      doc.fontSize(9).text('Email: info@paragonhonduras.com', 30, 180)
      
      // Información del período
      doc.fontSize(10).text('INFORMACIÓN DEL PERÍODO:', 300, 120)
      doc.fontSize(9).text(`Período: ${periodo}`, 300, 135)
      doc.fontSize(9).text(`Quincena: ${quincena === 1 ? 'Primera (1-15)' : 'Segunda (16-fin de mes)'}`, 300, 150)
      doc.fontSize(9).text(`Fecha de generación: ${new Date().toLocaleDateString('es-HN')}`, 300, 165)
      doc.fontSize(9).text(`Generado por: ${userProfile?.name || 'Sistema'}`, 300, 180)
      
      // Resumen ejecutivo
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
      
      // Totales por departamento
      const deptTotals: { [key: string]: { count: number, gross: number, net: number } } = {}
      planilla.forEach(row => {
        const dept = row.department
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
      
      // ===== PÁGINA 2: TABLA DE NÓMINA =====
      doc.addPage()
      
      // Header de la tabla
      doc.fontSize(14).text('DETALLE DE NÓMINA POR EMPLEADO', 30, 30, { align: 'center', width: 535 })
      
      // Encabezados de tabla
      const headers = [
        'Código', 'Nombre', 'Departamento', 'Días Trab.', 'Salario Base', 
        'Devengado', 'IHSS', 'RAP', 'ISR', 'Deducciones', 'Neto'
      ]
      const colWidths = [40, 80, 60, 35, 50, 50, 35, 35, 35, 50, 50]
      const startX = 30
      let y = 70
      const rowHeight = 15
      
      // Header de tabla
      headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        doc.fillColor('black')
      })
      y += rowHeight
      
      // Datos de empleados
      let pageCount = 1
      planilla.forEach((row, index) => {
        // Verificar si necesitamos nueva página
        if (y > 750) {
          doc.addPage()
          y = 30
          pageCount++
          
          // Header de página
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
      
      // Totales al final de la tabla
      y += 5
      doc.rect(startX, y, 535, rowHeight).fillAndStroke('#f3f4f6', '#000')
      doc.fontSize(9).text('TOTALES:', startX + 5, y + 4)
      doc.fontSize(9).text(`L. ${totalGross.toFixed(2)}`, startX + 200, y + 4)
      doc.fontSize(9).text(`L. ${totalDeductions.toFixed(2)}`, startX + 350, y + 4)
      doc.fontSize(9).text(`L. ${totalNet.toFixed(2)}`, startX + 450, y + 4)
      
      // ===== PÁGINA 3: DETALLE BANCARIO Y NOTAS =====
      doc.addPage()
      
      doc.fontSize(14).text('INFORMACIÓN BANCARIA Y NOTAS', 30, 30, { align: 'center', width: 535 })
      
      // Tabla de información bancaria
      doc.fontSize(10).text('DETALLE BANCARIO PARA TRANSFERENCIAS:', 30, 60)
      
      const bankHeaders = ['Código', 'Nombre', 'Banco', 'Cuenta', 'Monto Neto']
      const bankColWidths = [40, 120, 80, 100, 80]
      const bankStartX = 30
      let bankY = 80
      const bankRowHeight = 15
      
      // Header tabla bancaria
      bankHeaders.forEach((h, i) => {
        const x = bankStartX + bankColWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, bankY, bankColWidths[i], bankRowHeight).fillAndStroke('#1e40af', '#000')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, bankY + 4, { width: bankColWidths[i] - 4, align: 'center' })
        doc.fillColor('black')
      })
      bankY += bankRowHeight
      
      // Datos bancarios
      planilla.forEach((row, index) => {
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
      
      // Notas importantes
      doc.fontSize(10).text('NOTAS IMPORTANTES:', 30, bankY + 20)
      doc.fontSize(9).text('• Esta planilla ha sido generada automáticamente por el sistema de recursos humanos.', 30, bankY + 35)
      doc.fontSize(9).text('• Los montos están calculados según la legislación laboral de Honduras.', 30, bankY + 50)
      doc.fontSize(9).text('• Las deducciones incluyen: IHSS (2.5%), RAP (1.5%), ISR (según tabla progresiva).', 30, bankY + 65)
      doc.fontSize(9).text('• Verificar que la información bancaria sea correcta antes de procesar pagos.', 30, bankY + 80)
      doc.fontSize(9).text('• Para consultas, contactar al departamento de recursos humanos.', 30, bankY + 95)
      
      // Pie de página legal
      doc.fontSize(8).text('Documento generado automáticamente - Paragon Honduras - Sistema de Recursos Humanos', 30, 800, { align: 'center', width: 535 })
      doc.fontSize(8).text(`Fecha de generación: ${new Date().toLocaleString('es-HN')}`, 30, 815, { align: 'center', width: 535 })

      doc.end()
      return
    }

    return res.status(200).json({
      message: 'Nómina calculada exitosamente',
      periodo,
      quincena,
      empleados: planilla.length,
      totalBruto: planilla.reduce((sum, row) => sum + row.total_earnings, 0),
      totalDeducciones: planilla.reduce((sum, row) => sum + row.total_deductions, 0),
      totalNeto: planilla.reduce((sum, row) => sum + row.total, 0),
      planilla
    })
  } catch (error) {
    console.error('Error en cálculo de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message 
    })
  }
} 