import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authResult = await authenticateUser(req, res, ['can_view_reports', 'can_manage_attendance'])
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { userProfile } = authResult
    const supabase = createClient(req, res)

    const { format = 'csv', dateFilter } = req.body as { format?: 'csv'|'pdf'; dateFilter: { startDate: string; endDate: string } }

    if (!dateFilter?.startDate || !dateFilter?.endDate) {
      return res.status(400).json({ error: 'Filtro de fechas requerido' })
    }

    // Obtener empleados de la empresa (para escoping cuando attendance_records no tiene company_id)
    let employeeIds: string[] = []
    if (userProfile?.company_id) {
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', userProfile.company_id)
      employeeIds = (employees || []).map((e: any) => e.id)
    }

    // Obtener registros de asistencia
    let attendanceQuery = supabase
      .from('attendance_records')
      .select('employee_id, date, check_in, check_out, status, late_minutes')
      .gte('date', dateFilter.startDate)
      .lte('date', dateFilter.endDate)

    if (employeeIds.length > 0) {
      attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
    } else if (userProfile?.company_id) {
      // Forzar vacío si no hay empleados para esa empresa
      attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
    }

    const { data: records, error } = await attendanceQuery
    if (error) {
      console.error('❌ Error obteniendo asistencia:', error)
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    if (format === 'csv') {
      const headers = ['employee_id','date','status','check_in','check_out','late_minutes']
      const csvRows = [headers.join(',')]
      for (const r of (records || [])) {
        const row = [r.employee_id, r.date, r.status, r.check_in || '', r.check_out || '', r.late_minutes || 0]
        csvRows.push(row.join(','))
      }
      const csv = csvRows.join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename=attendance_${dateFilter.startDate}_${dateFilter.endDate}.csv`)
      return res.status(200).send(csv)
    }

    // PDF no solicitado actualmente; devolver JSON si no CSV
    return res.status(200).json({ records: records || [] })

  } catch (error) {
    console.error('Error en export-attendance:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

