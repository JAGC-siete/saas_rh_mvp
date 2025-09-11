import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { nowInHonduras } from '../../../lib/timezone'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Use the new authentication method that handles company context properly
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    console.log('Usuario autenticado para preview de nómina:', { 
      companyId: companyId 
    })
    
    // DEBUG: Verificar qué company_id está usando
    console.log('🔍 DEBUG - Company ID del usuario:', companyId)

    const { year, month, quincena, tipo } = req.query
    
    // DEBUG: Verificar parámetros recibidos
    console.log('🔍 DEBUG - Parámetros recibidos:', { year, month, quincena, tipo })
    
    // Validaciones
    if (!year || !month || !quincena) {
      return res.status(400).json({ error: 'year, month, y quincena son requeridos' })
    }
    
    const yearNum = parseInt(year as string)
    const monthNum = parseInt(month as string)
    const quincenaNum = parseInt(quincena as string)
    const tipoParam = tipo as string || 'CON'
    
    if (![1, 2].includes(quincenaNum)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    if (!['CON', 'SIN'].includes(tipoParam)) {
      return res.status(400).json({ error: 'Tipo inválido (debe ser CON o SIN)' })
    }

    // Validar que no sea un período futuro
    const currentDate = nowInHonduras()
    const periodDate = new Date(yearNum, monthNum - 1, 1)
    
    if (periodDate > currentDate) {
      return res.status(400).json({ 
        error: 'Período inválido',
        message: 'No se puede generar nómina para períodos futuros'
      })
    }

    // Calcular fechas del período
    const ultimoDia = new Date(yearNum, monthNum, 0).getDate()
    const fechaInicio = quincenaNum === 1 ? `${yearNum}-${monthNum.toString().padStart(2, '0')}-01` : `${yearNum}-${monthNum.toString().padStart(2, '0')}-16`
    const fechaFin = quincenaNum === 1 ? `${yearNum}-${monthNum.toString().padStart(2, '0')}-15` : `${yearNum}-${monthNum.toString().padStart(2, '0')}-${ultimoDia}`

    // Crear o actualizar corrida de planilla
    const { data: runResult, error: runError } = await supabase.rpc('create_or_update_payroll_run', {
      p_company_uuid: companyId,
      p_year: yearNum,
      p_month: monthNum,
      p_quincena: quincenaNum,
      p_tipo: tipoParam,
      p_user_id: companyId
    })

    if (runError) {
      console.error('Error creando corrida de planilla:', runError)
      return res.status(500).json({ error: 'Error creando corrida de planilla' })
    }

    const runId = runResult

    // Obtener empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status, department_id')
      .eq('status', 'active')
      .eq('company_id', companyId)
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
    
    // DEBUG: Verificar cuántos empleados se encontraron
    console.log('🔍 DEBUG - Empleados encontrados:', employees.length)
    console.log('🔍 DEBUG - Company ID usado:', companyId)
    console.log('🔍 DEBUG - Primeros 3 empleados:', employees.slice(0, 3))
    console.log('🔍 DEBUG - Primeros 3 empleados:', employees.slice(0, 3).map((emp: any) => ({
      name: emp.name,
      status: emp.status
    })))

    // Obtener registros de asistencia del período
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select('employee_id, date, check_in, check_out, status')
      .gte('date', fechaInicio)
      .lte('date', fechaFin)

    if (attError) {
      console.error('Error obteniendo registros de asistencia:', attError)
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    // Filtrar empleados según criterio de asistencia
    let empleadosParaNomina = employees
    
    // Si hay registros de asistencia, filtrar por empleados con asistencia
    // Si no hay registros de asistencia, incluir todos los empleados activos
    if (attendanceRecords.length > 0) {
      empleadosParaNomina = employees.filter((emp: any) =>
        attendanceRecords.some((record: any) => 
          record.employee_id === emp.id && 
          record.check_in && 
          record.check_out &&
          record.status !== 'absent')
      )
    } else {
      // Si no hay registros de asistencia, incluir todos los empleados activos
      empleadosParaNomina = employees
    }

    if (empleadosParaNomina.length === 0) {
      return res.status(400).json({ 
        error: 'No hay empleados disponibles',
        message: 'No se encontraron empleados activos para generar la nómina'
      })
    }

    console.log(`Procesando preview de nómina para ${empleadosParaNomina.length} empleados`)
    
          // DEBUG: Verificar el filtro de asistencia
      console.log('🔍 DEBUG - Tipo de nómina:', tipoParam)
      console.log('🔍 DEBUG - Total registros de asistencia:', attendanceRecords.length)
      console.log('🔍 DEBUG - Empleados después del filtro de asistencia:', empleadosParaNomina.length)
      console.log('🔍 DEBUG - Lógica de deducciones: tipo=' + tipoParam + ' → deducciones=' + (tipoParam === 'CON' ? 'SÍ' : 'NO'))

    // Calcular planilla con CÁLCULOS CORRECTOS 2025
    const planilla: any[] = []
    
    for (const emp of empleadosParaNomina) {
      const registros = attendanceRecords.filter((record: any) => 
        record.employee_id === emp.id && 
        record.check_in && 
        record.check_out)
      
      // CALCULAR DÍAS TRABAJADOS EN LA QUINCENA ACTUAL
      const diasQuincena = quincenaNum === 1 ? 15 : ultimoDia - 15
      
      // Si hay registros de asistencia, usar la cantidad real
      // Si no hay registros, asumir que trabajó todos los días de la quincena
      const days_worked = registros.length > 0 ? registros.length : diasQuincena
      const days_absent = diasQuincena - days_worked
      
      const base_salary = Number(emp.base_salary) || 0
      
      // CALCULAR SALARIO QUINCENAL (SALARIO MENSUAL / 2)
      const salarioQuincenal = base_salary / 2
      const total_earnings = salarioQuincenal
      
      let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0

      // APLICAR DEDUCCIONES SEGÚN EL TIPO (independientemente de la quincena)
      if (tipoParam === 'CON') {
        // CÁLCULOS CORRECTOS 2025 - DEDUCCIONES MENSUALES COMPLETAS
        IHSS = Math.min(base_salary, 11903.13) * 0.05  // Deducción mensual completa
        RAP = Math.max(0, base_salary - 11903.13) * 0.015    // Deducción mensual completa
        
        // ISR según tabla MENSUAL de Honduras 2025
        if (base_salary > 21457.76) {
          if (base_salary <= 30969.88) {
            ISR = (base_salary - 21457.76) * 0.15
          } else if (base_salary <= 67604.36) {
            ISR = 1428.32 + (base_salary - 30969.88) * 0.20
          } else {
            ISR = 8734.32 + (base_salary - 67604.36) * 0.25
          }
        }
        
        total_deductions = IHSS + RAP + ISR
        total = total_earnings - total_deductions
      } else {
        // Tipo 'SIN': solo salario proporcional, sin deducciones
        total = total_earnings
      }

      // Crear línea de planilla usando la nueva función
      const { data: lineResult, error: lineError } = await supabase.rpc('insert_payroll_line', {
        p_run_id: runId,
        p_company_uuid: companyId,
        p_employee_id: emp.id,
        p_calc_hours: days_worked * 8, // 8 horas por día
        p_calc_bruto: total_earnings,
        p_calc_ihss: IHSS,
        p_calc_rap: RAP,
        p_calc_isr: ISR,
        p_calc_neto: total
      })

      if (lineError) {
        console.error(`Error creando línea para empleado ${emp.name}:`, lineError)
        continue
      }

      planilla.push({
        employee_id: emp.id,
        id: emp.dni,
        name: emp?.name,
        bank: emp.bank_name || '',
        bank_account: emp.bank_account || '',
        department: emp.department_id || 'Sin Departamento',
        base_salary: base_salary,
        monthly_salary: base_salary,
        days_worked,
        days_absent,
        total_earnings,
        IHSS: Math.round(IHSS * 100) / 100,
        RAP: Math.round(RAP * 100) / 100,
        ISR: Math.round(ISR * 100) / 100,
        total_deducciones: Math.round(total_deductions * 100) / 100,
        total: Math.round(total * 100) / 100,
        line_id: lineResult
      })
    }

    console.log(`Preview de nómina generado exitosamente para ${planilla.length} empleados`)
    console.log('🔍 DEBUG - RunId generado:', runId)
    console.log('🔍 DEBUG - Tipo procesado:', tipoParam)

    return res.status(200).json({
      message: 'Preview de nómina generado exitosamente',
      run_id: runId,
      year: yearNum,
      month: monthNum,
      quincena: quincenaNum,
      tipo: tipoParam,
      empleados: planilla.length,
      totalBruto: planilla.reduce((sum: number, row: any) => sum + row.total_earnings, 0),
      totalDeducciones: planilla.reduce((sum: number, row: any) => sum + row.total_deducciones, 0),
      totalNeto: planilla.reduce((sum: number, row: any) => sum + row.total, 0),
      planilla
    })

  } catch (error: any) {
    console.error('Payroll Preview API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error'
    })
  }
}
