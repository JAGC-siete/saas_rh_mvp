import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface Department {
  id: string
  name: string
}

interface WorkSchedule {
  id: string
  name: string
}

interface AddEmployeeFormProps {
  formData: any
  onFormChange: (field: string, value: any) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  departments: Department[]
  workSchedules: WorkSchedule[]
  loading: boolean
}

export default function AddEmployeeForm({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  departments,
  workSchedules,
  loading,
}: AddEmployeeFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar Nuevo Empleado</CardTitle>
        <CardDescription>Ingrese la información del empleado</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de Empleado
            </label>
            <Input
              value={formData.employee_code}
              onChange={(e) => onFormChange('employee_code', e.target.value)}
              placeholder="EMP001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DNI
            </label>
            <Input
              value={formData.dni}
              onChange={(e) => onFormChange('dni', e.target.value)}
              placeholder="0801-1990-12345"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <Input
              value={formData.name}
              onChange={(e) => onFormChange('name', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => onFormChange('email', e.target.value)}
              placeholder="john@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => onFormChange('phone', e.target.value)}
              placeholder="+504 9999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Posición
            </label>
            <Input
              value={formData.position}
              onChange={(e) => onFormChange('position', e.target.value)}
              placeholder="Software Developer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departamento
            </label>
            <select
              value={formData.department_id}
              onChange={(e) => onFormChange('department_id', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar Departamento</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Horario de Trabajo
            </label>
            <select
              value={formData.work_schedule_id}
              onChange={(e) => onFormChange('work_schedule_id', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar Horario</option>
              {workSchedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salario Base (HNL)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.base_salary}
              onChange={(e) => onFormChange('base_salary', e.target.value)}
              placeholder="25000.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Contratación
            </label>
            <Input
              type="date"
              value={formData.hire_date}
              onChange={(e) => onFormChange('hire_date', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Banco
            </label>
            <Input
              value={formData.bank_name}
              onChange={(e) => onFormChange('bank_name', e.target.value)}
              placeholder="Banco Atlántida"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuenta Bancaria
            </label>
            <Input
              value={formData.bank_account}
              onChange={(e) => onFormChange('bank_account', e.target.value)}
              placeholder="12345678901"
            />
          </div>

          <div className="md:col-span-2 flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Agregando...' : 'Agregar Empleado'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
