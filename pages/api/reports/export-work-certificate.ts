import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { getHondurasTimestamp, formatDateForHonduras, nowInHonduras, parseDateOnlyAsHonduras } from '../../../lib/timezone'
import { createAdminClient } from '../../../lib/supabase/server'
import { assertEmployeePortalEnabled } from '../../../lib/employee-portal/company-settings'
import { canExportReports, EXPORT_REPORTS_FORBIDDEN } from '../../../lib/security/permissions'
import { resolveReportConfig } from '../../../lib/reports/column-resolver'
import { formatVoucherCompanyName } from '../../../lib/payroll/voucher-pdf-options'
import {
  generateWorkCertificatePDFBuffer,
  numberToWords,
  type WorkCertificatePayload,
} from '../../../lib/reports/work-certificate-pdf'
import {
  calculateIHSS,
  calculateRAP,
  getTaxBracketsForYear,
  type TaxConstants
} from '../../../lib/tax/honduras-tax'

type WorkCertificateData = WorkCertificatePayload

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Autenticación y autorización usando el mismo método que payroll
    const { supabase, companyId, role, userProfile } = await requireCompanyAccess(req, res)

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

    const isEmployeeSelf =
      role === 'employee' &&
      Boolean(userProfile?.employee_id) &&
      employeeId === userProfile.employee_id

    if (!isEmployeeSelf && !canExportReports(role, userProfile)) {
      return res.status(EXPORT_REPORTS_FORBIDDEN.status).json(EXPORT_REPORTS_FORBIDDEN.body)
    }

    if (isEmployeeSelf) {
      if (!(await assertEmployeePortalEnabled(supabase, companyId, res))) {
        return
      }
    }

    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Formato no válido. Use pdf o csv' })
    }

    // Obtener datos del empleado y generar constancia
    const certificateData = await generateWorkCertificateData(
      supabase, 
      employeeId, 
      companyId,
      role,
      certificateType,
      purpose,
      additionalInfo
    )

    if (!certificateData) {
      // Log detallado para diagnóstico
      console.error('Error generando constancia:', {
        employeeId,
        companyId,
        role,
        timestamp: new Date().toISOString()
      })
      return res.status(404).json({ 
        error: 'Empleado no encontrado o sin permisos',
        details: 'Verifique que el empleado existe y pertenece a su empresa'
      })
    }

    const taxYear = nowInHonduras().getFullYear()
    const taxConstants = await getTaxBracketsForYear(taxYear, 'HND')
    const resolvedConfig = companyId
      ? await resolveReportConfig(companyId, 'work_certificate', supabase)
      : null

    // Generar reporte según formato
    if (format === 'pdf') {
      const pdf = await generateWorkCertificatePDFBuffer(certificateData, taxConstants, {
        branding: resolvedConfig?.branding,
        includeDeductions,
      })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=constancia_laboral_${certificateData.employee.employee_code}_${getHondurasTimestamp().split('T')[0]}.pdf`
      )
      res.send(pdf)
    } else {
      generateWorkCertificateCSV(res, certificateData, includeDeductions, taxConstants, resolvedConfig?.branding)
    }

  } catch (error) {
    console.error('Error generando constancia de trabajo:', error)
    // Solo enviar error JSON si no se han enviado headers aún
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  }
}

async function generateWorkCertificateData(
  supabase: any, 
  employeeId: string, 
  companyId: string | null,
  role: string,
  certificateType: string,
  purpose: string,
  additionalInfo: string
): Promise<WorkCertificateData | null> {
  try {
    // Use admin client to bypass RLS policies
    const adminClient = createAdminClient()
    
    // Construir query base para empleado (incluir termination_date para empleados inactivos)
    let employeeQuery = adminClient
      .from('employees')
      .select(`
        id,
        name,
        email,
        employee_code,
        dni,
        role,
        hire_date,
        termination_date,
        base_salary,
        status,
        company_id,
        departments!employees_department_id_fkey(name),
        companies!employees_company_id_fkey(name)
      `)
      .eq('id', employeeId)

    // Aplicar filtro por empresa si no es superadmin
    if (role !== 'super_admin' && companyId) {
      employeeQuery = employeeQuery.eq('company_id', companyId)
    }

    let { data: employee, error: empError } = await employeeQuery.single()

    if (empError) {
      console.error('Error querying employee for certificate:', {
        error: empError,
        employeeId,
        companyId,
        role,
        query: 'primary with company filter'
      })
    }

    // Fallback: si no se encuentra y el rol es admin, intentar sin filtro de empresa
    if ((!employee || empError) && role !== 'super_admin' && companyId) {
      console.log('Intentando fallback query sin filtro de empresa para employeeId:', employeeId)
      const { data: fallbackEmp, error: fallbackErr } = await adminClient
        .from('employees')
        .select(`
          id,
          name,
          email,
          employee_code,
          dni,
          role,
          hire_date,
          termination_date,
          base_salary,
          status,
          company_id,
          departments!employees_department_id_fkey(name),
          companies!employees_company_id_fkey(name)
        `)
        .eq('id', employeeId)
        .single()

      if (!fallbackErr && fallbackEmp) {
        console.log('Empleado encontrado en fallback query:', {
          employeeId: fallbackEmp.id,
          employeeCompanyId: fallbackEmp.company_id,
          userCompanyId: companyId
        })
        employee = fallbackEmp
      } else if (fallbackErr) {
        console.error('Error en fallback query:', fallbackErr)
      }
    }

    if (!employee) {
      console.error('Empleado no encontrado para constancia:', {
        employeeId,
        companyId,
        role,
        primaryError: empError?.message,
        searchedWithCompanyFilter: role !== 'super_admin' && companyId
      })
      return null
    }

    // Verificar que el empleado pertenece a la empresa del usuario (si no es superadmin)
    if (role !== 'super_admin' && companyId && employee.company_id !== companyId) {
      console.error('Empleado no pertenece a la empresa del usuario:', {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeCompanyId: employee.company_id,
        userCompanyId: companyId,
        role
      })
      return null
    }

    // Safely extract department and company names (handle both array and object responses)
    const departments = employee.departments as any
    const companies = employee.companies as any
    
    const departmentName = departments 
      ? (Array.isArray(departments) ? departments[0]?.name : departments.name)
      : 'No especificado'
    
    const companyName = companies
      ? (Array.isArray(companies) ? companies[0]?.name : companies.name)
      : 'No especificado'

    const certificateData: WorkCertificateData = {
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employee_code: employee.employee_code,
        dni: employee.dni,
        position: employee.role || 'No especificado',
        department_name: departmentName || 'No especificado',
        company_name: companyName || 'No especificado',
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

// Calcular IHSS / RAP con parámetros estatutarios del año vigente
function calcularIHSSConstancia(salarioBase: number, constants: TaxConstants): number {
  return Math.round(calculateIHSS(salarioBase, constants) * 100) / 100
}

function calcularRAPConstancia(salarioBase: number, constants: TaxConstants): number {
  return Math.round(calculateRAP(salarioBase, constants) * 100) / 100
}

function formatDateInWords(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()
  const dayInWords = numberToWords(day)
  const dayCapitalized = dayInWords.charAt(0).toUpperCase() + dayInWords.slice(1)
  return `${dayCapitalized} de ${month}`
}

function generateWorkCertificateCSV(
  res: NextApiResponse,
  certificateData: WorkCertificateData,
  includeDeductions: boolean = true,
  taxConstants: TaxConstants,
  branding?: { legalName?: string; useLegalSuffix?: boolean }
) {
  try {
    const legalCompanyName = formatVoucherCompanyName(branding, certificateData.employee.company_name)
    let csvContent = 'CONSTANCIA LABORAL\n\n'
    
    // Información de la empresa
    csvContent += `Empresa,${legalCompanyName}\n`
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
    const hireDate = /^\d{4}-\d{2}-\d{2}$/.test(certificateData.employee.hire_date)
      ? parseDateOnlyAsHonduras(certificateData.employee.hire_date)
      : new Date(certificateData.employee.hire_date)
    const isActive = certificateData.employee.status === 'active'
    let periodText = ''
    if (isActive) {
      periodText = `desde el ${formatDateInWords(hireDate)} de ${hireDate.getFullYear()} hasta la fecha`
    } else if (certificateData.employee.termination_date) {
      const terminationDate = /^\d{4}-\d{2}-\d{2}$/.test(certificateData.employee.termination_date)
        ? parseDateOnlyAsHonduras(certificateData.employee.termination_date)
        : new Date(certificateData.employee.termination_date)
      periodText = `desde el ${formatDateInWords(hireDate)} de ${hireDate.getFullYear()} hasta el ${formatDateInWords(terminationDate)} de ${terminationDate.getFullYear()}`
    } else {
      periodText = `desde el ${formatDateInWords(hireDate)} de ${hireDate.getFullYear()} hasta la fecha`
    }
    csvContent += `Período de empleo,${periodText}\n`
    csvContent += `Salario mensual,L. ${certificateData.employee.base_salary.toFixed(2).replace('.', ',')}\n\n`
    
    // Desglose salarial (solo si includeDeductions es true)
    if (includeDeductions) {
      // Calcular deducciones mensuales (igual que en PDF)
      const ihssMonthly = calcularIHSSConstancia(certificateData.employee.base_salary, taxConstants)
      const rapMonthly = calcularRAPConstancia(certificateData.employee.base_salary, taxConstants)
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