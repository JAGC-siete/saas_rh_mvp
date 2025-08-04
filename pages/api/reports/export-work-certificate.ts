import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'

interface WorkCertificateData {
  employee: {
    id: string
    name: string
    email: string
    employee_code: string
    dni: string
    position: string
    department_name: string
    company_name: string
    hire_date: string
    base_salary: number
    status: string
  }
  certificateInfo: {
    certificateType: string
    requestDate: string
    purpose: string
    additionalInfo?: string
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Autenticación y autorización
    const authResult = await authenticateUser(req, res, ['can_view_reports', 'can_manage_employees'])
    if (!authResult.success) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const { userProfile } = authResult
    const supabase = createClient(req, res)

    const { 
      employeeId, 
      format = 'pdf',
      certificateType = 'general',
      purpose = 'Constancia de trabajo',
      additionalInfo = ''
    } = req.body

    if (!employeeId) {
      return res.status(400).json({ error: 'ID de empleado requerido' })
    }

    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Formato no válido. Use pdf o csv' })
    }

    // Obtener datos del empleado y generar constancia
    const certificateData = await generateWorkCertificateData(
      supabase, 
      employeeId, 
      userProfile, 
      certificateType,
      purpose,
      additionalInfo
    )

    if (!certificateData) {
      return res.status(404).json({ error: 'Empleado no encontrado o sin permisos' })
    }

    // Generar reporte según formato
    if (format === 'pdf') {
      generateWorkCertificatePDF(res, certificateData)
    } else {
      generateWorkCertificateCSV(res, certificateData)
    }

  } catch (error) {
    console.error('Error generando constancia de trabajo:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function generateWorkCertificateData(
  supabase: any, 
  employeeId: string, 
  userProfile: any,
  certificateType: string,
  purpose: string,
  additionalInfo: string
): Promise<WorkCertificateData | null> {
  try {
    // Construir query base para empleado
    let employeeQuery = supabase
      .from('employees')
      .select(`
        id,
        name,
        email,
        employee_code,
        dni,
        position,
        hire_date,
        base_salary,
        status,
        departments(name),
        companies(name)
      `)
      .eq('id', employeeId)

    // Aplicar filtro por empresa si no es superadmin
    if (userProfile.role !== 'super_admin' && userProfile.company_id) {
      employeeQuery = employeeQuery.eq('company_id', userProfile.company_id)
    }

    const { data: employee, error: empError } = await employeeQuery.single()

    if (empError || !employee) {
      console.error('Error obteniendo empleado:', empError)
      return null
    }

    // Verificar que el empleado pertenece a la empresa del usuario
    if (userProfile.role !== 'super_admin' && employee.companies?.name !== userProfile.company_name) {
      console.error('Empleado no pertenece a la empresa del usuario')
      return null
    }

    const certificateData: WorkCertificateData = {
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employee_code: employee.employee_code,
        dni: employee.dni,
        position: employee.position || 'No especificado',
        department_name: employee.departments?.name || 'No especificado',
        company_name: employee.companies?.name || 'No especificado',
        hire_date: employee.hire_date,
        base_salary: employee.base_salary,
        status: employee.status
      },
      certificateInfo: {
        certificateType,
        requestDate: new Date().toISOString().split('T')[0],
        purpose,
        additionalInfo
      }
    }

    return certificateData

  } catch (error) {
    console.error('Error generando datos de constancia:', error)
    return null
  }
}

