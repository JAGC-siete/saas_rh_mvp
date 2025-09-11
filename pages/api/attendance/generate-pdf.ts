import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { generateConsolidatedAttendancePDF, type AttendanceItem, type AttendanceSummary } from '../../../lib/attendance/report'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await authenticateUser(req, res, ['can_view_reports', 'can_export_payroll'])
    if (!auth.success || !auth.user || !auth.userProfile) {
      return res.status(401).json({ error: auth.error || 'Unauthorized', message: auth.message })
    }

    const { startDate, endDate, employee_id } = req.body

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate y endDate son requeridos' })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' })
    }

    const supabase = createClient(req, res)
    const companyId = auth.userProfile.company_id

    // Obtener registros de asistencia del período
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        employees!attendance_records_employee_id_fkey(
          name,
          employee_code,
          department,
          position,
          company_id
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('employees.company_id', companyId)
      .order('date', { ascending: false })

    // Filtrar por empleado específico si se proporciona
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    const { data: attendanceRecords, error: attendanceError } = await query

    if (attendanceError) {
      console.error('Error obteniendo registros de asistencia:', attendanceError)
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({ error: 'No se encontraron registros de asistencia para el período especificado' })
    }

    // Mapear datos a estructura de AttendanceItem
    const attendanceData: AttendanceItem[] = attendanceRecords.map((record: any) => {
      const checkIn = record.check_in ? new Date(record.check_in) : null
      const checkOut = record.check_out ? new Date(record.check_out) : null
      
      // Calcular horas trabajadas
      let hoursWorked = 0
      if (checkIn && checkOut) {
        const diffMs = checkOut.getTime() - checkIn.getTime()
        hoursWorked = diffMs / (1000 * 60 * 60) // Convertir a horas
      }

      // Calcular tardanza (asumiendo horario de 8:00 AM)
      let lateMinutes = 0
      if (checkIn) {
        const expectedTime = new Date(checkIn)
        expectedTime.setHours(8, 0, 0, 0) // 8:00 AM
        if (checkIn > expectedTime) {
          lateMinutes = Math.floor((checkIn.getTime() - expectedTime.getTime()) / (1000 * 60))
        }
      }

      // Calcular horas extra (asumiendo 8 horas por día)
      const overtimeHours = Math.max(0, hoursWorked - 8)

      return {
        id: record.id,
        employee_code: record.employees?.employee_code || '',
        name: record.employees?.name || '',
        department: record.employees?.department || 'Sin Departamento',
        position: record.employees?.position || 'Sin Posición',
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        hours_worked: hoursWorked,
        status: record.status === 'present' ? 'present' : record.status === 'late' ? 'late' : 'absent',
        late_minutes: lateMinutes,
        overtime_hours: overtimeHours,
        notes: record.justification || ''
      }
    })

    // Calcular resumen
    const totalRecords = attendanceData.length
    const totalHours = attendanceData.reduce((sum, r) => sum + r.hours_worked, 0)
    const totalLateMinutes = attendanceData.reduce((sum, r) => sum + r.late_minutes, 0)
    const totalOvertime = attendanceData.reduce((sum, r) => sum + r.overtime_hours, 0)
    const presentRecords = attendanceData.filter(r => r.status === 'present').length
    const lateRecords = attendanceData.filter(r => r.status === 'late').length
    // const absentRecords = attendanceData.filter(r => r.status === 'absent').length

    const summary: AttendanceSummary = {
      total_employees: new Set(attendanceData.map(r => r.employee_code)).size,
      total_days: totalRecords,
      total_hours_worked: totalHours,
      total_late_minutes: totalLateMinutes,
      total_overtime_hours: totalOvertime,
      attendance_rate: totalRecords > 0 ? ((presentRecords + lateRecords) / totalRecords) * 100 : 0,
      punctuality_rate: totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0,
      average_hours_per_day: totalRecords > 0 ? totalHours / totalRecords : 0
    }

    console.log(`Generando PDF de asistencia: ${attendanceData.length} registros para ${startDate} a ${endDate}`)

    // Generar PDF consolidado
    const pdf = await generateConsolidatedAttendancePDF(attendanceData, summary, startDate, endDate, auth.user?.email)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=asistencia_paragon_${startDate}_${endDate}.pdf`)
    return res.send(pdf)

  } catch (error: any) {
    console.error('Error generando PDF de asistencia:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido'
    })
  }
}
