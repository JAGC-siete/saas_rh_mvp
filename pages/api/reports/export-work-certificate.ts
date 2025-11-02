import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { getHondurasTimestamp, formatDateForHonduras, nowInHonduras } from '../../../lib/timezone'

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
    termination_date: string | null
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
      includeDeductions = true, // Nuevo: opción para incluir o no deducciones
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
      generateWorkCertificatePDF(res, certificateData, includeDeductions)
    } else {
      generateWorkCertificateCSV(res, certificateData, includeDeductions)
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
    // Construir query base para empleado (incluir termination_date para empleados inactivos)
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
        termination_date,
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
        termination_date: employee.termination_date || null,
        base_salary: employee.base_salary,
        status: employee.status
      },
      certificateInfo: {
        certificateType,
        requestDate: getHondurasTimestamp().split('T')[0],
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

// Constantes para cálculos de deducciones (Honduras 2025)
const IHSS_TECHO = 11903.13 // Techo IHSS 2025
const IHSS_PORCENTAJE_EMPLEADO = 0.05 // 5% total (2.5% EM + 2.5% IVM)
const SALARIO_MINIMO = 11903.13

// Calcular IHSS
function calcularIHSS(salarioBase: number): number {
  const ihssBase = Math.min(salarioBase, IHSS_TECHO)
  return Math.round((ihssBase * IHSS_PORCENTAJE_EMPLEADO) * 100) / 100
}

// Calcular RAP
function calcularRAP(salarioBase: number): number {
  return Math.round(Math.max(0, salarioBase - SALARIO_MINIMO) * 0.015 * 100) / 100
}

// Formatear fecha en formato español completo (DOS de ENERO)
function formatDateInWords(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()
  const dayInWords = numberToWords(day)
  
  // Capitalizar primera letra
  const dayCapitalized = dayInWords.charAt(0).toUpperCase() + dayInWords.slice(1)
  
  return `${dayCapitalized} de ${month}`
}

function generateWorkCertificatePDF(res: NextApiResponse, certificateData: WorkCertificateData, includeDeductions: boolean = true) {
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
    res.setHeader('Content-Disposition', `attachment; filename=constancia_laboral_${certificateData.employee.employee_code}_${getHondurasTimestamp().split('T')[0]}.pdf`)

    // Pipe el documento a la respuesta
    doc.pipe(res)

    // Título principal
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('CONSTANCIA LABORAL', { align: 'center' })
       .moveDown(2)

    // Cuerpo principal - Formato exacto según especificación
    doc.fontSize(12)
       .font('Helvetica')
    
    // Construir el texto principal según el formato exacto
    const hireDate = new Date(certificateData.employee.hire_date)
    const hireDateFormatted = formatDateInWords(hireDate)
    
    // Determinar período: si está activo "hasta la fecha", si no está activo mostrar fecha fin
    const isActive = certificateData.employee.status === 'active'
    let periodText = ''
    if (isActive) {
      periodText = `desde el ${hireDateFormatted} de ${hireDate.getFullYear()} hasta la fecha`
    } else if (certificateData.employee.termination_date) {
      const terminationDate = new Date(certificateData.employee.termination_date)
      const terminationDateFormatted = formatDateInWords(terminationDate)
      periodText = `desde el ${hireDateFormatted} de ${hireDate.getFullYear()} hasta el ${terminationDateFormatted} de ${terminationDate.getFullYear()}`
    } else {
      periodText = `desde el ${hireDateFormatted} de ${hireDate.getFullYear()} hasta la fecha`
    }

    // Convertir salario a palabras
    const salaryInWords = numberToWords(certificateData.employee.base_salary)
    const salaryFormatted = certificateData.employee.base_salary.toFixed(2).replace('.', ',')
    
    // Construir texto principal
    let mainText = `Por medio de la presente, ${certificateData.employee.company_name.toUpperCase()} S. de R.L. certifica que ${certificateData.employee.name}, con Documento Nacional de Identificación No. ${certificateData.employee.dni}, se desempeña en esta empresa con modalidad de contrato permanente, ocupando el cargo de "${certificateData.employee.position}" ${periodText}, con modalidad de contrato permanente y con un salario mensual de L. ${salaryFormatted} (${salaryInWords} lempiras exactos)`
    
    if (includeDeductions) {
      mainText += ', con las siguientes deducciones:'
    } else {
      mainText += '.'
    }

    doc.text(mainText, { align: 'justify' })
       .moveDown(1.5)

    // Tabla de deducciones (solo si includeDeductions es true)
    if (includeDeductions) {
      // Calcular deducciones mensuales
      const ihssMonthly = calcularIHSS(certificateData.employee.base_salary)
      const rapMonthly = calcularRAP(certificateData.employee.base_salary)
      const totalDeductions = ihssMonthly + rapMonthly
      const netSalary = certificateData.employee.base_salary - totalDeductions

      const tableTop = doc.y
      const rowHeight = 25
      const labelWidth = 200
      const valueWidth = 150
      const startX = 50

      // Fila 1: Salario base
      doc.fontSize(11)
         .font('Helvetica')
         .text('Salario base', startX, tableTop, { width: labelWidth })
      doc.font('Helvetica-Bold')
         .text(`L ${certificateData.employee.base_salary.toFixed(2).replace('.', ',')}`, startX + labelWidth, tableTop, { width: valueWidth })
      
      // Fila 2: Deducciones
      const deductionsY = tableTop + rowHeight
      doc.font('Helvetica')
         .text('Deducciones (RAP / IHSS)', startX, deductionsY, { width: labelWidth })
      doc.font('Helvetica-Bold')
         .text(`L ${totalDeductions.toFixed(2).replace('.', ',')}`, startX + labelWidth, deductionsY, { width: valueWidth })
      
      // Fila 3: Total
      const totalY = deductionsY + rowHeight
      doc.font('Helvetica')
         .text('Total', startX, totalY, { width: labelWidth })
      doc.font('Helvetica-Bold')
         .text(`L ${netSalary.toFixed(2).replace('.', ',')}`, startX + labelWidth, totalY, { width: valueWidth })

      doc.moveDown(2)
    }

    // Información de emisión
    const currentDate = nowInHonduras()
    const day = currentDate.getDate()
    const dayInWords = numberToWords(day)
    const monthInWords = currentDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()
    const yearInWords = numberToWords(currentDate.getFullYear())
    
    // Usar "al" para día 1, "a los" para el resto
    const dayPrefix = day === 1 ? 'al' : 'a los'
    const daySuffix = day === 1 ? 'día' : 'días'

    doc.fontSize(11)
       .font('Helvetica')
       .text(`Esta constancia se emite a solicitud del interesado para los fines que estime convenientes. Extendida en Tegucigalpa, M.D.C., ${dayPrefix} ${dayInWords} ${daySuffix} del mes de ${monthInWords} del año ${yearInWords}.`, { align: 'justify' })

    // Finalizar documento
    doc.end()

  } catch (error) {
    console.error('Error generando PDF de constancia:', error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
}

// Función auxiliar para convertir números a palabras (mejorada para números grandes)
function numberToWords(num: number): string {
  // Redondear a entero para conversión
  const intNum = Math.floor(num)
  
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

  if (intNum === 0) return 'cero'
  if (intNum < 10) return units[intNum]
  if (intNum < 20) return teens[intNum - 10]
  if (intNum < 100) {
    if (intNum % 10 === 0) return tens[Math.floor(intNum / 10)]
    if (intNum < 30 && intNum > 20) {
      return 'veinti' + units[intNum % 10]
    }
    return tens[Math.floor(intNum / 10)] + ' y ' + units[intNum % 10]
  }
  if (intNum < 1000) {
    if (intNum === 100) return 'cien'
    if (intNum % 100 === 0) return hundreds[Math.floor(intNum / 100)]
    return hundreds[Math.floor(intNum / 100)] + ' ' + numberToWords(intNum % 100)
  }
  if (intNum < 1000000) {
    if (intNum === 1000) return 'mil'
    if (intNum < 2000) {
      const remainder = intNum % 1000
      return remainder === 0 ? 'mil' : 'mil ' + numberToWords(remainder)
    }
    if (intNum % 1000 === 0) {
      const thousands = Math.floor(intNum / 1000)
      return thousands === 1 ? 'mil' : numberToWords(thousands) + ' mil'
    }
    const thousands = Math.floor(intNum / 1000)
    const remainder = intNum % 1000
    const thousandsText = thousands === 1 ? 'mil' : numberToWords(thousands) + ' mil'
    return remainder === 0 ? thousandsText : thousandsText + ' ' + numberToWords(remainder)
  }
  
  // Para números muy grandes (millones), simplificar
  if (intNum < 1000000000) {
    const millions = Math.floor(intNum / 1000000)
    const remainder = intNum % 1000000
    const millionsText = millions === 1 ? 'un millón' : numberToWords(millions) + ' millones'
    return remainder === 0 ? millionsText : millionsText + ' ' + numberToWords(remainder)
  }
  
  return intNum.toString() // Fallback para números extremadamente grandes
}

function generateWorkCertificateCSV(res: NextApiResponse, certificateData: WorkCertificateData, includeDeductions: boolean = true) {
  try {
    let csvContent = 'CONSTANCIA LABORAL\n\n'
    
    // Información de la empresa
    csvContent += `Empresa,${certificateData.employee.company_name} S. de R.L.\n`
    csvContent += `Fecha de emisión,${formatDateForHonduras(nowInHonduras())}\n\n`
    
    // Datos del empleado
    csvContent += 'DATOS DEL EMPLEADO\n'
    csvContent += `Nombre,${certificateData.employee.name}\n`
    csvContent += `Documento Nacional de Identificación,${certificateData.employee.dni}\n`
    csvContent += `Código de empleado,${certificateData.employee.employee_code}\n`
    csvContent += `Email,${certificateData.employee.email}\n`
    csvContent += `Cargo,${certificateData.employee.position}\n`
    csvContent += `Departamento,${certificateData.employee.department_name}\n`
    csvContent += `Modalidad de contrato,contrato permanente\n`
    
    // Período de empleo
    const hireDate = new Date(certificateData.employee.hire_date)
    const isActive = certificateData.employee.status === 'active'
    let periodText = ''
    if (isActive) {
      periodText = `desde el ${formatDateInWords(hireDate)} de ${hireDate.getFullYear()} hasta la fecha`
    } else if (certificateData.employee.termination_date) {
      const terminationDate = new Date(certificateData.employee.termination_date)
      periodText = `desde el ${formatDateInWords(hireDate)} de ${hireDate.getFullYear()} hasta el ${formatDateInWords(terminationDate)} de ${terminationDate.getFullYear()}`
    } else {
      periodText = `desde el ${formatDateInWords(hireDate)} de ${hireDate.getFullYear()} hasta la fecha`
    }
    csvContent += `Período de empleo,${periodText}\n`
    csvContent += `Salario mensual,L. ${certificateData.employee.base_salary.toFixed(2).replace('.', ',')}\n\n`
    
    // Desglose salarial (solo si includeDeductions es true)
    if (includeDeductions) {
      // Calcular deducciones mensuales (igual que en PDF)
      const ihssMonthly = calcularIHSS(certificateData.employee.base_salary)
      const rapMonthly = calcularRAP(certificateData.employee.base_salary)
      const totalDeductions = ihssMonthly + rapMonthly
      const netSalary = certificateData.employee.base_salary - totalDeductions
      
      csvContent += 'DESGLOSE SALARIAL\n'
      csvContent += `Salario base,L ${certificateData.employee.base_salary.toFixed(2).replace('.', ',')}\n`
      csvContent += `Deducciones (RAP / IHSS),L ${totalDeductions.toFixed(2).replace('.', ',')}\n`
      csvContent += `Total,L ${netSalary.toFixed(2).replace('.', ',')}\n\n`
    }
    
    // Información de la constancia
    csvContent += 'INFORMACIÓN DE LA CONSTANCIA\n'
    csvContent += `Tipo de constancia,${certificateData.certificateInfo.certificateType}\n`
    csvContent += `Propósito,${certificateData.certificateInfo.purpose}\n`
    
    if (certificateData.certificateInfo.additionalInfo) {
      csvContent += `Información adicional,${certificateData.certificateInfo.additionalInfo}\n`
    }
    
    // Fecha de emisión en formato de texto
    const currentDate = nowInHonduras()
    const day = currentDate.getDate()
    const dayInWords = numberToWords(day)
    const monthInWords = currentDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()
    const yearInWords = numberToWords(currentDate.getFullYear())
    const dayPrefix = day === 1 ? 'al' : 'a los'
    const daySuffix = day === 1 ? 'día' : 'días'
    
    csvContent += `\nFecha de emisión completa,${dayPrefix} ${dayInWords} ${daySuffix} del mes de ${monthInWords} del año ${yearInWords}\n`

    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=constancia_laboral_${certificateData.employee.employee_code}_${getHondurasTimestamp().split('T')[0]}.csv`)
    
    res.send(csvContent)

  } catch (error) {
    console.error('Error generando CSV de constancia:', error)
    res.status(500).json({ error: 'Error generando CSV' })
  }
} 