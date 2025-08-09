/**
 * MSW Handlers para el Demo de Humano SISU
 * Intercepta todas las llamadas a /api/* y devuelve datos desde fixtures
 */

import { http, HttpResponse } from 'msw'

// Load fixture data
let companyData: any = null
let departmentsData: any[] = []
let employeesData: any[] = []
let attendanceData: any[] = []
let payrollData: any = null

// Helper to load fixture files
const loadFixture = async (filename: string) => {
  try {
    const response = await fetch(`/demo-fixtures/${filename}`)
    if (!response.ok) {
      console.warn(`Failed to load fixture: ${filename}`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn(`Error loading fixture ${filename}:`, error)
    return null
  }
}

// Initialize fixtures (called once)
const initializeFixtures = async () => {
  if (companyData) return // Already loaded
  
  console.log('🔧 Initializing demo fixtures...')
  
  try {
    const [company, departments, employees, attendance, payroll] = await Promise.all([
      loadFixture('company.json'),
      loadFixture('departments.json'), 
      loadFixture('employees.json'),
      loadFixture('attendance.json'),
      loadFixture('payroll.json')
    ])

    companyData = company
    departmentsData = departments || []
    employeesData = employees || []
    attendanceData = attendance || []
    payrollData = payroll

    console.log('✅ Demo fixtures loaded:', {
      company: !!companyData,
      departments: departmentsData.length,
      employees: employeesData.length, 
      attendance: attendanceData.length,
      payroll: !!payrollData
    })
  } catch (error) {
    console.error('❌ Error loading fixtures:', error)
  }
}

export const handlers = [
  // Company data
  http.get('/api/company', async () => {
    await initializeFixtures()
    
    if (!companyData) {
      return HttpResponse.json({ error: 'Company data not found' }, { status: 404 })
    }
    return HttpResponse.json(companyData)
  }),

  // Departments
  http.get('/api/departments', async () => {
    await initializeFixtures()
    return HttpResponse.json(departmentsData)
  }),

  // Employees
  http.get('/api/employees', async ({ request }) => {
    await initializeFixtures()
    
    const url = new URL(request.url)
    const departmentId = url.searchParams.get('department_id')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status') || 'active'

    let filteredEmployees = employeesData.filter(emp => emp.status === status)

    if (departmentId && departmentId !== 'all') {
      filteredEmployees = filteredEmployees.filter(emp => emp.department_id === departmentId)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchLower) ||
        emp.dni_last5.includes(search) ||
        emp.position?.toLowerCase().includes(searchLower)
      )
    }

    return HttpResponse.json({ data: filteredEmployees })
  }),

  // Individual employee
  http.get('/api/employees/:id', async ({ params }) => {
    await initializeFixtures()
    
    const { id } = params
    const employee = employeesData.find(emp => emp.id === id)
    
    if (!employee) {
      return HttpResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return HttpResponse.json({ data: employee })
  }),

  // Attendance records
  http.get('/api/attendance', async ({ request }) => {
    await initializeFixtures()
    
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const employeeId = url.searchParams.get('employee_id')

    let filteredAttendance = [...attendanceData]

    // Filter by employee
    if (employeeId) {
      filteredAttendance = filteredAttendance.filter(record => record.employee_id === employeeId)
    }

    // Filter by date range
    if (from) {
      filteredAttendance = filteredAttendance.filter(record => record.date >= from)
    }
    if (to) {
      filteredAttendance = filteredAttendance.filter(record => record.date <= to)
    }

    // Add employee data to each record
    const enrichedAttendance = filteredAttendance.map(record => {
      const employee = employeesData.find(emp => emp.id === record.employee_id)
      return {
        ...record,
        employee: employee ? {
          id: employee.id,
          full_name: employee.full_name,
          dni_last5: employee.dni_last5,
          department_id: employee.department_id
        } : null
      }
    })

    return HttpResponse.json({ data: enrichedAttendance })
  }),

  // Attendance summary/stats
  http.get('/api/attendance/stats', async ({ request }) => {
    await initializeFixtures()
    
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    let filteredAttendance = [...attendanceData]

    if (from) {
      filteredAttendance = filteredAttendance.filter(record => record.date >= from)
    }
    if (to) {
      filteredAttendance = filteredAttendance.filter(record => record.date <= to)
    }

    const stats = {
      totalRecords: filteredAttendance.length,
      presentCount: filteredAttendance.filter(r => r.status === 'present').length,
      lateCount: filteredAttendance.filter(r => r.late_minutes > 0).length,
      avgLateMinutes: filteredAttendance.reduce((acc, r) => acc + (r.late_minutes || 0), 0) / filteredAttendance.length || 0,
      totalLateMinutes: filteredAttendance.reduce((acc, r) => acc + (r.late_minutes || 0), 0),
      avgTotalHours: filteredAttendance.reduce((acc, r) => acc + (r.total_hours || 8), 0) / filteredAttendance.length || 8
    }

    return HttpResponse.json({ data: stats })
  }),

  // Payroll records
  http.get('/api/payroll', async ({ request }) => {
    await initializeFixtures()
    
    const url = new URL(request.url)
    const period = url.searchParams.get('period')
    const half = url.searchParams.get('half')

    if (!payrollData) {
      return HttpResponse.json({ error: 'No payroll data available' }, { status: 404 })
    }

    // Filter by period and half if specified
    if ((period && payrollData.period !== period) || (half && payrollData.half !== half)) {
      return HttpResponse.json({
        data: {
          period: period || payrollData.period,
          half: half || payrollData.half,
          records: [],
          totals: { gross: 0, ihss: 0, rap: 0, isr: 0, net: 0, total_deductions: 0 }
        }
      })
    }

    // Enrich payroll records with employee data
    const enrichedRecords = payrollData.records.map((record: any) => {
      const employee = employeesData.find(emp => emp.id === record.employee_id)
      return {
        ...record,
        employee: employee ? {
          id: employee.id,
          full_name: employee.full_name,
          dni_last5: employee.dni_last5,
          department_id: employee.department_id
        } : null
      }
    })

    return HttpResponse.json({
      data: {
        ...payrollData,
        records: enrichedRecords
      }
    })
  }),

  // Demo-only: Block all write operations
  http.post('/api/employees', () => {
    return HttpResponse.json({ 
      error: 'Solo demo - escritura no permitida',
      message: 'Este es un demo interactivo. Los datos no se pueden modificar.'
    }, { status: 403 })
  }),

  http.put('/api/employees/:id', () => {
    return HttpResponse.json({ 
      error: 'Solo demo - escritura no permitida',
      message: 'Este es un demo interactivo. Los datos no se pueden modificar.'
    }, { status: 403 })
  }),

  http.delete('/api/employees/:id', () => {
    return HttpResponse.json({ 
      error: 'Solo demo - escritura no permitida',
      message: 'Este es un demo interactivo. Los datos no se pueden modificar.'
    }, { status: 403 })
  }),

  http.post('/api/departments', () => {
    return HttpResponse.json({ 
      error: 'Solo demo - escritura no permitida',
      message: 'Este es un demo interactivo. Los datos no se pueden modificar.'
    }, { status: 403 })
  }),

  http.post('/api/attendance/register', () => {
    return HttpResponse.json({ 
      error: 'Solo demo - registro no permitido',
      message: 'Este es un demo interactivo. El registro de asistencia no está disponible.'
    }, { status: 403 })
  }),

  http.post('/api/payroll/generate', () => {
    return HttpResponse.json({ 
      error: 'Solo demo - generación no permitida',
      message: 'Este es un demo interactivo. La generación de nómina no está disponible.'
    }, { status: 403 })
  })
]
