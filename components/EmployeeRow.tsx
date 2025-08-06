import React from 'react'
import { Button } from './ui/button'

interface Employee {
  id: string
  company_id: string
  employee_code: string
  dni: string
  name: string
  email: string
  phone: string
  role: string
  position: string
  base_salary: number
  hire_date: string
  status: string
  bank_name: string
  bank_account: string
  department_id?: string
  department_name?: string
  attendance_status?: 'present' | 'absent' | 'late' | 'not_registered'
  check_in_time?: string
  check_out_time?: string
  work_schedule?: {
    start_time: string
    end_time: string
  }
  gamification?: {
    total_points: number
    weekly_points: number
    monthly_points: number
    achievements_count: number
  }
}

interface EmployeeRowProps {
  employee: Employee
  onUpdateStatus: (employeeId: string, status: string) => Promise<void>
  onOpenCertificateModal: (employee: Employee) => void
  formatCurrency: (amount: number) => string
  getStatusBadge: (status: string) => React.JSX.Element
  getAttendanceBadge: (attendance_status: string, check_in_time?: string) => React.JSX.Element
}

export default function EmployeeRow({
  employee,
  onUpdateStatus,
  onOpenCertificateModal,
  formatCurrency,
  getStatusBadge,
  getAttendanceBadge,
}: EmployeeRowProps) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4">
        <div>
          <div className="font-medium">{employee.name}</div>
          <div className="text-sm text-gray-500">
            {employee.employee_code} • DNI: {employee.dni}
          </div>
          <div className="text-sm text-gray-500">
            {employee.email || 'Sin email'} • {employee.phone || 'Sin teléfono'}
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="font-medium">{employee.position}</div>
        <div className="text-sm text-gray-500 capitalize">{employee.role}</div>
      </td>
      <td className="py-3 px-4">{employee.department_name}</td>
      <td className="py-3 px-4 font-mono">
        {formatCurrency(employee.base_salary)}
      </td>
      <td className="py-3 px-4">{getStatusBadge(employee.status)}</td>
      <td className="py-3 px-4">
        {getAttendanceBadge(
          employee.attendance_status || 'not_registered',
          employee.check_in_time
        )}
      </td>
      <td className="py-3 px-4">
        <div className="text-sm">
          {employee.work_schedule ? (
            <>
              <div className="font-medium">
                Entrada: {employee.work_schedule.start_time}
              </div>
              <div className="text-gray-500">
                Salida: {employee.work_schedule.end_time}
              </div>
            </>
          ) : (
            <span className="text-gray-400">Sin horario</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Total:</span>
            <span className="font-mono font-bold text-blue-600">
              {employee.gamification?.total_points || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Semana:</span>
            <span className="font-mono font-bold text-green-600">
              {employee.gamification?.weekly_points || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Logros:</span>
            <span className="font-mono font-bold text-purple-600">
              {employee.gamification?.achievements_count || 0}
            </span>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenCertificateModal(employee)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            📄 Constancia
          </Button>
          {employee.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(employee.id, 'inactive')}
            >
              Desactivar
            </Button>
          )}
          {employee.status === 'inactive' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(employee.id, 'active')}
            >
              Activar
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}