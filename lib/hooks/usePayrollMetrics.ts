// Centralized payroll metrics calculations
// Eliminates duplication and provides consistent calculations

import { useMemo } from 'react'

export interface PayrollMetrics {
  activeEmployees: number
  totalGrossSalary: number
  totalDeductions: number
  totalNetSalary: number
  totalIHSS: number
  totalRAP: number
  totalISR: number
  totalDaysWorked: number
  payrollCoverage: number
  attendanceRate: number
  averageSalary: number
  departmentBreakdown: Record<string, { 
    count: number
    name: string
    avgSalary: number
    totalSalary: number
  }>
}

export const usePayrollMetrics = (planilla: any[]): PayrollMetrics => {
  return useMemo(() => {
    if (!planilla.length) {
      return {
        activeEmployees: 0,
        totalGrossSalary: 0,
        totalDeductions: 0,
        totalNetSalary: 0,
        totalIHSS: 0,
        totalRAP: 0,
        totalISR: 0,
        totalDaysWorked: 0,
        payrollCoverage: 0,
        attendanceRate: 0,
        averageSalary: 0,
        departmentBreakdown: {}
      }
    }

    // Core calculations
    const totalGrossSalary = planilla.reduce((sum, line) => sum + (line.total_earnings || 0), 0)
    const totalIHSS = planilla.reduce((sum, line) => sum + (line.IHSS || 0), 0)
    const totalRAP = planilla.reduce((sum, line) => sum + (line.RAP || 0), 0)
    const totalISR = planilla.reduce((sum, line) => sum + (line.ISR || 0), 0)
    const totalDeductions = totalIHSS + totalRAP + totalISR
    const totalNetSalary = totalGrossSalary - totalDeductions
    const totalDaysWorked = planilla.reduce((sum, line) => sum + (line.days_worked || 0), 0)
    
    // Additional calculations
    const activeEmployees = planilla.length
    const averageSalary = activeEmployees > 0 ? totalGrossSalary / activeEmployees : 0
    const payrollCoverage = activeEmployees > 0 ? 100 : 0
    
    // Department breakdown
    const departmentBreakdown = planilla.reduce((acc, line) => {
      const dept = line.department || 'Sin Departamento'
      if (!acc[dept]) {
        acc[dept] = { count: 0, name: dept, avgSalary: 0, totalSalary: 0 }
      }
      acc[dept].count++
      acc[dept].totalSalary += (line.total_earnings || 0)
      acc[dept].avgSalary = acc[dept].totalSalary / acc[dept].count
      return acc
    }, {} as Record<string, { count: number, name: string, avgSalary: number, totalSalary: number }>)

    return {
      activeEmployees,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
      totalIHSS,
      totalRAP,
      totalISR,
      totalDaysWorked,
      payrollCoverage,
      attendanceRate: 100, // Placeholder - will be calculated with real attendance data
      averageSalary,
      departmentBreakdown
    }
  }, [planilla])
}
