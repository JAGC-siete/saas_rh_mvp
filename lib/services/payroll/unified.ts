// Servicio unificado de nómina - Backend
// Unifica planilla y detalle por empleado en un solo endpoint

import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

// Constantes de deducciones (Honduras)
export const IHSS_PERCENT: number = 2.5 // IHSS 2.5%
export const RAP_PERCENT: number = 1.0 // RAP 1% (⚠️ históricamente era 1.5%)
export const RAP_PERCENT_HISTORICAL: number = 1.5 // Valor histórico para comparación
export const ISR_BRACKETS = [
  { min: 0, max: 10000, rate: 0 },
  { min: 10000, max: 20000, rate: 15 },
  { min: 20000, max: 35000, rate: 20 },
  { min: 35000, max: 50000, rate: 25 },
  { min: 50000, max: Infinity, rate: 30 }
]

export type PayrollParams = {
  companyId: string
  year: number
  month: number
  quincena?: 'Q1' | 'Q2' | 'Ambas'
  includeMissingEmployees?: boolean
}

export type PayrollDTO = {
  periodo: {
    companyId: string
    year: number
    month: number
    quincena: 'Q1' | 'Q2' | 'Ambas'
  }
  resumen: {
    empleados: number
    total_bruto: number
    total_deducciones: {
      IHSS: number
      RAP: number
      ISR: number
      otros: number
    }
    total_neto: number
    advertencias: string[]
  }
  detalle: Array<{
    employee_id: string
    nombre: string
    salario_base: number
    horas_trabajadas: number
    extras: {
      horas: number
      monto: number
    }
    deducciones: {
      IHSS: number
      RAP: number
      ISR: number
      otros: number
    }
    neto: number
    observaciones?: string
  }>
  fuente: {
    asistencia_sync_at?: string
    nomina_version: string
    regimen: 'Q2-if-net>10000'
  }
}

