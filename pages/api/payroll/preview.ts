import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { nowInHonduras } from '../../../lib/timezone'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import { secureLog, secureErrorLog } from '../../../lib/security/safe-logging'
import { 
  getTaxBracketsForYear, 
  calculateISR, 
  calculateIHSS, 
  calculateRAP 
} from '../../../lib/tax/honduras-tax'
import { getHolidayDatesInRange } from '../../../lib/attendance/holiday-check'
import { getBiweeklyPeriodDates, getMonthlyPeriodDates } from '../../../lib/payroll/period-dates'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Use the new authentication method that handles company context properly
    const { supabase, companyId, user } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    secureLog('Usuario autenticado para preview de nómina', { 
      companyId: companyId 
    })

    const { year, month, quincena, tipo } = req.query
    
    secureLog('Parámetros recibidos para preview', { 
      hasYear: !!year, 
      hasMonth: !!month, 
      hasQuincena: !!quincena, 
      tipo: tipo 
    })
    
    // Validaciones
    if (!year || !month || !quincena) {
      console.error('❌ ERROR - Parámetros faltantes:', { year, month, quincena, tipo })
      return res.status(400).json({ 
        error: 'year, month, y quincena son requeridos',
        received: { year, month, quincena, tipo }
      })
    }
    
    const yearNum = parseInt(year as string)
    const monthNum = parseInt(month as string)
    const quincenaNum = parseInt(quincena as string)
    const tipoParam = tipo as string || 'CON'
    
    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(quincenaNum)) {
      console.error('❌ ERROR - Parámetros inválidos (NaN):', { yearNum, monthNum, quincenaNum })
      return res.status(400).json({ 
        error: 'Parámetros numéricos inválidos',
        received: { year, month, quincena },
        parsed: { yearNum, monthNum, quincenaNum }
      })
    }
    
    if (![1, 2].includes(quincenaNum)) {
      console.error('❌ ERROR - Quincena inválida:', quincenaNum)
      return res.status(400).json({ 
        error: 'Quincena inválida (debe ser 1 o 2)',
        received: quincenaNum
      })
    }

    if (!['CON', 'SIN'].includes(tipoParam)) {
      console.error('❌ ERROR - Tipo inválido:', tipoParam)
      return res.status(400).json({ 
        error: 'Tipo inválido (debe ser CON o SIN)',
        received: tipoParam
      })
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

    // Obtener configuración de payroll (Capa 2: quincena_config + metadata)
    const { data: payrollConfig, error: configError } = await supabase
      .from('company_payroll_configs')
      .select('metadata, payment_frequency, quincena_config')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()
    
    if (configError) {
      console.error('Error obteniendo configuración de payroll:', configError)
    }
    
    const payrollMetadata = payrollConfig?.metadata || {}
    const qcCol = payrollConfig?.quincena_config as { first_start?: number; first_end?: number; second_start?: number; second_end?: number } | null
    const metaCutDates = payrollMetadata?.payment_cut_dates || {}
    const mapFreq = (v: string) => (v === 'mensual' ? 'monthly' : v === 'quincenal' ? 'biweekly' : v || 'biweekly')
    const paymentFrequency = mapFreq(payrollConfig?.payment_frequency || payrollMetadata.payment_frequency || 'quincenal')
    const hasCustomQuincena = !!(qcCol && (qcCol.first_start != null || qcCol.first_end != null || qcCol.second_start != null || qcCol.second_end != null))
    const paymentCutDates = qcCol
      ? {
          biweekly_type: (metaCutDates.biweekly_type === 'custom' || hasCustomQuincena) ? 'custom' as const : 'standard' as const,
          biweekly_first_start: qcCol.first_start ?? metaCutDates.biweekly_first_start ?? 1,
          biweekly_first_end: qcCol.first_end ?? metaCutDates.biweekly_first_end ?? 15,
          biweekly_second_start: qcCol.second_start ?? metaCutDates.biweekly_second_start ?? 16,
          biweekly_second_end: qcCol.second_end ?? metaCutDates.biweekly_second_end ?? 30,
          monthly_type: metaCutDates.monthly_type || 'standard',
          monthly_start: metaCutDates.monthly_start ?? 1,
          monthly_end: metaCutDates.monthly_end ?? 30
        }
      : {
          biweekly_type: metaCutDates.biweekly_type || 'standard',
          biweekly_first_start: metaCutDates.biweekly_first_start ?? 1,
          biweekly_first_end: metaCutDates.biweekly_first_end ?? 15,
          biweekly_second_start: metaCutDates.biweekly_second_start ?? 16,
          biweekly_second_end: metaCutDates.biweekly_second_end ?? 30,
          monthly_type: metaCutDates.monthly_type || 'standard',
          monthly_start: metaCutDates.monthly_start ?? 1,
          monthly_end: metaCutDates.monthly_end ?? 30
        }
    const legalDeductions = payrollMetadata.legal_deductions || {
      ihss: true,
      rap: true,
      isr: true,
      infop: false
    }
    
    // Calcular fechas del período según configuración
    const ultimoDia = new Date(yearNum, monthNum, 0).getDate()
    
    // Validar que ultimoDia sea válido
    if (!ultimoDia || ultimoDia < 1 || ultimoDia > 31) {
      console.error(`❌ ERROR - ultimoDia inválido: ${ultimoDia} para año ${yearNum}, mes ${monthNum}`)
      return res.status(400).json({ 
        error: 'Período inválido',
        message: `No se pudo calcular el último día del mes ${monthNum} del año ${yearNum}`
      })
    }
    
    let fechaInicio: string
    let fechaFin: string
    let diasPeriodo: number
    
    if (paymentFrequency === 'monthly') {
      // Nómina mensual (soporta offset: 28-27)
      const monthlyType = paymentCutDates?.monthly_type || 'standard'
      const ms = paymentCutDates?.monthly_start ?? 1
      const me = paymentCutDates?.monthly_end ?? 30
      if (monthlyType === 'custom' && ms && me) {
        const result = getMonthlyPeriodDates(yearNum, monthNum, ms, me)
        fechaInicio = result.fechaInicio
        fechaFin = result.fechaFin
        diasPeriodo = result.diasPeriodo
      } else {
        // Standard: del 1 al último día del mes
        fechaInicio = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`
        fechaFin = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${ultimoDia}`
        diasPeriodo = ultimoDia
      }
    } else {
      // Nómina quincenal (biweekly)
      const biweeklyType = paymentCutDates?.biweekly_type || 'standard'
      if (biweeklyType === 'custom' && paymentCutDates?.biweekly_first_start != null && paymentCutDates?.biweekly_first_end != null && 
          paymentCutDates?.biweekly_second_start != null && paymentCutDates?.biweekly_second_end != null) {
        const result = getBiweeklyPeriodDates(yearNum, monthNum, quincenaNum as 1 | 2, paymentCutDates)
        fechaInicio = result.fechaInicio
        fechaFin = result.fechaFin
        diasPeriodo = result.diasPeriodo
      } else {
        // Standard: 1-15 y 16-último día
        if (quincenaNum === 1) {
          fechaInicio = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`
          fechaFin = `${yearNum}-${monthNum.toString().padStart(2, '0')}-15`
          diasPeriodo = 15
        } else {
          fechaInicio = `${yearNum}-${monthNum.toString().padStart(2, '0')}-16`
          fechaFin = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${ultimoDia}`
          diasPeriodo = ultimoDia - 15
        }
      }
    }

    // Verificar si ya existe una corrida para este período
    const { data: existingRun, error: checkError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('quincena', quincenaNum)
      .eq('tipo', tipoParam)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found, which is OK
      console.error('Error verificando corrida existente:', checkError)
      return res.status(500).json({ 
        error: 'Error verificando corrida existente',
        details: checkError.message 
      })
    }

    console.log('🔍 DEBUG - Existing run check:', { existingRun, checkError })

    let runId: string

    if (existingRun) {
      // Si ya existe una corrida, verificar su estado y manejar según el caso
      console.log('🔍 DEBUG - Existing run found:', { id: existingRun.id, status: existingRun.status })
      
      if (existingRun.status === 'authorized') {
        console.log('⚠️ WARNING - Regenerating preview for authorized run')
        // UPSERT LOGIC: En lugar de error, permitir regenerar con advertencia
        // Cambiar estado a 'draft' para permitir ediciones
        const { error: resetError } = await supabase
          .from('payroll_runs')
          .update({ 
            status: 'draft',
            updated_at: nowInHonduras().toISOString()
          })
          .eq('id', existingRun.id)
          .eq('company_id', companyId)

        if (resetError) {
          console.error('Error resetting run status:', resetError)
          return res.status(500).json({ error: 'Error actualizando estado de corrida' })
        }

        // Eliminar líneas existentes para regenerar
        const { error: deleteError } = await supabase
          .from('payroll_run_lines')
          .delete()
          .eq('run_id', existingRun.id)
          .eq('company_id', companyId)

        if (deleteError) {
          console.error('Error deleting existing lines:', deleteError)
          return res.status(500).json({ error: 'Error eliminando líneas existentes' })
        }

        console.log('✅ Run reset to draft and lines cleared for regeneration')
      }
      
      runId = existingRun.id
    } else {
      // Crear nueva corrida
      const { data: newRun, error: createError } = await supabase
        .from('payroll_runs')
        .insert({
          company_id: companyId,
          year: yearNum,
          month: monthNum,
          quincena: quincenaNum,
          tipo: tipoParam,
          status: 'draft',
          created_by: user.id
        })
        .select('id')
        .single()

      console.log('🔍 DEBUG - New run creation:', { newRun, createError })

      if (createError) {
        console.error('Error creando nueva corrida:', createError)
        return res.status(500).json({ error: 'Error creando nueva corrida de planilla' })
      }

      if (!newRun || !newRun.id) {
        console.error('❌ ERROR - No se pudo obtener el ID de la nueva corrida')
        return res.status(500).json({ 
          error: 'Error creando nueva corrida de planilla',
          message: 'No se pudo obtener el ID de la corrida creada'
        })
      }

      runId = newRun.id
    }

    // Validar que runId existe antes de continuar
    if (!runId) {
      console.error('❌ ERROR - runId es null/undefined después de crear/obtener corrida')
      return res.status(500).json({ 
        error: 'Error interno: runId no disponible',
        message: 'No se pudo obtener o crear el ID de la corrida'
      })
    }

    console.log('🔍 DEBUG - Final RunId:', runId, 'Type:', typeof runId)

    // Obtener constantes fiscales para el año del período
    const taxConstants = await getTaxBracketsForYear(yearNum)

    // Obtener empleados activos con información de departamento, pay_type y horario (Capa 3: días Extra/Especial)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        id, name, dni, base_salary, bank_name, bank_account, status, department_id, pay_type, work_schedule_id,
        departments:department_id(name),
        work_schedules:work_schedule_id(monday_start, tuesday_start, wednesday_start, thursday_start, friday_start, saturday_start, sunday_start)
      `)
      .eq('status', 'active')
      .eq('company_id', companyId)
      .order('name')

    if (empError) {
      console.error('Error obteniendo empleados:', empError)
      console.error('Error details:', JSON.stringify(empError, null, 2))
      return res.status(500).json({ 
        error: 'Error obteniendo empleados',
        details: empError.message || String(empError),
        code: empError.code
      })
    }

    if (!employees || employees.length === 0) {
      secureLog('No hay empleados activos para preview', { companyId })
      return res.status(400).json({ 
        error: 'No hay empleados activos',
        message: 'No se encontraron empleados activos para generar la nómina'
      })
    }
    
    secureLog('Empleados encontrados para preview', { 
      employeesCount: employees.length,
      companyId 
    })
    console.log('🔍 DEBUG - Primeros 3 empleados:', employees.slice(0, 3))
    console.log('🔍 DEBUG - Primeros 3 empleados:', employees.slice(0, 3).map((emp: any) => ({
      name: emp.name,
      status: emp.status
    })))

    // Capa 3: Fechas festivas en el período (para días Extra/Especial)
    const holidayDates = await getHolidayDatesInRange(fechaInicio, fechaFin, companyId, supabase)

    // Obtener registros de asistencia del período (incluir flags para horario_no_detectado)
    // Filtrar solo por empleados de esta empresa usando los IDs ya obtenidos
    const employeeIds = employees.map((emp: any) => emp.id);
    
    console.log('🔍 DEBUG - Buscando registros de asistencia:', {
      totalEmployees: employeeIds.length,
      fechaInicio,
      fechaFin,
      primeros3EmployeeIds: employeeIds.slice(0, 3)
    });
    
    let attendanceRecords: any[] = [];
    if (employeeIds.length > 0) {
      const { data: attData, error: attError } = await supabase
        .from('attendance_records')
        .select('employee_id, date, check_in, check_out, status, flags')
        .in('employee_id', employeeIds)
        .gte('date', fechaInicio)
        .lte('date', fechaFin)

      if (attError) {
        console.error('Error obteniendo registros de asistencia:', attError)
        console.error('Error details:', JSON.stringify(attError, null, 2))
        return res.status(500).json({ 
          error: 'Error obteniendo registros de asistencia',
          details: attError.message || String(attError),
          code: attError.code
        })
      }
      
      attendanceRecords = attData || [];
      
      // DEBUG: Verificar si hay registros pero no coinciden con employee_ids
      if (attendanceRecords.length === 0) {
        console.warn('⚠️ WARNING - No se encontraron registros de asistencia en el rango de fechas')
        console.log('🔍 DEBUG - Verificando si hay registros fuera del rango...')
        
        // Consulta adicional para ver si hay registros de estos empleados en otras fechas
        const { data: attDataAnyDate, error: attErrorAnyDate } = await supabase
          .from('attendance_records')
          .select('employee_id, date, check_in, check_out, status')
          .in('employee_id', employeeIds.slice(0, 5)) // Solo primeros 5 para no sobrecargar
          .order('date', { ascending: false })
          .limit(10)
        
        if (!attErrorAnyDate && attDataAnyDate && attDataAnyDate.length > 0) {
          console.log('🔍 DEBUG - Se encontraron registros de asistencia fuera del rango:', {
            totalRegistrosFueraRango: attDataAnyDate.length,
            fechasEncontradas: [...new Set(attDataAnyDate.map((r: any) => r.date))],
            rangoBuscado: { fechaInicio, fechaFin }
          })
        }
      }
    }
    
    // DEBUG: Log información de asistencia antes del filtro
    console.log('🔍 DEBUG - Total registros de asistencia encontrados:', attendanceRecords.length)
    console.log('🔍 DEBUG - Rango de fechas buscado:', { fechaInicio, fechaFin })
    if (attendanceRecords.length > 0) {
      console.log('🔍 DEBUG - Primeros 5 registros de asistencia:', attendanceRecords.slice(0, 5).map((r: any) => ({
        employee_id: r.employee_id,
        date: r.date,
        check_in: r.check_in ? 'SI' : 'NO',
        check_out: r.check_out ? 'SI' : 'NO',
        status: r.status
      })))
    }
    console.log('🔍 DEBUG - Total empleados activos antes del filtro:', employees.length)
    console.log('🔍 DEBUG - IDs de empleados activos:', employees.map((e: any) => ({ id: e.id, name: e.name, pay_type: e.pay_type })))

    // Filtrar empleados según criterio de asistencia (diferente por pay_type)
    let empleadosParaNomina = employees
    let noAttendanceWarning = null
    
    // Si hay registros de asistencia, filtrar según tipo de pago
    if (attendanceRecords.length > 0) {
      empleadosParaNomina = employees.filter((emp: any) => {
        // Buscar TODOS los registros del empleado (sin filtrar por check_in todavía)
        const allEmpRecords = attendanceRecords.filter((record: any) => 
          record.employee_id === emp.id
        );
        
        console.log(`🔍 DEBUG - Empleado ${emp.name} (${emp.id}):`, {
          pay_type: emp.pay_type,
          totalRecords: allEmpRecords.length,
          records: allEmpRecords.map((r: any) => ({
            date: r.date,
            check_in: r.check_in,
            check_out: r.check_out,
            status: r.status
          }))
        });
        
        // Filtrar registros válidos (con check_in y no ausentes)
        const empRecords = allEmpRecords.filter((record: any) => 
          record.check_in &&
          record.status !== 'absent'
        );

        if (empRecords.length === 0) {
          console.log(`❌ DEBUG - Empleado ${emp.name} rechazado: sin registros válidos`)
          return false;
        }

        const payType = emp.pay_type || 'fixed'; // Default a 'fixed'

        if (payType === 'fixed') {
          // Administrativos: requieren check_in (check_out opcional para MVP)
          // Aceptar si tiene al menos check_in
          const hasValidRecord = empRecords.some((record: any) => record.check_in);
          console.log(`✅ DEBUG - Empleado ${emp.name} (fixed): ${hasValidRecord ? 'ACEPTADO' : 'RECHAZADO'}`)
          return hasValidRecord;
        } else if (payType === 'hourly') {
          // Por hora: requieren check_in Y check_out para contar horas trabajadas
          const hasValidRecord = empRecords.some((record: any) => 
            record.check_in && record.check_out
          );
          console.log(`✅ DEBUG - Empleado ${emp.name} (hourly): ${hasValidRecord ? 'ACEPTADO' : 'RECHAZADO'}`)
          return hasValidRecord;
        }

        // Default: aceptar si tiene check_in
        const hasValidRecord = empRecords.some((record: any) => record.check_in);
        console.log(`✅ DEBUG - Empleado ${emp.name} (default): ${hasValidRecord ? 'ACEPTADO' : 'RECHAZADO'}`)
        return hasValidRecord;
      });
    } else {
      // Si no hay registros de asistencia, incluir todos los empleados activos
      empleadosParaNomina = employees
      noAttendanceWarning = {
        message: 'No se encontraron registros de asistencia para el período seleccionado.',
        detail: 'Se incluirán todos los empleados activos en la nómina.',
        action: 'confirm'
      }
    }

    if (empleadosParaNomina.length === 0) {
      console.warn('⚠️ WARNING - No hay empleados disponibles después del filtro de asistencia')
      console.log('🔍 DEBUG - Total empleados activos:', employees.length)
      console.log('🔍 DEBUG - Total registros de asistencia:', attendanceRecords.length)
      console.log('🔍 DEBUG - Rango de fechas:', { fechaInicio, fechaFin })
      
      // En lugar de retornar error 400, retornar datos vacíos (comportamiento estándar)
      // Esto permite que la UI muestre "0 empleados" en lugar de un error
      return res.status(200).json({
        message: 'No hay empleados con asistencia para el período seleccionado',
        run_id: runId,
        status: 'draft',
        year: yearNum,
        month: monthNum,
        quincena: quincenaNum,
        tipo: tipoParam,
        empleados: 0,
        empleados_fixed: 0,
        empleados_hourly: 0,
        totalBruto: 0,
        totalDeducciones: 0,
        totalNeto: 0,
        totalBrutoFixed: 0,
        totalDeduccionesFixed: 0,
        totalNetoFixed: 0,
        totalBrutoHourly: 0,
        totalDeduccionesHourly: 0,
        totalNetoHourly: 0,
        planilla_fixed: [],
        planilla_hourly: [],
        planilla: [],
        warning: attendanceRecords.length === 0 
          ? 'No se encontraron registros de asistencia para el período seleccionado'
          : 'No se encontraron empleados con asistencia válida para el período seleccionado',
        noAttendanceWarning: attendanceRecords.length === 0 ? {
          message: 'No se encontraron registros de asistencia para el período seleccionado.',
          detail: 'Se incluirán todos los empleados activos en la nómina.',
          action: 'confirm'
        } : null
      })
    }

    console.log(`Procesando preview de nómina para ${empleadosParaNomina.length} empleados`)
    
          // DEBUG: Verificar el filtro de asistencia
      console.log('🔍 DEBUG - Tipo de nómina:', tipoParam)
      console.log('🔍 DEBUG - Total registros de asistencia:', attendanceRecords.length)
      console.log('🔍 DEBUG - Empleados después del filtro de asistencia:', empleadosParaNomina.length)
      console.log('🔍 DEBUG - Lógica de deducciones: tipo=' + tipoParam + ' → deducciones=' + (tipoParam === 'CON' ? 'SÍ' : 'NO'))

    // Calcular planilla con CÁLCULOS CORRECTOS 2025
    // Separar en dos arrays: fixed y hourly
    const planilla_fixed: any[] = []
    const planilla_hourly: any[] = []
    
    // Función auxiliar para calcular horas trabajadas desde registros
    const calculateHoursWorked = (registros: any[]): number => {
      let totalHours = 0
      for (const record of registros) {
        if (record.check_in && record.check_out) {
          const checkIn = new Date(record.check_in)
          const checkOut = new Date(record.check_out)
          const diffMs = checkOut.getTime() - checkIn.getTime()
          const hours = diffMs / (1000 * 60 * 60) // Convertir a horas
          totalHours += Math.max(0, hours) // Evitar horas negativas
        }
      }
      return totalHours
    }
    
    for (const emp of empleadosParaNomina) {
      const payType = emp.pay_type || 'fixed'; // Default a 'fixed'
      
      // Filtrar registros según tipo de pago
      let registros: any[];
      if (payType === 'fixed') {
        // Administrativos: contar días con check_in (check_out opcional)
        registros = attendanceRecords.filter((record: any) => 
          record.employee_id === emp.id && 
          record.check_in
        );
      } else {
        // Por hora: solo contar registros completos (check_in y check_out)
        registros = attendanceRecords.filter((record: any) => 
          record.employee_id === emp.id && 
          record.check_in && 
          record.check_out
        );
      }
      
      const base_salary = Number(emp.base_salary) || 0
      
      // Manejar el caso donde departments puede ser null o un array
      let departmentName = 'Sin Departamento'
      if (emp.departments) {
        if (Array.isArray(emp.departments) && emp.departments.length > 0) {
          departmentName = emp.departments[0]?.name || 'Sin Departamento'
        } else if (typeof emp.departments === 'object' && emp.departments.name) {
          departmentName = emp.departments.name
        }
      }

      if (payType === 'fixed') {
        // ========== EMPLEADOS FIJOS (FIXED) ==========
        const days_worked = registros.length > 0 ? registros.length : diasPeriodo
        const days_absent = diasPeriodo - days_worked

        // Capa 3: Días Extra/Especial (festivo o descanso con asistencia)
        const schedule = emp.work_schedules as Record<string, string | null> | null
        const dayCols: Record<number, string> = {
          0: 'sunday_start', 1: 'monday_start', 2: 'tuesday_start', 3: 'wednesday_start',
          4: 'thursday_start', 5: 'friday_start', 6: 'saturday_start',
        }
        let days_extra = 0
        for (const r of registros) {
          const isHoliday = holidayDates.has(r.date)
          const d = new Date(r.date + 'T12:00:00')
          const dow = d.getDay()
          const col = dayCols[dow]
          const isRestDay = schedule && col && !schedule[col]
          if (isHoliday || isRestDay) days_extra++
        }
        
        // CALCULAR SALARIO SEGÚN payment_frequency
        let total_earnings = 0
        if (paymentFrequency === 'monthly') {
          // Nómina mensual: usar salario completo proporcional a días trabajados
          if (ultimoDia > 0) {
            total_earnings = (base_salary / ultimoDia) * days_worked
          } else {
            console.warn(`⚠️ WARNING - ultimoDia es 0 para empleado ${emp.name}, usando salario completo`)
            total_earnings = base_salary
          }
        } else {
          // Nómina quincenal (biweekly): dividir salario mensual / 2 y ajustar por días trabajados
          const salarioQuincenal = base_salary / 2
          if (diasPeriodo > 0) {
            total_earnings = salarioQuincenal * (days_worked / diasPeriodo)
          } else {
            console.warn(`⚠️ WARNING - diasPeriodo es 0 para empleado ${emp.name}, usando salario quincenal completo`)
            total_earnings = salarioQuincenal
          }
        }
        
        // Validar que total_earnings sea un número válido
        if (!isFinite(total_earnings) || isNaN(total_earnings)) {
          console.error(`❌ ERROR - total_earnings inválido para empleado ${emp.name}:`, total_earnings)
          total_earnings = 0
        }
        
        let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0

        // APLICAR DEDUCCIONES SEGÚN legal_deductions (solo si tipoParam === 'CON')
        if (tipoParam === 'CON') {
          // CÁLCULOS CON TABLA FISCAL DEL AÑO CORRESPONDIENTE - DEDUCCIONES MENSUALES COMPLETAS
          if (legalDeductions.ihss) {
            IHSS = calculateIHSS(base_salary, taxConstants)
          }
          
          if (legalDeductions.rap) {
            RAP = calculateRAP(base_salary, taxConstants)
          }
          
          if (legalDeductions.isr) {
            ISR = calculateISR(base_salary, taxConstants.isr_brackets)
          }
          
          total_deductions = IHSS + RAP + ISR
          total = total_earnings - total_deductions
        } else {
          // Tipo 'SIN': solo salario proporcional, sin deducciones
          total = total_earnings
        }

        // Validar que runId existe antes de insertar
        if (!runId) {
          console.error(`❌ ERROR - runId es null/undefined para empleado ${emp.name}`)
          return res.status(500).json({ 
            error: 'Error interno: runId no disponible',
            message: `No se pudo obtener el ID de la corrida para insertar la línea del empleado ${emp.name}`
          })
        }

        // Validar que todos los valores numéricos sean válidos antes de insertar
        const numericValues = {
          days_worked,
          total_earnings,
          IHSS,
          RAP,
          ISR,
          total
        }
        
        for (const [key, value] of Object.entries(numericValues)) {
          if (!isFinite(value) || isNaN(value)) {
            console.error(`❌ ERROR - Valor inválido ${key} para empleado ${emp.name}:`, value)
            return res.status(500).json({ 
              error: 'Error en cálculo de nómina',
              message: `Valor inválido ${key} para el empleado ${emp.name}: ${value}`
            })
          }
        }

        const lineMetadata: Record<string, unknown> = { tax_year: yearNum }
        if (days_extra > 0) {
          lineMetadata.days_extra = days_extra
          lineMetadata.notes_extra = `${days_extra} día(s) Extra/Especial (festivo/descanso)`
        }

        // Insertar línea en payroll_run_lines
        const { data: insertedLine, error: lineError } = await supabase
          .from('payroll_run_lines')
          .upsert({
            run_id: runId,
            company_id: companyId,
            employee_id: emp.id,
            calc_hours: days_worked,
            calc_bruto: total_earnings,
            calc_ihss: IHSS,
            calc_rap: RAP,
            calc_isr: ISR,
            calc_neto: total,
            eff_hours: days_worked,
            eff_bruto: total_earnings,
            eff_ihss: IHSS,
            eff_rap: RAP,
            eff_isr: ISR,
            eff_neto: total,
            edited: false,
            tax_year: yearNum,
            metadata: lineMetadata,
          }, {
            onConflict: 'run_id,employee_id',
            ignoreDuplicates: false
          })
          .select('id')
          .maybeSingle()
          
        if (lineError) {
          console.error(`❌ ERROR insertando línea para empleado ${emp.name}:`, lineError)
          return res.status(500).json({ 
            error: 'Error insertando línea de nómina',
            message: `No se pudo insertar la línea para el empleado ${emp.name}: ${lineError.message}`,
            details: lineError,
            code: lineError.code
          })
        }
        
        if (!insertedLine) {
          console.error(`❌ ERROR - No se retornó línea insertada para empleado ${emp.name}`)
          return res.status(500).json({ 
            error: 'Error insertando línea de nómina',
            message: `No se pudo obtener el ID de la línea insertada para el empleado ${emp.name}`
          })
        }

        planilla_fixed.push({
          employee_id: emp.id,
          id: emp.dni || emp.id,
          name: emp?.name || 'Sin nombre',
          bank: emp.bank_name || 'No especificado',
          bank_account: emp.bank_account || 'No especificado',
          department: departmentName,
          base_salary: base_salary,
          monthly_salary: base_salary,
          days_worked,
          days_absent,
          days_extra: days_extra > 0 ? days_extra : undefined,
          notes_extra: days_extra > 0 ? `${days_extra} día(s) Extra/Especial (festivo/descanso)` : undefined,
          total_earnings: Math.round(total_earnings * 100) / 100,
          IHSS: Math.round(IHSS * 100) / 100,
          RAP: Math.round(RAP * 100) / 100,
          ISR: Math.round(ISR * 100) / 100,
          total_deducciones: Math.round(total_deductions * 100) / 100,
          total: Math.round(total * 100) / 100,
          line_id: insertedLine.id,
          pay_type: 'fixed'
        })
        
      } else {
        // ========== EMPLEADOS POR HORA (HOURLY) ==========
        const days_worked = registros.length
        const days_absent = diasPeriodo - days_worked
        
        // Calcular horas totales trabajadas
        const total_hours_worked = calculateHoursWorked(registros)
        
        // Calcular tarifa por hora desde el salario base mensual
        // Asumir 8 horas por día y 30 días al mes = 240 horas mensuales
        // O usar días del período si es quincenal
        const horasMensualesEstimadas = paymentFrequency === 'monthly' 
          ? 240 // 8 horas * 30 días
          : 120 // 8 horas * 15 días (quincena)
        const hourly_rate = horasMensualesEstimadas > 0 
          ? base_salary / horasMensualesEstimadas 
          : 0
        
        // Calcular salario bruto del período basado en horas trabajadas
        let total_earnings = total_hours_worked * hourly_rate
        
        // Validar que total_earnings sea un número válido
        if (!isFinite(total_earnings) || isNaN(total_earnings)) {
          console.error(`❌ ERROR - total_earnings inválido para empleado ${emp.name}:`, total_earnings)
          total_earnings = 0
        }
        
        let IHSS = 0, RAP = 0, ISR = 0, total_deductions = 0, total = 0

        // APLICAR DEDUCCIONES SEGÚN legal_deductions (solo si tipoParam === 'CON')
        // Para hourly, las deducciones se calculan sobre el salario base mensual (no proporcional)
        if (tipoParam === 'CON') {
          if (legalDeductions.ihss) {
            IHSS = Math.min(base_salary, 11903.13) * 0.05
          }
          
          if (legalDeductions.rap) {
            RAP = Math.max(0, base_salary - 11903.13) * 0.015
          }
          
          if (legalDeductions.isr) {
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
          }
          
          // Proporcionar deducciones según horas trabajadas vs horas estimadas
          const deductionFactor = horasMensualesEstimadas > 0 
            ? total_hours_worked / horasMensualesEstimadas 
            : 0
          IHSS = IHSS * deductionFactor
          RAP = RAP * deductionFactor
          ISR = ISR * deductionFactor
          
          total_deductions = IHSS + RAP + ISR
          total = total_earnings - total_deductions
        } else {
          // Tipo 'SIN': solo salario por horas, sin deducciones
          total = total_earnings
        }

        // Validar que runId existe antes de insertar
        if (!runId) {
          console.error(`❌ ERROR - runId es null/undefined para empleado ${emp.name}`)
          return res.status(500).json({ 
            error: 'Error interno: runId no disponible',
            message: `No se pudo obtener el ID de la corrida para insertar la línea del empleado ${emp.name}`
          })
        }

        // Validar que todos los valores numéricos sean válidos antes de insertar
        const numericValues = {
          days_worked,
          total_hours_worked,
          hourly_rate,
          total_earnings,
          IHSS,
          RAP,
          ISR,
          total
        }
        
        for (const [key, value] of Object.entries(numericValues)) {
          if (!isFinite(value) || isNaN(value)) {
            console.error(`❌ ERROR - Valor inválido ${key} para empleado ${emp.name}:`, value)
            return res.status(500).json({ 
              error: 'Error en cálculo de nómina',
              message: `Valor inválido ${key} para el empleado ${emp.name}: ${value}`
            })
          }
        }

        // Insertar línea en payroll_run_lines
        // Para hourly, guardamos horas en calc_hours
        const { data: insertedLine, error: lineError } = await supabase
          .from('payroll_run_lines')
          .upsert({
            run_id: runId,
            company_id: companyId,
            employee_id: emp.id,
            calc_hours: total_hours_worked, // Horas trabajadas para hourly
            calc_bruto: total_earnings,
            calc_ihss: IHSS,
            calc_rap: RAP,
            calc_isr: ISR,
            calc_neto: total,
            eff_hours: total_hours_worked,
            eff_bruto: total_earnings,
            eff_ihss: IHSS,
            eff_rap: RAP,
            eff_isr: ISR,
            eff_neto: total,
            edited: false,
            tax_year: yearNum // Guardar año de tabla fiscal usada
          }, {
            onConflict: 'run_id,employee_id',
            ignoreDuplicates: false
          })
          .select('id')
          .maybeSingle()
          
        if (lineError) {
          console.error(`❌ ERROR insertando línea para empleado ${emp.name}:`, lineError)
          return res.status(500).json({ 
            error: 'Error insertando línea de nómina',
            message: `No se pudo insertar la línea para el empleado ${emp.name}: ${lineError.message}`,
            details: lineError,
            code: lineError.code
          })
        }
        
        if (!insertedLine) {
          console.error(`❌ ERROR - No se retornó línea insertada para empleado ${emp.name}`)
          return res.status(500).json({ 
            error: 'Error insertando línea de nómina',
            message: `No se pudo obtener el ID de la línea insertada para el empleado ${emp.name}`
          })
        }

        planilla_hourly.push({
          employee_id: emp.id,
          id: emp.dni || emp.id,
          name: emp?.name || 'Sin nombre',
          bank: emp.bank_name || 'No especificado',
          bank_account: emp.bank_account || 'No especificado',
          department: departmentName,
          base_salary: base_salary,
          monthly_salary: base_salary,
          days_worked,
          days_absent,
          total_hours_worked: Math.round(total_hours_worked * 100) / 100,
          hourly_rate: Math.round(hourly_rate * 100) / 100,
          total_earnings: Math.round(total_earnings * 100) / 100,
          IHSS: Math.round(IHSS * 100) / 100,
          RAP: Math.round(RAP * 100) / 100,
          ISR: Math.round(ISR * 100) / 100,
          total_deducciones: Math.round(total_deductions * 100) / 100,
          total: Math.round(total * 100) / 100,
          line_id: insertedLine.id,
          pay_type: 'hourly'
        })
      }
    }

    const totalEmpleados = planilla_fixed.length + planilla_hourly.length
    console.log(`Preview de nómina generado exitosamente: ${planilla_fixed.length} empleados fijos, ${planilla_hourly.length} empleados por hora`)
    console.log('🔍 DEBUG - RunId generado:', runId)
    console.log('🔍 DEBUG - Tipo procesado:', tipoParam)

    // Obtener el estado actual de la corrida
    const { data: currentRun, error: statusError } = await supabase
      .from('payroll_runs')
      .select('status, authorized_by, authorized_at')
      .eq('id', runId)
      .maybeSingle()

    if (statusError) {
      console.error('Error obteniendo estado de corrida:', statusError)
    }

    const currentStatus = currentRun?.status || 'draft'
    console.log('🔍 DEBUG - Estado actual de la corrida:', { runId, status: currentStatus })

    // Determinar si es una regeneración
    const isRegeneration = existingRun && existingRun.status === 'authorized'
    
    // Calcular totales separados
    const totalBrutoFixed = planilla_fixed.reduce((sum: number, row: any) => sum + row.total_earnings, 0)
    const totalDeduccionesFixed = planilla_fixed.reduce((sum: number, row: any) => sum + row.total_deducciones, 0)
    const totalNetoFixed = planilla_fixed.reduce((sum: number, row: any) => sum + row.total, 0)
    
    const totalBrutoHourly = planilla_hourly.reduce((sum: number, row: any) => sum + row.total_earnings, 0)
    const totalDeduccionesHourly = planilla_hourly.reduce((sum: number, row: any) => sum + row.total_deducciones, 0)
    const totalNetoHourly = planilla_hourly.reduce((sum: number, row: any) => sum + row.total, 0)
    
    return res.status(200).json({
      message: isRegeneration 
        ? 'Preview regenerado - se actualizó el registro existente'
        : 'Preview de nómina generado exitosamente',
      run_id: runId,
      status: currentStatus,
      year: yearNum,
      month: monthNum,
      quincena: quincenaNum,
      tipo: tipoParam,
      empleados: totalEmpleados,
      empleados_fixed: planilla_fixed.length,
      empleados_hourly: planilla_hourly.length,
      // Totales generales (compatibilidad hacia atrás)
      totalBruto: totalBrutoFixed + totalBrutoHourly,
      totalDeducciones: totalDeduccionesFixed + totalDeduccionesHourly,
      totalNeto: totalNetoFixed + totalNetoHourly,
      // Totales separados por tipo
      totalBrutoFixed,
      totalDeduccionesFixed,
      totalNetoFixed,
      totalBrutoHourly,
      totalDeduccionesHourly,
      totalNetoHourly,
      // Planillas separadas
      planilla_fixed,
      planilla_hourly,
      // Compatibilidad hacia atrás: mantener planilla combinada
      planilla: [...planilla_fixed, ...planilla_hourly],
      warning: isRegeneration ? 'Ya existía un registro generado para el período seleccionado. Esta acción actualizó el registro.' : null,
      noAttendanceWarning
    })

  } catch (error: any) {
    console.error('Payroll Preview API error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error',
      details: error.stack || String(error),
      type: error.constructor?.name || typeof error
    })
  }
}

export default withGeneralRateLimit(['GET'])(handler)
