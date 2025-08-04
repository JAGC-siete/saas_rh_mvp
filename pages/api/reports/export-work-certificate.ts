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
    const supabase = createClient()

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
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    })

    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=constancia_trabajo_${certificateData.employee.employee_code}_${new Date().toISOString().split('T')[0]}.pdf`)

    // Pipe el documento a la respuesta
    doc.pipe(res)

    // Contenido del PDF
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('CONSTANCIA DE TRABAJO', { align: 'center' })
       .moveDown(2)

    doc.fontSize(12)
       .font('Helvetica')
       .text(`La empresa ${certificateData.employee.company_name}`, { align: 'center' })
       .moveDown(1)
       .text('HACE CONSTAR QUE:', { align: 'center' })
       .moveDown(2)

    doc.fontSize(11)
       .text(`El/La Sr(a). ${certificateData.employee.name}`, { align: 'center' })
       .moveDown(1)
       .text(`con DNI: ${certificateData.employee.dni}`, { align: 'center' })
       .moveDown(1)
       .text(`Código de empleado: ${certificateData.employee.employee_code}`, { align: 'center' })
       .moveDown(2)

    doc.text(`Labora en esta empresa desde el ${new Date(certificateData.employee.hire_date).toLocaleDateString('es-ES')}`, { align: 'center' })
       .moveDown(1)
       .text(`en el cargo de: ${certificateData.employee.position}`, { align: 'center' })
       .moveDown(1)
       .text(`en el departamento de: ${certificateData.employee.department_name}`, { align: 'center' })
       .moveDown(2)

    doc.text(`Su salario base es de: L. ${certificateData.employee.base_salary.toLocaleString('es-HN')}`, { align: 'center' })
       .moveDown(1)
       .text(`Estado actual: ${certificateData.employee.status === 'active' ? 'ACTIVO' : 'INACTIVO'}`, { align: 'center' })
       .moveDown(2)

    if (certificateData.certificateInfo.additionalInfo) {
      doc.text(`Información adicional: ${certificateData.certificateInfo.additionalInfo}`, { align: 'center' })
         .moveDown(2)
    }

    doc.text(`Esta constancia se expide a solicitud del interesado para los fines que estime convenientes.`, { align: 'center' })
       .moveDown(2)

    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, { align: 'center' })
       .moveDown(3)

    // Espacio para firma
    doc.text('_________________________', { align: 'center' })
       .moveDown(0.5)
       .text('Firma y Sello', { align: 'center' })
       .moveDown(0.5)
       .text('Autoridad Competente', { align: 'center' })

    // Finalizar documento
    doc.end()

  } catch (error) {
    console.error('Error generando PDF de constancia:', error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
}

function generateWorkCertificateCSV(res: NextApiResponse, certificateData: WorkCertificateData) {
  try {
    let csvContent = 'CONSTANCIA DE TRABAJO\n\n'
    
    csvContent += `Empresa,${certificateData.employee.company_name}\n`
    csvContent += `Fecha de emisión,${new Date().toLocaleDateString('es-ES')}\n\n`
    
    csvContent += 'DATOS DEL EMPLEADO\n'
    csvContent += `Nombre,${certificateData.employee.name}\n`
    csvContent += `DNI,${certificateData.employee.dni}\n`
    csvContent += `Código de empleado,${certificateData.employee.employee_code}\n`
    csvContent += `Email,${certificateData.employee.email}\n`
    csvContent += `Cargo,${certificateData.employee.position}\n`
    csvContent += `Departamento,${certificateData.employee.department_name}\n`
    csvContent += `Fecha de contratación,${new Date(certificateData.employee.hire_date).toLocaleDateString('es-ES')}\n`
    csvContent += `Salario base,L. ${certificateData.employee.base_salary.toLocaleString('es-HN')}\n`
    csvContent += `Estado,${certificateData.employee.status === 'active' ? 'ACTIVO' : 'INACTIVO'}\n\n`
    
    csvContent += 'INFORMACIÓN DE LA CONSTANCIA\n'
    csvContent += `Tipo de constancia,${certificateData.certificateInfo.certificateType}\n`
    csvContent += `Propósito,${certificateData.certificateInfo.purpose}\n`
    
    if (certificateData.certificateInfo.additionalInfo) {
      csvContent += `Información adicional,${certificateData.certificateInfo.additionalInfo}\n`
    }

    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=constancia_trabajo_${certificateData.employee.employee_code}_${new Date().toISOString().split('T')[0]}.csv`)
    
    res.send(csvContent)

  } catch (error) {
    console.error('Error generando CSV de constancia:', error)
    res.status(500).json({ error: 'Error generando CSV' })
  }
} 