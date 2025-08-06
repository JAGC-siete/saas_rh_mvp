import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import EmployeeRow from './EmployeeRow'
import type { Employee, Department } from './employeeTypes'

interface EmployeeTableProps {
  employees: Employee[]
  totalCount: number
  searchTerm: string
  departments: Department[]
  formatCurrency: (_amount: number) => string
  getStatusBadge: (_status: string) => JSX.Element
  getAttendanceBadge: (_status: string, _check_in_time?: string) => JSX.Element
  openCertificateModal: (_employee: Employee) => void
  updateEmployeeStatus: (_id: string, _status: string) => void
  fetchData: () => void
}

export default function EmployeeTable({
  employees,
  totalCount,
  searchTerm,
  departments,
  formatCurrency,
  getStatusBadge,
  getAttendanceBadge,
  openCertificateModal,
  updateEmployeeStatus,
  fetchData
}: EmployeeTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>
              {employees.length} of {totalCount} employees activos
            </CardDescription>
          </div>
          <Button
            onClick={fetchData}
            size="sm"
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            🔄 Actualizar Asistencia
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Employee</th>
                <th className="text-left py-3 px-4">Position</th>
                <th className="text-left py-3 px-4">Department</th>
                <th className="text-left py-3 px-4">Salary</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Asistencia</th>
                <th className="text-left py-3 px-4">Horario</th>
                <th className="text-left py-3 px-4">🏆 Puntos</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => (
                <EmployeeRow
                  key={`employee-${index}`}
                  employee={employee}
                  departments={departments}
                  formatCurrency={formatCurrency}
                  getStatusBadge={getStatusBadge}
                  getAttendanceBadge={getAttendanceBadge}
                  openCertificateModal={openCertificateModal}
                  updateEmployeeStatus={updateEmployeeStatus}
                />
              ))}
            </tbody>
          </table>

          {employees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No employees found matching your search.' : 'No employees added yet.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
