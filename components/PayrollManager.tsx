

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface PayrollRecord {
  id: string
  employee_id: string
  period_start: string
  period_end: string
  period_type: string
  base_salary: number
  gross_salary: number
  income_tax: number
  professional_tax: number
  social_security: number
  total_deductions: number
  net_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  status: string
  created_at: string
  employees: {
    name: string
    employee_code: string
    position: string
  }
}

interface Employee {
  id: string
  name: string
  employee_code: string
  base_salary: number
}

export default function PayrollManager() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)

  // Form state
  const [generateForm, setGenerateForm] = useState({
    employee_id: '',
    period_start: '',
    period_end: '',
    period_type: 'monthly'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setUserProfile(profile)
      if (!profile) return

      // Fetch payroll records
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll_records')
        .select(`
          *,
          employees:employee_id (
            name,
            employee_code,
            position
          )
        `)
        .eq('employees.company_id', profile.company_id)
        .order('created_at', { ascending: false })

      if (payrollError) throw payrollError
      setPayrollRecords(payrollData || [])

      // Fetch employees for generation form
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, name, employee_code, base_salary')
        .eq('company_id', profile.company_id)
        .eq('status', 'active')
        .order('name')

      if (empError) throw empError
      setEmployees(employeesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePayroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate payroll')
      }

      alert('Payroll generated successfully!')
      setShowGenerateForm(false)
      setGenerateForm({
        employee_id: '',
        period_start: '',
        period_end: '',
        period_type: 'monthly'
      })
      fetchData()

    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const approvePayroll = async (payrollId: string) => {
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userProfile?.employee_id 
        })
        .eq('id', payrollId)

      if (error) throw error
      fetchData()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const markAsPaid = async (payrollId: string) => {
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', payrollId)

      if (error) throw error
      fetchData()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'draft':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Draft</span>
      case 'approved':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Approved</span>
      case 'paid':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Paid</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>
    }
  }

  const filteredRecords = selectedPeriod 
    ? payrollRecords.filter(record => 
        record.period_start.startsWith(selectedPeriod)
      )
    : payrollRecords

  // Calculate totals
  const totals = filteredRecords.reduce((acc, record) => {
    acc.grossSalary += record.gross_salary
    acc.totalDeductions += record.total_deductions
    acc.netSalary += record.net_salary
    return acc
  }, { grossSalary: 0, totalDeductions: 0, netSalary: 0 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600">Manage employee payroll and salary calculations</p>
        </div>
        <Button onClick={() => setShowGenerateForm(true)}>
          Generate Payroll
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.grossSalary)}
              </div>
              <div className="text-sm text-gray-600">Total Gross Salary</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.totalDeductions)}
              </div>
              <div className="text-sm text-gray-600">Total Deductions</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totals.netSalary)}
              </div>
              <div className="text-sm text-gray-600">Total Net Salary</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {filteredRecords.length}
              </div>
              <div className="text-sm text-gray-600">Payroll Records</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Period
              </label>
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPeriod('')}
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Payroll Form */}
      {showGenerateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Payroll</CardTitle>
            <CardDescription>
              Generate payroll for an employee for a specific period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generatePayroll} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={generateForm.employee_id}
                  onChange={(e) => setGenerateForm({...generateForm, employee_id: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {/* eslint-disable-next-line react/jsx-key */}
                  {employees.map((emp, index) => (
                    <option key={`emp-${index}`} value={emp.id}>
                      {emp.name} ({emp.employee_code}) - {formatCurrency(emp.base_salary)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period Type
                </label>
                <select
                  value={generateForm.period_type}
                  onChange={(e) => setGenerateForm({...generateForm, period_type: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period Start
                </label>
                <Input
                  type="date"
                  value={generateForm.period_start}
                  onChange={(e) => setGenerateForm({...generateForm, period_start: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period End
                </label>
                <Input
                  type="date"
                  value={generateForm.period_end}
                  onChange={(e) => setGenerateForm({...generateForm, period_end: e.target.value})}
                  required
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Payroll'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowGenerateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payroll Records */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>
            {filteredRecords.length} records
            {selectedPeriod && ` for ${new Date(selectedPeriod + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Employee</th>
                  <th className="text-left py-3 px-4">Period</th>
                  <th className="text-left py-3 px-4">Gross Salary</th>
                  <th className="text-left py-3 px-4">Deductions</th>
                  <th className="text-left py-3 px-4">Net Salary</th>
                  <th className="text-left py-3 px-4">Attendance</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line react/jsx-key */}
                {filteredRecords.map((record, index) => (
                  <tr key={`record-${index}`} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{record.employees?.name}</div>
                        <div className="text-sm text-gray-500">
                          {record.employees?.employee_code} • {record.employees?.position}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div>{new Date(record.period_start).toLocaleDateString()}</div>
                        <div className="text-gray-500">to {new Date(record.period_end).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400 capitalize">{record.period_type}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {formatCurrency(record.gross_salary)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-mono">
                        <div>ISR: {formatCurrency(record.income_tax)}</div>
                        <div>RAP: {formatCurrency(record.professional_tax)}</div>
                        <div>IHSS: {formatCurrency(record.social_security)}</div>
                        <div className="font-semibold border-t pt-1">
                          Total: {formatCurrency(record.total_deductions)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-green-600">
                      {formatCurrency(record.net_salary)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div>Worked: {record.days_worked} days</div>
                        <div className="text-red-600">Absent: {record.days_absent} days</div>
                        <div className="text-yellow-600">Late: {record.late_days} days</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {record.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approvePayroll(record.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {record.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => markAsPaid(record.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {/* TODO: Generate PDF */}}
                        >
                          Download PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No payroll records found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
