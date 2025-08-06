import { Button } from './ui/button'
import type { Employee, Department } from './employeeTypes'

interface EmployeeRowProps {
  employee: Employee
  departments: Department[]
  formatCurrency: (_amount: number) => string
  getStatusBadge: (_status: string) => JSX.Element
  getAttendanceBadge: (_status: string, _check_in_time?: string) => JSX.Element
  openCertificateModal: (_employee: Employee) => void
  updateEmployeeStatus: (_id: string, _status: string) => void
}

export default function EmployeeRow({
  employee,
  departments,
  formatCurrency,
  getStatusBadge,
  getAttendanceBadge,
  openCertificateModal,
  updateEmployeeStatus
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
            {employee.email} • {employee.phone}
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="font-medium">{employee.position}</div>
        <div className="text-sm text-gray-500 capitalize">{employee.role}</div>
      </td>
      <td className="py-3 px-4">
        {employee.department_id
          ? departments.find(d => d.id === employee.department_id)?.name || 'No Department'
          : 'No Department'}
      </td>
      <td className="py-3 px-4 font-mono">
        {formatCurrency(employee.base_salary)}
      </td>
      <td className="py-3 px-4">
        {getStatusBadge(employee.status)}
      </td>
      <td className="py-3 px-4">
        {getAttendanceBadge(employee.attendance_status || 'not_registered', employee.check_in_time)}
      </td>
      <td className="py-3 px-4">
        <div className="text-sm">
          {employee.work_schedule ? (
            <>
              <div className="font-medium">Entrada: {employee.work_schedule.start_time}</div>
              <div className="text-gray-500">Salida: {employee.work_schedule.end_time}</div>
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
            onClick={() => openCertificateModal(employee)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            📄 Constancia
          </Button>
          {employee.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateEmployeeStatus(employee.id, 'inactive')}
            >
              Deactivate
            </Button>
          )}
          {employee.status === 'inactive' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateEmployeeStatus(employee.id, 'active')}
            >
              Activate
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
