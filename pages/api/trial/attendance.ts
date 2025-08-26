import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

/**
 * Trial Attendance API
 * - Filters data by tenant's company (companies.subdomain === tenant)
 * - Fixed period: August 1-31, 2025
 * - Returns KPIs, daily stats, and employee-level stats for the TRIAL company
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant } = req.query

    if (!tenant || typeof tenant !== 'string') {
      return res.status(400).json({ error: 'Tenant requerido' })
    }

    const supabase = createAdminClient()

    // 1) Buscar empresa demo existente por UUID específico (NO por tenant - reutilizamos el mismo entorno)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, subdomain')
      .eq('id', 'c0f49c93-f9a6-40df-b3bd-422963c50e28')  // Usar empresa demo específica que SÍ tiene empleados
      .eq('is_active', true)
      .single()

    if (companyError || !company) {
      console.error('❌ Empresa demo no encontrada:', companyError)
      return res.status(404).json({ error: 'Entorno demo no configurado' })
    }

    console.log('✅ Usando empresa demo:', company.name, 'ID:', company.id)

    // 2) Load active employees in THIS company (not Paragon)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, employee_code, department_id, status, team, base_salary')
      .eq('company_id', company.id)  // Filtrar por la empresa del trial
      .eq('status', 'active')

    if (employeesError) {
      return res.status(500).json({ error: 'Error obteniendo empleados', details: employeesError })
    }

    const totalEmployees = employees?.length ?? 0
    console.log('✅ Found', totalEmployees, 'employees for trial company')

    // 3) Fixed date window for trial: August 2025 (inclusive)
    const startDate = '2025-08-01'
    const endDate = '2025-08-31'

    // 4) Attendance records for the month for THESE employees
    let attendance: any[] = []
    if (totalEmployees > 0) {
      const employeeIds = (employees || []).map((e: any) => e.id)
      const { data: attendanceRows, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id, employee_id, date, check_in, check_out, expected_check_in, expected_check_out, late_minutes, justification, status')
        .in('employee_id', employeeIds)
        .gte('date', startDate)
        .lte('date', endDate)

      if (attendanceError) {
        return res.status(500).json({ error: 'Error obteniendo asistencia', details: attendanceError })
      }
      attendance = attendanceRows || []
      console.log('✅ Found', attendance.length, 'attendance records for trial company')
    }

    // 5) Compute KPIs and stats
    const employeeById = new Map((employees || []).map((e: any) => [e.id, e]))

    // Dates in August 2025
    const daysInMonth = 31
    const allDates: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const day = d.toString().padStart(2, '0')
      allDates.push(`2025-08-${day}`)
    }

    // Attendance by date and by employee
    const byDate = new Map<string, any[]>()
    const byEmployeeDates = new Map<string, Set<string>>()
    const lateByEmployee = new Map<string, number>()

    for (const row of attendance) {
      const list = byDate.get(row.date) || []
      list.push(row)
      byDate.set(row.date, list)

      const set = byEmployeeDates.get(row.employee_id) || new Set<string>()
      set.add(row.date)
      byEmployeeDates.set(row.employee_id, set)

      if (row.late_minutes && row.late_minutes > 0) {
        lateByEmployee.set(row.employee_id, (lateByEmployee.get(row.employee_id) || 0) + 1)
      }
    }

    // KPIs across the month
    const totalAttendanceEvents = attendance.length
    const presentCount = totalAttendanceEvents // counting any record as presence
    const lateCount = attendance.filter((a: any) => (a.late_minutes || 0) > 0).length
    const onTimeCount = presentCount - lateCount

    const totalPossiblePresences = totalEmployees * daysInMonth
    const absentCount = Math.max(0, totalPossiblePresences - presentCount)
    const attendanceRate = totalPossiblePresences > 0 ? (presentCount / totalPossiblePresences) * 100 : 0
    const punctualityRate = presentCount > 0 ? (onTimeCount / presentCount) * 100 : 0

    // Daily stats
    const dailyStats = allDates.map((date) => {
      const dayList = byDate.get(date) || []
      const attendanceRateDay = totalEmployees > 0 ? (dayList.length / totalEmployees) * 100 : 0
      return {
        date,
        attendanceCount: dayList.length,
        attendanceRate: Math.round(attendanceRateDay * 100) / 100,
      }
    })

    // Absent list: employees with at least one absent day (derived)
    const absentList = (employees || [])
      .map((e: any) => {
        const attended = byEmployeeDates.get(e.id)?.size || 0
        const absentDays = Math.max(0, daysInMonth - attended)
        return { id: e.id, name: e.name, team: e.team || null, absentDays }
      })
      .filter((r) => r.absentDays > 0)
      .sort((a, b) => b.absentDays - a.absentDays)
      .slice(0, 50)

    // Early list across the month (compute delta where earlier than expected)
    function parseExpectedToMinutes(t: string | null | undefined): number | null {
      if (!t) return null
      const [h, m] = String(t).split(':').map(Number)
      if (Number.isNaN(h) || Number.isNaN(m)) return null
      return h * 60 + m
    }
    function getCheckInMinutes(d: string | null | undefined): number | null {
      if (!d) return null
      const dt = new Date(d)
      if (Number.isNaN(dt.getTime())) return null
      return dt.getHours() * 60 + dt.getMinutes()
    }

    const earlyList = attendance
      .filter((a: any) => a.check_in && a.expected_check_in)
      .map((a: any) => {
        const e = employeeById.get(a.employee_id)
        const expMin = parseExpectedToMinutes(a.expected_check_in)
        const inMin = getCheckInMinutes(a.check_in)
        let delta = 0
        if (expMin != null && inMin != null) {
          delta = Math.max(0, expMin - inMin)
        }
        return {
          id: a.employee_id,
          name: e?.name || 'N/A',
          team: e?.team || null,
          delta_min: delta,
          check_in_time: a.check_in,
        }
      })
      .filter((r: any) => r.delta_min > 0)
      .sort((a: any, b: any) => b.delta_min - a.delta_min)
      .slice(0, 50)

    // Late list across the month (sum by employee and pick top records)
    const lateList = attendance
      .filter((a: any) => (a.late_minutes || 0) > 0)
      .map((a: any) => {
        const e = employeeById.get(a.employee_id)
        return {
          id: a.employee_id,
          name: e?.name || 'N/A',
          team: e?.team || null,
          delta_min: a.late_minutes || 0,
          check_in_time: a.check_in,
        }
      })
      .sort((a: any, b: any) => b.delta_min - a.delta_min)
      .slice(0, 50)

    // Employee stats across the month
    const employeeStats = (employees || []).map((e: any) => {
      const attended = byEmployeeDates.get(e.id)?.size || 0
      const lateDays = lateByEmployee.get(e.id) || 0
      const absentDays = Math.max(0, daysInMonth - attended)
      return {
        employee_id: e.id,
        name: e.name,
        presentDays: attended,
        absentDays,
        lateDays,
      }
    })

    const result = {
      company: { id: company.id, name: company.name, subdomain: company.subdomain },
      period: { startDate, endDate },
      kpis: {
        totalEmployees,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        onTime: onTimeCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        punctualityRate: Math.round(punctualityRate * 100) / 100,
      },
      dailyStats,
      absentList,
      earlyList,
      lateList,
      employeeStats,
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('💥 Error en trial attendance:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}


