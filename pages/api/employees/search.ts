import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Employees Search API: Iniciando...')

    // Create Supabase client for Pages API
    const supabase = createClient(req, res)

    // Get user (more secure than getSession)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user's company_id (optional for now)
    let companyId = '00000000-0000-0000-0000-000000000001' // Default company ID
    
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (!profileError && userProfile?.company_id) {
        companyId = userProfile.company_id
      }
    } catch (error) {
      console.log('⚠️ No user profile found, using default company ID')
    }

    // Get query parameters
    const { 
      search = '', 
      page = '1', 
      limit = '20',
      status = 'active',
      department_id,
      sort_by = 'name',
      sort_order = 'asc'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    console.log('📋 Query parameters:', { search, page: pageNum, limit: limitNum, status, department_id, sort_by, sort_order })

    // Build the query
    let query = supabase
      .from('employees')
      .select(`
        *,
        departments!employees_department_id_fkey!left(name),
        work_schedules!left(name, monday_start, monday_end),
        employee_scores!left(total_points, weekly_points, monthly_points),
        attendance_records!attendance_records_employee_id_fkey!left(check_in, check_out, status)
      `, { count: 'exact' })
      .eq('status', status)
      // .eq('company_id', companyId) // Temporarily disabled for debugging

    // Add search filter if provided
    if (search) {
      query = query.or(`
        name.ilike.%${search}%,
        employee_code.ilike.%${search}%,
        dni.ilike.%${search}%,
        position.ilike.%${search}%,
        email.ilike.%${search}%
      `)
    }

    // Add department filter if provided
    if (department_id) {
      query = query.eq('department_id', department_id)
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
    const today = new Date().toISOString().split('T')[0]
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
      employees: processedEmployees || [],
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil((count || 0) / limitNum),
        totalItems: count || 0,
        itemsPerPage: limitNum
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 