import { memo } from 'react'
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

function AddEmployeeForm({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  departments,
  workSchedules,
  loading,
  isEditing = false,
}: AddEmployeeFormProps) {
  // Helper to keep inputs controlled and avoid React warnings
  const v = (value: any) => (value ?? '')

  // Metadata can be string or object from upstream; normalize to string
  const metadataValue =
    typeof formData?.metadata === 'string'
      ? formData.metadata
      : formData?.metadata
      ? JSON.stringify(formData.metadata)
      : ''

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-white">{isEditing ? 'Editar Empleado' : 'Agregar Nuevo Empleado'}</CardTitle>
        <CardDescription className="text-gray-300">
          {isEditing ? 'Modifique la información del empleado' : 'Complete toda la información del empleado'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6" aria-busy={loading}>
          {/* Información Básica */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="employee_code">
                  Código de Empleado *
                </label>
                <Input
                  id="employee_code"
                  name="employee_code"
                  autoComplete="off"
                  disabled={loading}
                  value={v(formData?.employee_code)}
                  onChange={(e) => onFormChange('employee_code', e.target.value)}
                  placeholder="EMP001"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="dni">
                  DNI *
                </label>
                <Input
                  id="dni"
                  name="dni"
                  autoComplete="off"
                  inputMode="numeric"
                  disabled={loading}
                  value={v(formData?.dni)}
                  onChange={(e) => onFormChange('dni', e.target.value)}
                  placeholder="0801-1990-12345"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="name">
                  Nombre Completo *
                </label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  disabled={loading}
                  value={v(formData?.name)}
                  onChange={(e) => onFormChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="email">
                  Correo Electrónico
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  disabled={loading}
                  value={v(formData?.email)}
                  onChange={(e) => onFormChange('email', e.target.value)}
                  placeholder="john@company.com"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="phone">
                  Teléfono
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  disabled={loading}
                  value={v(formData?.phone)}
                  onChange={(e) => onFormChange('phone', e.target.value)}
                  placeholder="+504 9999-9999"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="role">
                  Rol
                </label>
                <Input
                  id="role"
                  name="role"
                  autoComplete="organization-title"
                  disabled={loading}
                  value={v(formData?.role)}
                  onChange={(e) => onFormChange('role', e.target.value)}
                  placeholder="Desarrollador"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="team">
                  Equipo
                </label>
                <Input
                  id="team"
                  name="team"
                  autoComplete="off"
                  disabled={loading}
                  value={v(formData?.team)}
                  onChange={(e) => onFormChange('team', e.target.value)}
                  placeholder="Frontend"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Información Laboral</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="department_id">
                  Departamento
                </label>
                <select
                  id="department_id"
                  name="department_id"
                  disabled={loading}
                  value={v(formData?.department_id)}
                  onChange={(e) => onFormChange('department_id', e.target.value)}
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                >
                  <option value="" className="bg-brand-900 text-white">
                    Seleccionar Departamento ({departments.length} disponibles)
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id} className="bg-brand-900 text-white">
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="work_schedule_id">
                  Horario de Trabajo
                </label>
                <select
                  id="work_schedule_id"
                  name="work_schedule_id"
                  disabled={loading}
                  value={v(formData?.work_schedule_id)}
                  onChange={(e) => onFormChange('work_schedule_id', e.target.value)}
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                >
                  <option value="" className="bg-brand-900 text-white">
                    Seleccionar Horario ({workSchedules.length} disponibles)
                  </option>
                  {workSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id} className="bg-brand-900 text-white">
                      {schedule.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="base_salary">
                  Salario Base (HNL) *
                </label>
                <Input
                  id="base_salary"
                  name="base_salary"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  disabled={loading}
                  value={v(formData?.base_salary)}
                  onChange={(e) => onFormChange('base_salary', e.target.value)}
                  placeholder="25000.00"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="hire_date">
                  Fecha de Contratación
                </label>
                <Input
                  id="hire_date"
                  name="hire_date"
                  type="date"
                  disabled={loading}
                  value={v(formData?.hire_date)}
                  onChange={(e) => onFormChange('hire_date', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="termination_date">
                  Fecha de Terminación
                </label>
                <Input
                  id="termination_date"
                  name="termination_date"
                  type="date"
                  disabled={loading}
                  value={v(formData?.termination_date)}
                  onChange={(e) => onFormChange('termination_date', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="status">
                  Estado
                </label>
                <select
                  id="status"
                  name="status"
                  disabled={loading}
                  value={v(formData?.status)}
                  onChange={(e) => onFormChange('status', e.target.value)}
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                >
                  <option value="active" className="bg-brand-900 text-white">Activo</option>
                  <option value="inactive" className="bg-brand-900 text-white">Inactivo</option>
                  <option value="terminated" className="bg-brand-900 text-white">Terminado</option>
                  <option value="on_leave" className="bg-brand-900 text-white">En Permiso</option>
                </select>
              </div>
            </div>
          </div>

          {/* Información Bancaria */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Información Bancaria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="bank_name">
                  Nombre del Banco
                </label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  autoComplete="organization"
                  disabled={loading}
                  value={v(formData?.bank_name)}
                  onChange={(e) => onFormChange('bank_name', e.target.value)}
                  placeholder="Banco Atlántida"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="bank_account">
                  Cuenta Bancaria
                </label>
                <Input
                  id="bank_account"
                  name="bank_account"
                  autoComplete="off"
                  disabled={loading}
                  value={v(formData?.bank_account)}
                  onChange={(e) => onFormChange('bank_account', e.target.value)}
                  placeholder="12345678901"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Contacto de Emergencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="emergency_contact_name">
                  Nombre del Contacto de Emergencia
                </label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  autoComplete="off"
                  disabled={loading}
                  value={v(formData?.emergency_contact_name)}
                  onChange={(e) => onFormChange('emergency_contact_name', e.target.value)}
                  placeholder="María Doe"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="emergency_contact_phone">
                  Teléfono del Contacto de Emergencia
                </label>
                <Input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  type="tel"
                  autoComplete="off"
                  disabled={loading}
                  value={v(formData?.emergency_contact_phone)}
                  onChange={(e) => onFormChange('emergency_contact_phone', e.target.value)}
                  placeholder="+504 8888-8888"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Dirección</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="address">
                  Dirección Completa
                </label>
                <Textarea
                  id="address"
                  name="address"
                  disabled={loading}
                  value={v(formData?.address)}
                  onChange={(e) => onFormChange('address', e.target.value)}
                  placeholder="Colonia Los Laureles, Calle Principal #123, Tegucigalpa, Honduras"
                  rows={3}
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Información Adicional</h3>
            <div>
              <label className="block text-sm font-medium text-white mb-1" htmlFor="metadata">
                Metadatos (JSON)
              </label>
              <Textarea
                id="metadata"
                name="metadata"
                disabled={loading}
                value={metadataValue}
                onChange={(e) => onFormChange('metadata', e.target.value)}
                placeholder='{"skills": ["React", "Node.js"], "certifications": ["AWS"]}'
                rows={3}
                className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">Información adicional en formato JSON</p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1 bg-brand-800 hover:bg-brand-700 text-white">
              {loading
                ? isEditing
                  ? 'Actualizando...'
                  : 'Agregando...'
                : isEditing
                ? 'Actualizar Empleado'
                : 'Agregar Empleado'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1 border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default memo(AddEmployeeForm)
// Memoize to avoid unnecessary re-renders