export async function getUnifiedPayroll(params: PayrollParams): Promise<PayrollDTO> {
  const {
    companyId,
    year,
    month,
    quincena = 'Ambas',
    includeMissingEmployees = true
  } = params

  // Validaciones básicas
  if (!companyId || !year || !month) {
    throw new Error('Parámetros requeridos: companyId, year, month')
  }

  if (month < 1 || month > 12) {
    throw new Error('Mes debe estar entre 1 y 12')
  }

  // Obtener empleados activos
  const supabase = createPagesServerClient({ req: {} as NextApiRequest, res: {} as NextApiResponse })
  
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, name, base_salary, status, hire_date, department')
    .eq('company_id', companyId)
    .eq('status', 'active')

  if (empError) throw new Error(`Error obteniendo empleados: ${empError.message}`)

  // Obtener datos de asistencia para el período
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // Último día del mes

  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select('employee_id, date, check_in, check_out, late_minutes')
    .eq('company_id', companyId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  if (attError) throw new Error(`Error obteniendo asistencia: ${attError.message}`)

  // Calcular rango de quincena
  const quincenaRanges = getQuincenaRanges(year, month, quincena)
  
  // Procesar cada empleado
  const detalle: PayrollDTO['detalle'] = []
  const advertencias: string[] = []
  let totalBruto = 0
  let totalDeducciones = { IHSS: 0, RAP: 0, ISR: 0, otros: 0 }

  for (const employee of employees || []) {
    const employeeAttendance = attendance?.filter(a => a.employee_id === employee.id) || []
    
    if (employeeAttendance.length === 0 && !includeMissingEmployees) {
      advertencias.push(`Empleado ${employee.name} sin registros de asistencia`)
      continue
    }

    // Calcular horas trabajadas para la quincena
    const { horasTrabajadas, horasExtras, diasTrabajados, diasAusentes, diasTardes } = 
      calculateWorkHours(employeeAttendance, quincenaRanges)

    // Calcular salario
    const tarifaHora = employee.base_salary / 30 / 8
    const salarioBase = employee.base_salary * (diasTrabajados / 30)
    const montoExtras = horasExtras * tarifaHora * 1.5 // Factor 1.5 para extras
    const salarioBruto = salarioBase + montoExtras

    // Calcular deducciones (solo en Q2 si neto > 10000)
    const shouldApplyDeductions = quincena === 'Q2' && salarioBruto > 10000
    const deducciones = shouldApplyDeductions ? calculateDeductions(salarioBruto) : { IHSS: 0, RAP: 0, ISR: 0, otros: 0 }
    
    const neto = salarioBruto - Object.values(deducciones).reduce((sum, val) => sum + val, 0)

    // Observaciones
    const observaciones: string[] = []
    if (employeeAttendance.length === 0) observaciones.push('Sin asistencia')
    if (diasAusentes > 0) observaciones.push(`${diasAusentes} días ausentes`)
    if (diasTardes > 0) observaciones.push(`${diasTardes} días tarde`)

    detalle.push({
      employee_id: employee.id,
      nombre: employee.name,
      salario_base: employee.base_salary,
      horas_trabajadas: horasTrabajadas,
      extras: {
        horas: horasExtras,
        monto: montoExtras
      },
      deducciones,
      neto,
      observaciones: observaciones.length > 0 ? observaciones.join(', ') : undefined
    })

    totalBruto += salarioBruto
    totalDeducciones.IHSS += deducciones.IHSS
    totalDeducciones.RAP += deducciones.RAP
    totalDeducciones.ISR += deducciones.ISR
    totalDeducciones.otros += deducciones.otros
  }

  // Advertencias adicionales
  if (RAP_PERCENT !== RAP_PERCENT_HISTORICAL) {
    advertencias.push(`RAP=${RAP_PERCENT}% (históricamente era ${RAP_PERCENT_HISTORICAL}%)`)
  }

  const totalNeto = totalBruto - Object.values(totalDeducciones).reduce((sum, val) => sum + val, 0)

  return {
    periodo: {
      companyId,
      year,
      month,
      quincena
    },
    resumen: {
      empleados: detalle.length,
      total_bruto: totalBruto,
      total_deducciones: totalDeducciones,
      total_neto: totalNeto,
      advertencias
    },
    detalle,
    fuente: {
      asistencia_sync_at: attendance?.[0]?.date,
      nomina_version: '1.0.0',
      regimen: 'Q2-if-net>10000'
    }
  }
}

// Utilidades de cálculo
function getQuincenaRanges(year: number, month: number, quincena: string) {
  const ranges: Array<{ start: number; end: number }> = []
  
  if (quincena === 'Q1' || quincena === 'Ambas') {
    ranges.push({ start: 1, end: 15 })
  }
  
  if (quincena === 'Q2' || quincena === 'Ambas') {
    const lastDay = new Date(year, month, 0).getDate()
    ranges.push({ start: 16, end: lastDay })
  }
  
  return ranges
}

function calculateWorkHours(attendance: any[], quincenaRanges: Array<{ start: number; end: number }>) {
  let horasTrabajadas = 0
  let horasExtras = 0
  let diasTrabajados = 0
  let diasAusentes = 0
  let diasTardes = 0

  for (const record of attendance) {
    const recordDate = new Date(record.date)
    const day = recordDate.getDate()
    
    // Verificar si está en el rango de quincena
    const inRange = quincenaRanges.some(range => day >= range.start && day <= range.end)
    if (!inRange) continue

    // Verificar si es día laboral (lunes a viernes)
    const dayOfWeek = recordDate.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue // Fines de semana

    if (record.check_in && record.check_out) {
      const checkIn = new Date(`${record.date}T${record.check_in}`)
      const checkOut = new Date(`${record.date}T${record.check_out}`)
      const hoursWorked = Math.max(0, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60))
      
      if (hoursWorked > 0) {
        horasTrabajadas += hoursWorked
        diasTrabajados++
        
        // Horas extras (más de 8 horas)
        if (hoursWorked > 8) {
          horasExtras += hoursWorked - 8
        }
      }
    } else {
      diasAusentes++
    }

    if (record.late_minutes > 0) {
      diasTardes++
    }
  }

  return { horasTrabajadas, horasExtras, diasTrabajados, diasAusentes, diasTardes }
}

function calculateDeductions(salarioBruto: number) {
  const IHSS = salarioBruto * (IHSS_PERCENT / 100)
  const RAP = salarioBruto * (RAP_PERCENT / 100)
  
  // Calcular ISR por tramos
  let ISR = 0
  let remainingSalary = salarioBruto
  
  for (const bracket of ISR_BRACKETS) {
    if (remainingSalary <= 0) break
    
    const taxableAmount = Math.min(remainingSalary, bracket.max - bracket.min)
    ISR += taxableAmount * (bracket.rate / 100)
    remainingSalary -= taxableAmount
  }

  return { IHSS, RAP, ISR, otros: 0 }
}

// Generar ETag para cache
export function generateETag(companyId: string, year: number, month: number, quincena: string, lastUpdate?: string): string {
  const data = `${companyId}-${year}-${month}-${quincena}-${lastUpdate || 'no-data'}`
  return crypto.createHash('sha1').update(data).digest('hex')
}
