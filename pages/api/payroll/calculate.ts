import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

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
    // 🔒 AUTENTICACIÓN REQUERIDA
    const supabase = createClient(req, res)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Debe iniciar sesión para calcular nómina'
      })
    }

    // Verificar permisos del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, permissions, company_id, employee_id')
      .eq('id', session.user.id)
      .single()

    if (!userProfile) {
      return res.status(403).json({ 
        error: 'Perfil no encontrado',
        message: 'Su perfil de usuario no está configurado correctamente'
      })
    }

    // Verificar permisos específicos para nómina
    const allowedRoles = ['company_admin', 'hr_manager', 'super_admin']
    if (!allowedRoles.includes(userProfile.role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para calcular nómina'
      })
    }

    // Verificar permisos específicos si están definidos
    if (userProfile.permissions && !userProfile.permissions.can_view_payroll) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para ver nómina'
      })
    }

    console.log('🔐 Usuario autenticado para nómina:', { 
      userId: session.user.id, 
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

    // Obtener empleados activos de la empresa específica
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status, department')
      .eq('status', 'active')
      .eq('company_id', userProfile.company_id)
      .order('name')

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

    // Obtener registros de asistencia del período
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select('employee_id, date, check_in, check_out, status')
      .gte('date', fechaInicio)
      .lte('date', fechaFin)
      .eq('company_id', userProfile.company_id)

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
      // Generar PDF mejorado
      const PDFDocument = require('pdfkit')
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 })
      let buffers: Buffer[] = []

      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => {
        const pdf = Buffer.concat(buffers)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename=planilla_paragon_${periodo}_q${quincena}.pdf`)
        res.send(pdf)
      })

      // Encabezado mejorado
      doc.fontSize(16).text(`PARAGON HONDURAS - PLANILLA QUINCENAL`, { align: 'center' }).moveDown()
      doc.fontSize(12).text(`Período: ${periodo} - Quincena ${quincena}`, { align: 'center' }).moveDown()
      doc.fontSize(10).text(`Generada: ${new Date().toLocaleDateString('es-HN')}`, { align: 'center' }).moveDown()
      doc.fontSize(8)

      // Encabezados de tabla
      const headers = [
        'Nombre', 'DNI', 'Departamento', 'Banco', 'Cuenta', 'Salario Mensual', 
        'Días Trabajados', 'Total Devengado', 'IHSS', 'RAP', 'ISR', 'Total Deducciones', 'Neto'
      ]
      const colWidths = [80, 50, 60, 50, 60, 60, 40, 60, 40, 40, 40, 60, 60]
      const startX = 20
      let y = 120
      const rowHeight = 14

      headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#e0e0e0', '#000')
        doc.fillColor('#000').text(h, x + 2, y + 4, { width: colWidths[i] - 4 })
      })
      y += rowHeight

      // Datos de empleados
      planilla.forEach(row => {
        const values = [
          row.name, row.id, row.department, row.bank, row.bank_account, 
          `L. ${row.monthly_salary.toFixed(2)}`, row.days_worked.toString(),
          `L. ${row.total_earnings.toFixed(2)}`, `L. ${row.IHSS.toFixed(2)}`,
          `L. ${row.RAP.toFixed(2)}`, `L. ${row.ISR.toFixed(2)}`,
          `L. ${row.total_deductions.toFixed(2)}`, `L. ${row.total.toFixed(2)}`
        ]
        
        values.forEach((val, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, y, colWidths[i], rowHeight).stroke()
          doc.text(val.toString(), x + 2, y + 3, { width: colWidths[i] - 4 })
        })
        y += rowHeight
      })

      // Totales
      const totalGross = planilla.reduce((sum, row) => sum + row.total_earnings, 0)
      const totalDeductions = planilla.reduce((sum, row) => sum + row.total_deductions, 0)
      const totalNet = planilla.reduce((sum, row) => sum + row.total, 0)

      y += 10
      doc.fontSize(10).text(`TOTALES:`, startX, y)
      doc.text(`Bruto: L. ${totalGross.toFixed(2)}`, startX + 400, y)
      doc.text(`Deducciones: L. ${totalDeductions.toFixed(2)}`, startX + 500, y)
      doc.text(`Neto: L. ${totalNet.toFixed(2)}`, startX + 600, y)

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