import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { withReportsRateLimit } from '../../../lib/security/rate-limiting'
import { getDateRange } from '../../../lib/attendance'

// Aplicar rate limiting
const handlerWithSecurity = withReportsRateLimit()(attendanceTrendsHandler)

export default handlerWithSecurity

async function attendanceTrendsHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 🔒 AUTENTICACIÓN ESTANDARIZADA (como otros endpoints)
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Normalizar parámetros de query (manejar arrays)
    const normalizeParam = (param: string | string[] | undefined): string | undefined => {
      if (Array.isArray(param)) return param[0]
      return param
    }
    
    const preset = normalizeParam(req.query.preset) || 'today'
    const roleFilter = normalizeParam(req.query.role)
    const employee_id = normalizeParam(req.query.employee_id)
    
    console.log('🔍 Trends API Debug:', { 
      preset, 
      roleFilter, 
      employee_id,
      companyId: companyId,
      userEmail: user.email
    })
    
    // Validar preset
    const validPresets = ['today', 'week', 'fortnight', 'month', 'year']
    if (!validPresets.includes(preset)) {
      return res.status(400).json({
        error: 'Preset inválido',
        message: `Preset debe ser uno de: ${validPresets.join(', ')}`,
        received: preset
      })
    }

    // 📅 CALCULAR RANGO DE FECHAS USANDO EL MISMO RESOLVER
    const range = getDateRange(preset)
    const startDate = range.from.split('T')[0]
    const endDate = range.to.split('T')[0]
    
    console.log('📅 Date range calculated:', { 
      preset, 
      startDate, 
      endDate,
      from: range.from,
      to: range.to
    })

    // Obtener tendencias de asistencia con filtros
    if (!companyId) {
      return res.status(400).json({
        error: 'Company access required',
        message: 'No se encontró una empresa asociada a tu cuenta'
      })
    }
    
    const trends = await getAttendanceTrends(supabase, companyId, startDate, endDate, roleFilter || undefined, employee_id || undefined)

    return res.status(200).json({
      success: true,
      data: trends,
      meta: {
        preset,
        dateRange: { startDate, endDate },
        filters: { role: roleFilter, employee_id }
      }
    })

  } catch (error) {
    console.error('❌ Trends API Error:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las tendencias de asistencia'
    })
  }
}

async function getAttendanceTrends(supabase: any, companyId: string, startDate: string, endDate: string, role?: string, employeeId?: string) {
  try {
    console.log('📊 Getting attendance trends:', {
      companyId,
      startDate,
      endDate,
      role,
      employeeId
    })

    // Obtener empleados filtrados por company_id y role
    let employeesQuery = supabase
      .from('employees')
      .select('id, name, role')
      .eq('company_id', companyId)
      .eq('status', 'active')

    if (role) {
      employeesQuery = employeesQuery.eq('role', role)
    }

    if (employeeId) {
      employeesQuery = employeesQuery.eq('id', employeeId)
    }

    const { data: employees, error: employeesError } = await employeesQuery

    if (employeesError) {
      console.error('❌ Error fetching employees:', employeesError)
      throw employeesError
    }

    if (!employees || employees.length === 0) {
      console.log('⚠️ No employees found for trends')
      return []
    }

    const employeeIds = employees.map((emp: any) => emp.id)
    console.log('👥 Employees for trends:', { count: employeeIds.length })

    // Obtener registros de asistencia del período
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select(`
        date, 
        status, 
        check_in, 
        employee_id, 
        late_minutes,
        employees!attendance_records_employee_id_fkey(name, employee_code, role)
      `)
      .in('employee_id', employeeIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (attendanceError) {
      console.error('❌ Error fetching attendance records:', attendanceError)
      throw attendanceError
    }

    console.log('📈 Attendance records for trends:', { count: attendanceRecords?.length || 0 })

    // Agrupar por fecha y calcular métricas
    const trendsByDate = new Map()

    // Inicializar todas las fechas del rango
    const currentDate = new Date(startDate)
    const endDateObj = new Date(endDate)
    
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0]
      trendsByDate.set(dateStr, {
        date: dateStr,
        present: 0,
        late: 0,
        absent: 0,
        total: 0
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Procesar registros de asistencia
    if (attendanceRecords) {
      attendanceRecords.forEach((record: any) => {
        const dateStr = record.date
        if (trendsByDate.has(dateStr)) {
          const trend = trendsByDate.get(dateStr)
          trend.total++
          
          if (record.status === 'present') {
            trend.present++
          } else if (record.status === 'late') {
            trend.late++
          } else {
            trend.absent++
          }
        }
      })
    }

    // Convertir a array y calcular porcentajes
    const trends = Array.from(trendsByDate.values()).map(trend => ({
      date: trend.date,
      present: trend.present,
      late: trend.late,
      absent: trend.absent,
      total: trend.total,
      attendanceRate: trend.total > 0 ? ((trend.present + trend.late) / trend.total) * 100 : 0,
      punctualityRate: trend.total > 0 ? (trend.present / trend.total) * 100 : 0
    }))

    console.log('✅ Trends calculated:', { trendsCount: trends.length })
    return trends

  } catch (error) {
    console.error('❌ Error in getAttendanceTrends:', error)
    throw error
  }
}