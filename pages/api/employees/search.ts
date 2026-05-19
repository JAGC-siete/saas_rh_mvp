import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { createAdminClient } from '../../../lib/supabase/server'
import { getHondurasTimestamp } from '../../../lib/timezone'
import { resolveFieldAccessContext, userHasPermission } from '../../../lib/security/field-access'
import { shapeEmployees } from '../../../lib/security/shape-employee'
import { createEmployeeSalaryClient } from '../../../lib/security/employee-data-access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Employees Search API: Iniciando...')

    // Use the new authentication method that handles company context properly
    const { supabase, companyId, userProfile } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!userHasPermission(userProfile, 'can_view_employees')) {
      return res.status(403).json({ error: 'Insufficient permissions to view employees' })
    }

    const adminClient = createAdminClient()
    const salaryClient = createEmployeeSalaryClient()
    const fieldCtx = await resolveFieldAccessContext(userProfile, adminClient)

    // Get query parameters
    const { 
      search = '', 
      page = '1', 
      limit = '20',
      status = 'active',
      department_id,
      employee_id,
      sort_by = 'name',
      sort_order = 'asc'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    console.log('📋 Query parameters:', { search, page: pageNum, limit: limitNum, status, department_id, sort_by, sort_order })

    // Build the query - REMOVED position since it doesn't exist in employees table
    let query = salaryClient
      .from('employees')
      .select(`
        id,
        company_id,
        department_id,
        work_schedule_id,
        employee_code,
        dni,
        name,
        email,
        phone,
        role,
        team,
        base_salary,
        hire_date,
        termination_date,
        status,
        bank_name,
        bank_account,
        emergency_contact_name,
        emergency_contact_phone,
        address,
        metadata,
        created_at,
        updated_at,
        departments!employees_department_id_fkey(name),
        work_schedules(name, monday_start, monday_end),
        employee_scores(total_points, weekly_points, monthly_points),
        attendance_records!attendance_records_employee_id_fkey(check_in, check_out, lunch_start, lunch_end, status)
      `, { count: 'exact' })
      .eq('status', status)
      .eq('company_id', companyId)

    // Add search filter if provided
    if (search) {
      query = query.or(`
        name.ilike.%${search}%,
        employee_code.ilike.%${search}%,
        dni.ilike.%${search}%,
        role.ilike.%${search}%,
        team.ilike.%${search}%,
        email.ilike.%${search}%
      `)
    }

    // Add department filter if provided
    if (department_id) {
      query = query.eq('department_id', department_id)
    }

    // Fetch single employee by id (for payroll_defaults, etc.)
    if (employee_id && typeof employee_id === 'string') {
      query = query.eq('id', employee_id)
    }

    // Add sorting
    query = query.order(sort_by as string, { ascending: sort_order === 'asc' })

    // Add pagination
    query = query.range(offset, offset + limitNum - 1)

    const { data: employees, error, count } = await query

    if (error) {
      console.error('Error fetching employees:', error)
      return res.status(500).json({ error: 'Error fetching employees' })
    }

    console.log('Employees query successful:', { 
      count: count || 0, 
      employeesCount: employees?.length || 0,
      status: status
    })

    // Process attendance data for today
    const today = getHondurasTimestamp().split('T')[0]
    const processedEmployees = employees?.map((emp: any) => {
      const todayAttendance = emp.attendance_records?.find((att: any) => 
        att.check_in && new Date(att.check_in).toISOString().split('T')[0] === today
      )

      let attendance_status: 'present' | 'absent' | 'late' | 'not_registered' = 'not_registered'
      let check_in_time = undefined
      let check_out_time = undefined

      if (todayAttendance) {
        check_in_time = todayAttendance.check_in
        check_out_time = todayAttendance.check_out
        
        if (check_in_time) {
          const checkInHour = new Date(check_in_time).getHours()
          const checkInMinutes = new Date(check_in_time).getMinutes()
          
          // Check if late (after 8:15 AM)
          if (checkInHour > 8 || (checkInHour === 8 && checkInMinutes > 15)) {
            attendance_status = 'late'
          } else {
            attendance_status = 'present'
          }
        }
      }

      return {
        ...emp,
        attendance_status,
        check_in_time,
        check_out_time
      }
    })

    return res.status(200).json({
      employees: shapeEmployees(processedEmployees || [], fieldCtx),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil((count || 0) / limitNum),
        totalItems: count || 0,
        itemsPerPage: limitNum
      }
    })

  } catch (error: any) {
    console.error('Employees Search API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error'
    })
  }
} 