function generateWorkCertificatePDF(res: NextApiResponse, certificateData: WorkCertificateData) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40
      }
    })

    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=constancia_laboral_${certificateData.employee.employee_code}_${new Date().toISOString().split('T')[0]}.pdf`)

    // Pipe el documento a la respuesta
    doc.pipe(res)

    // Logo y encabezado (simulado)
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(certificateData.employee.company_name, { align: 'right' })
       .moveDown(0.5)
       .fontSize(10)
       .font('Helvetica')
       .text('S. de R.L.', { align: 'right' })
       .moveDown(2)

    // Título principal
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('CONSTANCIA LABORAL', { align: 'center' })
       .moveDown(3)

    // Cuerpo principal
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Por medio de la presente, ${certificateData.employee.company_name} S. de R.L. certifica que:`, { align: 'justify' })
       .moveDown(1)

    // Nombre del empleado
    doc.text(`• ${certificateData.employee.name}`, { align: 'justify' })
       .moveDown(0.5)

    // DNI
    doc.text(`• Documento Nacional de Identificación No. ${certificateData.employee.dni}`, { align: 'justify' })
       .moveDown(0.5)

    // Estado laboral
    const statusText = certificateData.employee.status === 'active' ? 'contrato permanente' : 'contrato temporal'
    doc.text(`• se desempeña en esta empresa con modalidad de ${statusText}`, { align: 'justify' })
       .moveDown(0.5)

    // Cargo
    doc.text(`• en el cargo de ${certificateData.employee.position}`, { align: 'justify' })
       .moveDown(0.5)

    // Período de empleo
    const hireDate = new Date(certificateData.employee.hire_date)
    const hireDateFormatted = hireDate.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
    doc.text(`• desde el ${hireDateFormatted} hasta la fecha`, { align: 'justify' })
       .moveDown(0.5)

    // Salario
    const salaryInWords = numberToWords(certificateData.employee.base_salary)
    doc.text(`• con un salario mensual de L. ${certificateData.employee.base_salary.toLocaleString('es-HN')} (${salaryInWords} lempiras exactos)`, { align: 'justify' })
       .moveDown(2)

    // Tabla de desglose salarial
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('Desglose Salarial:', { align: 'left' })
       .moveDown(0.5)

    // Calcular valores
    const biweeklySalary = certificateData.employee.base_salary / 2
    const deductions = Math.round(biweeklySalary * 0.0843) // 8.43% RAP + IHSS
    const netSalary = biweeklySalary - deductions

    // Tabla simple
    const tableData = [
      ['Salario base', `L. ${certificateData.employee.base_salary.toLocaleString('es-HN')}`],
      ['Salario quincenal', `L. ${biweeklySalary.toLocaleString('es-HN')}`],
      ['Deducciones (RAP / IHSS)', `L. ${deductions.toLocaleString('es-HN')}`],
      ['Total', `L. ${netSalary.toLocaleString('es-HN')}`]
    ]

    const tableTop = doc.y
    const colWidth = 200
    const rowHeight = 20

    tableData.forEach((row, index) => {
      const y = tableTop + (index * rowHeight)
      
      // Fondo alternado
      if (index % 2 === 0) {
        doc.rect(40, y, 515, rowHeight).fill('#f8f9fa')
      }
      
      // Texto
      doc.fontSize(10)
         .font('Helvetica')
         .text(row[0], 50, y + 5, { width: colWidth })
         .font('Helvetica-Bold')
         .text(row[1], 250, y + 5, { width: colWidth })
    })

    doc.moveDown(3)

    // Información de emisión
    const currentDate = new Date()
    const dayInWords = numberToWords(currentDate.getDate())
    const monthInWords = currentDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()
    const yearInWords = numberToWords(currentDate.getFullYear())

    doc.fontSize(11)
       .font('Helvetica')
       .text(`Esta constancia se emite a solicitud del interesado para los fines que estime convenientes. Extendida en Tegucigalpa, M.D.C., al ${dayInWords} día del mes de ${monthInWords} del año ${yearInWords}.`, { align: 'justify' })
       .moveDown(3)

    // Línea separadora
    doc.moveTo(40, doc.y)
       .lineTo(555, doc.y)
       .stroke()
       .moveDown(1)

    // Información de contacto
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Jorge Arturo Gómez Coello', { align: 'left' })
       .fontSize(9)
       .font('Helvetica')
       .text('Jefe de Personal', { align: 'left' })
       .text('Móvil: +(504) 3214-8010', { align: 'left' })
       .text('Mail: rrhh@paragonfinancialcorp.com', { align: 'left' })
       .moveDown(0.5)
       .font('Helvetica-Bold')
       .text(certificateData.employee.company_name, { align: 'left' })
       .fontSize(8)
       .font('Helvetica')
       .text('Centro Morazán, Torre #2, Nivel 8, Local 20817', { align: 'left' })

    // Finalizar documento
    doc.end()

  } catch (error) {
    console.error('Error generando PDF de constancia:', error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
}

// Función auxiliar para convertir números a palabras
function numberToWords(num: number): string {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

  if (num === 0) return 'cero'
  if (num < 10) return units[num]
  if (num < 20) return teens[num - 10]
  if (num < 100) {
    if (num % 10 === 0) return tens[Math.floor(num / 10)]
    return tens[Math.floor(num / 10)] + ' y ' + units[num % 10]
  }
  if (num < 1000) {
    if (num === 100) return 'cien'
    if (num % 100 === 0) return hundreds[Math.floor(num / 100)]
    return hundreds[Math.floor(num / 100)] + ' ' + numberToWords(num % 100)
  }
  if (num < 1000000) {
    if (num === 1000) return 'mil'
    if (num < 2000) return 'mil ' + numberToWords(num % 1000)
    if (num % 1000 === 0) return numberToWords(Math.floor(num / 1000)) + ' mil'
    return numberToWords(Math.floor(num / 1000)) + ' mil ' + numberToWords(num % 1000)
  }
  
  return num.toString() // Fallback para números muy grandes
}

function generateWorkCertificateCSV(res: NextApiResponse, certificateData: WorkCertificateData) {
  try {
    let csvContent = 'CONSTANCIA LABORAL\n\n'
    
    // Información de la empresa
    csvContent += `Empresa,${certificateData.employee.company_name} S. de R.L.\n`
    csvContent += `Fecha de emisión,${new Date().toLocaleDateString('es-ES')}\n\n`
    
    // Datos del empleado
    csvContent += 'DATOS DEL EMPLEADO\n'
    csvContent += `Nombre,${certificateData.employee.name}\n`
    csvContent += `Documento Nacional de Identificación,${certificateData.employee.dni}\n`
    csvContent += `Código de empleado,${certificateData.employee.employee_code}\n`
    csvContent += `Email,${certificateData.employee.email}\n`
    csvContent += `Cargo,${certificateData.employee.position}\n`
    csvContent += `Departamento,${certificateData.employee.department_name}\n`
    csvContent += `Modalidad de contrato,${certificateData.employee.status === 'active' ? 'contrato permanente' : 'contrato temporal'}\n`
    csvContent += `Fecha de contratación,${new Date(certificateData.employee.hire_date).toLocaleDateString('es-ES')}\n`
    csvContent += `Salario mensual,L. ${certificateData.employee.base_salary.toLocaleString('es-HN')}\n\n`
    
    // Desglose salarial
    const biweeklySalary = certificateData.employee.base_salary / 2
    const deductions = Math.round(biweeklySalary * 0.0843) // 8.43% RAP + IHSS
    const netSalary = biweeklySalary - deductions
    
    csvContent += 'DESGLOSE SALARIAL\n'
    csvContent += `Salario base,L. ${certificateData.employee.base_salary.toLocaleString('es-HN')}\n`
    csvContent += `Salario quincenal,L. ${biweeklySalary.toLocaleString('es-HN')}\n`
    csvContent += `Deducciones (RAP / IHSS),L. ${deductions.toLocaleString('es-HN')}\n`
    csvContent += `Total,L. ${netSalary.toLocaleString('es-HN')}\n\n`
    
    // Información de la constancia
    csvContent += 'INFORMACIÓN DE LA CONSTANCIA\n'
    csvContent += `Tipo de constancia,${certificateData.certificateInfo.certificateType}\n`
    csvContent += `Propósito,${certificateData.certificateInfo.purpose}\n`
    
    if (certificateData.certificateInfo.additionalInfo) {
      csvContent += `Información adicional,${certificateData.certificateInfo.additionalInfo}\n`
    }
    
    csvContent += '\nINFORMACIÓN DE CONTACTO\n'
    csvContent += `Nombre,Jorge Arturo Gómez Coello\n`
    csvContent += `Cargo,Jefe de Personal\n`
    csvContent += `Móvil,+(504) 3214-8010\n`
    csvContent += `Email,rrhh@paragonfinancialcorp.com\n`
    csvContent += `Empresa,${certificateData.employee.company_name}\n`
    csvContent += `Dirección,Centro Morazán, Torre #2, Nivel 8, Local 20817\n`

    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=constancia_laboral_${certificateData.employee.employee_code}_${new Date().toISOString().split('T')[0]}.csv`)
    
    res.send(csvContent)

  } catch (error) {
    console.error('Error generando CSV de constancia:', error)
    res.status(500).json({ error: 'Error generando CSV' })
  }
} 