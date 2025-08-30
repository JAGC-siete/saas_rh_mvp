import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminClient()
    
    console.log('🔍 Executive Dashboard stats: Iniciando...')
    console.log('📅 Timestamp:', new Date().toISOString())
    
    // Use Tegucigalpa timezone for today's date
    const tegucigalpaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}))
    const today = tegucigalpaTime.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('📅 Fechas calculadas:', { today, sevenDaysAgo })

    // 1. Obtener total de empleados activos - SOLO DE PARAGON
    console.log('👥 PASO 1: Obteniendo empleados activos de Paragon...')
    const PARAGON_COMPANY_ID = '00000000-0000-0000-0000-000000000001'
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, base_salary, department_id, status')
      .eq('status', 'active')
      .eq('company_id', PARAGON_COMPANY_ID)

    if (empError) {
      console.error('❌ Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees', details: empError })
    }

    console.log('✅ Empleados obtenidos:', employees?.length || 0)
    const totalEmployees = employees?.length || 0

    // 2. Obtener registros de asistencia de hoy - SOLO DE EMPLEADOS DE PARAGON
    console.log('📊 PASO 2: Obteniendo registros de asistencia de hoy de Paragon...')
    const employeeIds = (employees || []).map(e => e.id)
    let attendanceQuery = supabase
      .from('attendance_records')
      .select('*')
      .eq('date', today)
    
    if (employeeIds.length > 0) {
      attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
    } else {
      // Si no hay empleados, no hay asistencia
      attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
    }
    
    const { data: todayAttendance, error: attError } = await attendanceQuery

    if (attError) {
      console.error('❌ Error fetching attendance:', attError)
      return res.status(500).json({ error: 'Error fetching attendance', details: attError })
    }

    console.log('✅ Asistencia de hoy:', todayAttendance?.length || 0)

    // 3. Obtener nóminas recientes - SOLO DE EMPLEADOS DE PARAGON
    console.log('💰 PASO 3: Obteniendo nóminas recientes de empleados de Paragon...')
    let payrollQuery = supabase
      .from('payroll_records')
      .select(`
        *,
        employees!payroll_records_employee_id_fkey (
          id,
          name,
          department_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)
    
    // Filtrar por empleados de Paragon si hay empleados
    if (employeeIds.length > 0) {
      payrollQuery = payrollQuery.in('employee_id', employeeIds)
    } else {
      // Si no hay empleados, no hay nóminas
      payrollQuery = payrollQuery.eq('employee_id', '__none__')
    }
    
    const { data: recentPayrolls, error: payrollError } = await payrollQuery

    if (payrollError) {
      console.error('❌ Error fetching payrolls:', payrollError)
      return res.status(500).json({ error: 'Error fetching payrolls', details: payrollError })
    }

    console.log('✅ Nóminas recientes:', recentPayrolls?.length || 0)

    // 4. Calcular estadísticas del día
    console.log('🧮 PASO 4: Calculando estadísticas del día...')
    const presentToday = todayAttendance?.length || 0
    const absentToday = totalEmployees - presentToday
    const lateToday = todayAttendance?.filter((r: any) => r.late_minutes > 0).length || 0
    const onTimeToday = presentToday - lateToday

    console.log('📊 Estadísticas calculadas:', {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday
    })

    // 5. Calcular estadísticas financieras
    console.log('💰 PASO 5: Calculando estadísticas financieras...')
    const totalPayroll = employees?.reduce((sum: number, emp: any) => sum + (emp.base_salary || 0), 0) || 0
    const averageSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0
    const attendanceRate = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0

    console.log('💰 Estadísticas financieras:', {
      totalPayroll,
      averageSalary,
      attendanceRate
    })

    // 6. Estadísticas por departamento
    console.log('🏢 PASO 6: Calculando estadísticas por departamento...')
    const departmentStats: { [key: string]: number } = {}
    employees?.forEach((emp: any) => {
      const dept = emp.department_id || 'Sin Departamento'
      departmentStats[dept] = (departmentStats[dept] || 0) + 1
    })

    console.log('🏢 Estadísticas por departamento:', Object.keys(departmentStats).length, 'departamentos')

    // 7. Estadísticas de nómina
    console.log('📋 PASO 7: Calculando estadísticas de nómina...')
    const pendingPayrolls = recentPayrolls?.filter((r: any) => r.status === 'draft').length || 0
    const completedPayrolls = recentPayrolls?.filter((r: any) => r.status === 'paid').length || 0

    console.log('📋 Estadísticas de nómina:', {
      pendingPayrolls,
      completedPayrolls,
      totalRecentPayrolls: recentPayrolls?.length || 0
    })

    // 8. Preparar respuesta
    const result = {
      totalEmployees,
      activeEmployees: totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday,
      totalPayroll,
      averageSalary,
      attendanceRate,
      departmentStats,
      recentPayrolls: recentPayrolls?.map((payroll: any) => ({
        id: payroll.id,
        period_start: payroll.period_start,
        period_end: payroll.period_end,
        net_salary: payroll.net_salary,
        status: payroll.status,
        employee_name: payroll.employees?.name || 'N/A',
        department: payroll.employees?.department_id || 'N/A',
        created_at: payroll.created_at
      })) || [],
      pendingPayrolls,
      completedPayrolls
    }

    console.log('✅ RESPUESTA FINAL GENERADA:')
    console.log('📊 Resumen ejecutivo:', {
      totalEmployees,
      activeEmployees: totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday,
      totalPayroll,
      averageSalary,
      attendanceRate,
      pendingPayrolls,
      completedPayrolls
    })

    console.log('🚀 Enviando respuesta al frontend...')
    res.status(200).json(result)
    console.log('✅ Respuesta enviada exitosamente')

  } catch (error) {
    console.error('❌ Error general en executive dashboard stats:', error)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 