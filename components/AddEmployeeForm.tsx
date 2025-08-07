import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'

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
  isEditing?: boolean
}

export default function AddEmployeeForm({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  departments,
  workSchedules,
  loading,
  isEditing = false,
}: AddEmployeeFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Empleado' : 'Agregar Nuevo Empleado'}</CardTitle>
        <CardDescription>{isEditing ? 'Modifique la información del empleado' : 'Complete toda la información del empleado'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Información Básica */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Empleado *
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
                  DNI *
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
                  Nombre Completo *
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
                  Rol
                </label>
                <Input
                  value={formData.role}
                  onChange={(e) => onFormChange('role', e.target.value)}
                  placeholder="Desarrollador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipo
                </label>
                <Input
                  value={formData.team}
                  onChange={(e) => onFormChange('team', e.target.value)}
                  placeholder="Frontend"
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
                />
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => onFormChange('department_id', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar Horario</option>
                  {workSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salario Base (HNL) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Terminación
                </label>
                <Input
                  type="date"
                  value={formData.termination_date}
                  onChange={(e) => onFormChange('termination_date', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => onFormChange('status', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="terminated">Terminado</option>
                  <option value="on_leave">En Permiso</option>
                </select>
              </div>
            </div>
          </div>

          {/* Información Bancaria */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Bancaria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto de Emergencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Contacto de Emergencia
                </label>
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => onFormChange('emergency_contact_name', e.target.value)}
                  placeholder="María Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono del Contacto de Emergencia
                </label>
                <Input
                  value={formData.emergency_contact_phone}
                  onChange={(e) => onFormChange('emergency_contact_phone', e.target.value)}
                  placeholder="+504 8888-8888"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dirección</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección Completa
                </label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => onFormChange('address', e.target.value)}
                  placeholder="Colonia Los Laureles, Calle Principal #123, Tegucigalpa, Honduras"
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metadatos (JSON)
              </label>
              <Textarea
                value={formData.metadata}
                onChange={(e) => onFormChange('metadata', e.target.value)}
                placeholder='{"skills": ["React", "Node.js"], "certifications": ["AWS"]}'
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Información adicional en formato JSON</p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (isEditing ? 'Actualizando...' : 'Agregando...') : (isEditing ? 'Actualizar Empleado' : 'Agregar Empleado')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
