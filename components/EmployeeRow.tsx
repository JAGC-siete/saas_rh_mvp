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
    id: string
    name: string
    monday_start?: string
    monday_end?: string
    tuesday_start?: string
    tuesday_end?: string
    wednesday_start?: string
    wednesday_end?: string
    thursday_start?: string
    thursday_end?: string
    friday_start?: string
    friday_end?: string
    saturday_start?: string
    saturday_end?: string
    sunday_start?: string
    sunday_end?: string
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
                {employee.work_schedule.name}
              </div>
              <div className="text-gray-500 text-xs">
                {(() => {
                  const today = new Date()
                  const dayOfWeek = today.getDay()
                  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                  const dayName = dayNames[dayOfWeek]
                  const startTime = employee.work_schedule[`${dayName}_start` as keyof typeof employee.work_schedule]
                  const endTime = employee.work_schedule[`${dayName}_end` as keyof typeof employee.work_schedule]
                  
                  if (startTime && endTime) {
                    return `Hoy: ${startTime} - ${endTime}`
                  }
                  
                  // Mostrar el primer horario disponible
                  for (const day of dayNames) {
                    const start = employee.work_schedule[`${day}_start` as keyof typeof employee.work_schedule]
                    const end = employee.work_schedule[`${day}_end` as keyof typeof employee.work_schedule]
                    if (start && end) {
                      return `Ej: ${start} - ${end}`
                    }
                  }
                  
                  return 'Horarios configurados'
                })()}
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