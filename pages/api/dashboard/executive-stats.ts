import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getHondurasTimestamp } from '../../../lib/timezone'
import { DateTime } from 'luxon'
import { getDateRange } from '../../../lib/attendance'
import { createEmployeeSalaryClient } from '../../../lib/security/employee-data-access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)
    
    // Para super_admin, companyId puede ser null - no es error
    // Solo validar companyId para otros roles
    if (!companyId && role !== 'super_admin') {
      return res.status(400).json({ error: 'Company ID is required' })
    }
    
    console.log('🔍 Executive Dashboard stats: Iniciando...')
    console.log('📅 Timestamp:', getHondurasTimestamp())

    const salaryClient = createEmployeeSalaryClient()

    console.log('👥 PASO 1: Obteniendo empleados activos de la empresa:', companyId)
    let employeesQuery = salaryClient
      .from('employees')
      .select('id, name, employee_code, base_salary, department_id, status')
      .eq('status', 'active')

    if (companyId) {
      employeesQuery = employeesQuery.eq('company_id', companyId)
    } else if (role === 'super_admin') {
      employeesQuery = employeesQuery.limit(0)
    }
    
    const { data: employees, error: empError } = await employeesQuery

    if (empError) {
      console.error('❌ Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees', details: empError })
    }

    console.log('✅ Empleados obtenidos:', employees?.length || 0)
    const totalEmployees = employees?.length || 0

    /**
     * Misma fuente que /api/attendance/kpis (`attendance_kpis_filtered`): SECURITY DEFINER.
     * El conteo directo sobre `attendance_records` suele verse vacío por RLS aunque el RPC sea correcto.
     */
    const pullKpisFromRpc = async (range: { from: string; to: string }) => {
      if (!companyId) {
        return { presentes: 0, ausentes: 0, tardes: 0 }
      }
      const { data, error } = await supabase.rpc('attendance_kpis_filtered', {
        p_employee_id: null,
        p_from: range.from,
        p_to: range.to,
        p_role: null,
        p_department_id: null,
        p_company_id: companyId,
      })
      if (error) {
        console.error('❌ attendance_kpis_filtered:', error)
        return { presentes: 0, ausentes: 0, tardes: 0 }
      }
      const row = Array.isArray(data) ? data[0] : data
      return {
        presentes: typeof row?.presentes === 'number' ? row.presentes : Number(row?.presentes) || 0,
        ausentes: typeof row?.ausentes === 'number' ? row.ausentes : Number(row?.ausentes) || 0,
        tardes: typeof row?.tardes === 'number' ? row.tardes : Number(row?.tardes) || 0,
      }
    }

    console.log('📊 PASO 2: KPI asistencia (RPC, alineado a módulo Asistencia)...')
    const zoneNow = DateTime.now().setZone('America/Tegucigalpa')
    const todayRange = getDateRange('today', zoneNow)
    const todayKpis = await pullKpisFromRpc(todayRange)
    const presentToday = todayKpis.presentes
    const absentToday = todayKpis.ausentes
    const lateToday = todayKpis.tardes
    console.log('✅ KPI día actual:', todayKpis)
    const onTimeToday = Math.max(0, presentToday - lateToday)

    // Tasa últimos 7 días corridos (promedio simple del % presentes sobre plantilla cada día).
    console.log('📊 PASO 2b: Tasa asistencia 7 días (RPC por día)...')
    let attendanceRate = 0
    if (companyId && totalEmployees > 0) {
      const pctSamples: number[] = []
      for (let offset = 0; offset < 7; offset += 1) {
        const day = zoneNow.minus({ days: offset })
        const r = getDateRange('today', day)
        const k = await pullKpisFromRpc(r)
        const denom = typeof k.presentes === 'number' && typeof k.ausentes === 'number'
          ? k.presentes + k.ausentes
          : 0
        if (denom > 0) {
          pctSamples.push((k.presentes / denom) * 100)
        }
      }
      attendanceRate = pctSamples.length > 0
        ? pctSamples.reduce((s, x) => s + x, 0) / pctSamples.length
        : 0
    }

    // 3. Obtener nóminas recientes - SOLO DE EMPLEADOS DE LA EMPRESA
    console.log('💰 PASO 3: Obteniendo nóminas recientes de empleados...')
    const employeeIds = (employees || []).map((e: any) => e.id)
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
    
    // Filtrar por empleados si hay empleados
    if (employeeIds.length > 0) {
      payrollQuery = payrollQuery.in('employee_id', employeeIds)
    } else {
      // Si no hay empleados, no hay nóminas - usar un ID que no existe
      payrollQuery = payrollQuery.eq('employee_id', '00000000-0000-0000-0000-000000000000')
    }
    
    const { data: recentPayrolls, error: payrollError } = await payrollQuery

    if (payrollError) {
      console.error('❌ Error fetching payrolls:', payrollError)
      return res.status(500).json({ error: 'Error fetching payrolls', details: payrollError })
    }

    console.log('✅ Nóminas recientes:', recentPayrolls?.length || 0)

    // 4. Calcular estadísticas del día
    console.log('🧮 PASO 4: Estadísticas asistencia hoy desde RPC:', {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
    })

    // 5. Calcular estadísticas financieras
    console.log('💰 PASO 5: Calculando estadísticas financieras...')
    const totalPayroll = employees?.reduce((sum: number, emp: any) => sum + (emp.base_salary || 0), 0) || 0
    const averageSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0

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
    
    // Check if response has already been sent
    if (res.headersSent) {
      return
    }
    
    // Handle specific authentication errors
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return res.status(401).json({ 
          error: 'Unauthorized',
          details: 'Authentication required'
        })
      }
      if (error.message === 'ADMIN_REQUIRED') {
        return res.status(403).json({ 
          error: 'Forbidden',
          details: 'Admin privileges required'
        })
      }
      if (error.message === 'COMPANY_ACCESS_REQUIRED') {
        return res.status(400).json({ 
          error: 'Company access required',
          details: error.message
        })
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 