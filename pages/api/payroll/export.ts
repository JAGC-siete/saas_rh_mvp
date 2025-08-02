import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import PDFDocument from 'pdfkit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 🔒 AUTENTICACIÓN REQUERIDA
    const supabase = createClient(req, res)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Debe iniciar sesión para exportar nómina'
      })
    }

    // Verificar permisos del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, permissions, company_id')
      .eq('id', session.user.id)
      .single()

    if (!userProfile) {
      return res.status(403).json({ 
        error: 'Perfil no encontrado',
        message: 'Su perfil de usuario no está configurado correctamente'
      })
    }

    // Verificar permisos específicos para exportar nómina
    const allowedRoles = ['company_admin', 'hr_manager', 'super_admin']
    if (!allowedRoles.includes(userProfile.role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para exportar nómina'
      })
    }

    // Verificar permisos específicos si están definidos
    if (userProfile.permissions && !userProfile.permissions.can_view_payroll) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para ver nómina'
      })
    }

    console.log('🔐 Usuario autenticado para exportar nómina:', { 
      userId: session.user.id, 
      role: userProfile.role,
      companyId: userProfile.company_id 
    })

    const { periodo, quincena } = req.query
    if (!periodo || !quincena) {
      return res.status(400).json({ error: 'Periodo y quincena son requeridos' })
    }
    if (typeof periodo !== 'string' || typeof quincena !== 'string') {
      return res.status(400).json({ error: 'Parámetros inválidos' })
    }
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (!['1', '2'].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }
    const [year, month] = periodo.split('-').map(Number)
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = quincena === '1' ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = quincena === '1' ? `${periodo}-15` : `${periodo}-${ultimoDia}`

    // Obtener empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status')
      .eq('status', 'active')
    if (empError) {
      return res.status(500).json({ error: 'Error obteniendo empleados' })
    }

    // Obtener registros de payroll_records del período
    const { data: payrollRecords, error: payError } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('period_start', fechaInicio)
      .eq('period_end', fechaFin)
    if (payError) {
      return res.status(500).json({ error: 'Error obteniendo payroll_records' })
    }

    // Generar PDF
    const doc = new PDFDocument({ size: 'A4', margin: 20, layout: 'landscape' })
    let buffers: Buffer[] = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=planilla_${periodo}_q${quincena}.pdf`)
      res.send(pdf)
    })

    doc.fontSize(14).text(`PLANILLA QUINCENAL - ${periodo} Q${quincena}`, { align: 'center' }).moveDown()
    doc.fontSize(8)

    // Encabezados
    const headers = [
      'Nombre', 'DNI', 'Banco', 'Cuenta', 'Salario Mensual', 'Días Trabajados', 'Total Devengado',
      'IHSS', 'RAP', 'ISR', 'Total Deducciones', 'Neto', 'Notas Ingreso', 'Notas Deducción'
    ]
    const colWidths = [90, 50, 50, 60, 60, 30, 60, 40, 40, 40, 60, 60, 80, 80]
    const startX = 20
    let y = 80
    const rowHeight = 14

    headers.forEach((h, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
      doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#e0e0e0', '#000')
      doc.fillColor('#000').text(h, x + 2, y + 4, { width: colWidths[i] - 4 })
    })
    y += rowHeight

    // Filtrar y ordenar empleados según payrollRecords
    const payrollByEmployee = Object.fromEntries(payrollRecords.map(r => [r.employee_id, r]))
    const empleados = employees.filter(e => payrollByEmployee[e.id])

    empleados.forEach(emp => {
      const r = payrollByEmployee[emp.id]
      const values = [
        emp.name,
        emp.dni,
        emp.bank_name || '',
        emp.bank_account || '',
        r.base_salary,
        r.days_worked,
        r.gross_salary,
        r.social_security,
        r.professional_tax,
        r.income_tax,
        r.total_deductions,
        r.net_salary,
        r.notes_on_ingress || '',
        r.notes_on_deductions || ''
      ]
      values.forEach((val, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).stroke()
        doc.text(val?.toString() ?? '', x + 2, y + 3, { width: colWidths[i] - 4 })
      })
      y += rowHeight
      if (y > 540) {
        doc.addPage()
        y = 80
      }
    })

    doc.end()
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error generando PDF', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
} 