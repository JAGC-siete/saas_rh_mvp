import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import EmployeeFileUpload from './EmployeeFileUpload'
import { HONDURAS_LABOR_FACTOR } from '../lib/payroll/constants'
import { TERMINATION_REASON_OPTIONS } from '../lib/employees/termination-reasons'

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
  employeeId?: string // Required for file upload
  onProfileImageUploaded?: (fileId: string, storagePath: string) => void
  onProfileImageError?: (error: string) => void
  /** Company calculation_mode for dynamic "Predeterminado de la empresa" label */
  companyCalculationMode?: 'daily' | 'hourly' | 'admin_floor'
  canEditSalary?: boolean
  canViewSalary?: boolean
  /** Solo Enlace: código auto = inicial + últimos 5 del DNI */
  autoGenerateEmployeeCode?: boolean
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
  employeeId,
  onProfileImageUploaded,
  onProfileImageError,
  companyCalculationMode = 'daily',
  canEditSalary = true,
  autoGenerateEmployeeCode = false,
}: AddEmployeeFormProps) {
  const t = useTranslations('employees.form')
  const te = useTranslations('employees')
  const tc = useTranslations('common')
  const bold = { b: (chunks: React.ReactNode) => <strong>{chunks}</strong> }
  // Helper to keep inputs controlled and avoid React warnings
  const v = (value: any) => (value ?? '')

  const resolvedPayType =
    v(formData?.pay_type) === ''
      ? companyCalculationMode === 'hourly'
        ? 'hourly'
        : companyCalculationMode === 'admin_floor'
          ? 'admin_floor'
          : 'fixed'
      : v(formData?.pay_type) || 'fixed'

  const defaultPayTypeLabel =
    companyCalculationMode === 'hourly'
      ? t('payTypeDefaultHourly')
      : companyCalculationMode === 'admin_floor'
        ? t('payTypeDefaultAdminFloor')
        : t('payTypeDefaultFixed')

  const handleSubmit = (e: React.FormEvent) => {
    const payType = resolvedPayType
    const baseSalary = Number(formData?.base_salary) || 0
    if ((payType === 'hourly' || payType === 'admin_floor') && baseSalary > 0 && baseSalary < 2000) {
      e.preventDefault()
      return
    }
    onSubmit(e)
  }

  // Metadata can be string or object from upstream; normalize to string
  const metadataValue =
    typeof formData?.metadata === 'string'
      ? formData.metadata
      : formData?.metadata
      ? JSON.stringify(formData.metadata, null, 2)
      : ''

  // Address can be string or object; normalize to string
  const addressValue =
    typeof formData?.address === 'string'
      ? formData.address
      : formData?.address && typeof formData.address === 'object'
        ? Object.values(formData.address as Record<string, unknown>).filter(Boolean).join(', ')
        : ''

  return (
    <Card variant="liquid">
      <CardHeader>
        <CardTitle className="text-white">{isEditing ? t('titleEdit') : t('titleNew')}</CardTitle>
        <CardDescription className="text-gray-300">
          {isEditing ? t('descEdit') : t('descNew')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading}>
          {/* Información Básica */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">{t('basicInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="employee_code">
                  {t('employeeCode')}
                </label>
                <Input
                  id="employee_code"
                  name="employee_code"
                  autoComplete="off"
                  disabled={loading || (autoGenerateEmployeeCode && !isEditing)}
                  readOnly={autoGenerateEmployeeCode && !isEditing}
                  value={v(formData?.employee_code)}
                  onChange={(e) => onFormChange('employee_code', e.target.value)}
                  placeholder={autoGenerateEmployeeCode ? 'J00731' : 'EMP001'}
                  required={!(autoGenerateEmployeeCode && !isEditing)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
                {autoGenerateEmployeeCode && !isEditing ? (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('autoCodeHint')}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="dni">
                  {t('dni')}
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
                  {t('fullName')}
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
                  {t('email')}
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
                  {t('phone')}
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
                  {t('role')}
                </label>
                <Input
                  id="role"
                  name="role"
                  autoComplete="organization-title"
                  disabled={loading}
                  value={v(formData?.role)}
                  onChange={(e) => onFormChange('role', e.target.value)}
                  placeholder={t('rolePlaceholder')}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="team">
                  {t('team')}
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
            <h3 className="text-lg font-medium text-white mb-4">{t('jobInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="department_id">
                  {t('department')}
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
                    {t('selectDepartment', { count: departments.length })}
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
                  {t('schedule')}
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
                    {t('selectSchedule', { count: workSchedules.length })}
                  </option>
                  {workSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id} className="bg-brand-900 text-white">
                      {schedule.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="pay_type">
                  {t('payType')}
                </label>
                <select
                  id="pay_type"
                  name="pay_type"
                  disabled={loading}
                  value={v(formData?.pay_type)}
                  onChange={(e) => onFormChange('pay_type', e.target.value)}
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                  required
                >
                  <option value="" className="bg-brand-900 text-white">
                    {defaultPayTypeLabel}
                  </option>
                  <option value="fixed" className="bg-brand-900 text-white">
                    {t('payTypeFixed')}
                  </option>
                  <option value="admin_floor" className="bg-brand-900 text-white">
                    {t('payTypeAdminFloor')}
                  </option>
                  <option value="hourly" className="bg-brand-900 text-white">
                    {t('payTypeHourly')}
                  </option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {t.rich('payTypeHelpDefault', bold)}
                  <br />
                  {t.rich('payTypeHelpFixed', bold)}
                  <br />
                  {t.rich('payTypeHelpAdminFloor', bold)}
                  <br />
                  {t.rich('payTypeHelpHourly', bold)}
                </p>
              </div>

              {resolvedPayType === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-1" htmlFor="attendance_required">
                    {t('attendanceControl')}
                  </label>
                  <select
                    id="attendance_required"
                    name="attendance_required"
                    disabled={loading}
                    value={formData?.attendance_required === false ? 'false' : 'true'}
                    onChange={(e) =>
                      onFormChange('attendance_required', e.target.value === 'true')
                    }
                    className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                  >
                    <option value="true" className="bg-brand-900 text-white">
                      {t('attendanceRequired')}
                    </option>
                    <option value="false" className="bg-brand-900 text-white">
                      {t('attendanceExempt')}
                    </option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {t.rich('attendanceHelpRequired', bold)}
                    <br />
                    {t.rich('attendanceHelpExempt', bold)}
                  </p>
                </div>
              )}

              {(resolvedPayType === 'hourly' || resolvedPayType === 'admin_floor') && (
                <div className="md:col-span-2 text-xs text-gray-400">
                  {resolvedPayType === 'admin_floor'
                    ? t('adminFloorNote')
                    : t('hourlyNote')}
                </div>
              )}

              {canEditSalary && (
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="base_salary">
                  {t('baseSalary')}
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
                {resolvedPayType === 'hourly' || resolvedPayType === 'admin_floor' ? (
                  Number(formData?.base_salary) > 0 && (
                  <p className="text-sm text-blue-400 mt-1">
                    {t('hourlyRate', { rate: (Number(formData?.base_salary) / HONDURAS_LABOR_FACTOR).toFixed(2) })}
                  </p>
                  )
                ) : null}
                {(resolvedPayType === 'hourly' || resolvedPayType === 'admin_floor') && Number(formData?.base_salary) > 0 && Number(formData?.base_salary) < 2000 && (
                  <p className="text-sm text-amber-400 mt-1">
                    {t('monthlyEquivalentWarning')}
                  </p>
                )}
              </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="payment_frequency">
                  {t('paymentFrequency')}
                </label>
                <select
                  id="payment_frequency"
                  name="payment_frequency"
                  disabled={loading}
                  value={v(formData?.payment_frequency)}
                  onChange={(e) => onFormChange('payment_frequency', e.target.value)}
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                >
                  <option value="" className="bg-brand-900 text-white">{t('frequencyDefault')}</option>
                  <option value="quincenal" className="bg-brand-900 text-white">{t('frequencyBiweekly')}</option>
                  <option value="mensual" className="bg-brand-900 text-white">{t('frequencyMonthly')}</option>
                  <option value="semanal" className="bg-brand-900 text-white">{t('frequencyWeekly')}</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {t('frequencyHelp')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="pay_overtime">
                  {t('overtime')}
                </label>
                <select
                  id="pay_overtime"
                  name="pay_overtime"
                  disabled={loading}
                  value={formData?.pay_overtime === false ? 'false' : 'true'}
                  onChange={(e) =>
                    onFormChange('pay_overtime', e.target.value === 'true')
                  }
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                >
                  <option value="true" className="bg-brand-900 text-white">
                    {t('yes')}
                  </option>
                  <option value="false" className="bg-brand-900 text-white">
                    {t('no')}
                  </option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {t.rich('overtimeHelpYes', bold)}
                  <br />
                  {t.rich('overtimeHelpNo', bold)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="hire_date">
                  {t('hireDate')}
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
                  {t('terminationDate')}
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
                  {t('status')}
                </label>
                <select
                  id="status"
                  name="status"
                  disabled={loading}
                  value={v(formData?.status)}
                  onChange={(e) => onFormChange('status', e.target.value)}
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                >
                  <option value="active" className="bg-brand-900 text-white">{t('statusActive')}</option>
                  <option value="inactive" className="bg-brand-900 text-white">{t('statusInactive')}</option>
                  <option value="terminated" className="bg-brand-900 text-white">{t('statusTerminated')}</option>
                  <option value="on_leave" className="bg-brand-900 text-white">{t('statusOnLeave')}</option>
                </select>
              </div>

              {v(formData?.status) !== 'active' && v(formData?.status) !== '' && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white mb-1" htmlFor="termination_reason_code">
                      {t('terminationReason')} <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="termination_reason_code"
                      name="termination_reason_code"
                      disabled={loading}
                      value={v(formData?.termination_reason_code)}
                      onChange={(e) => onFormChange('termination_reason_code', e.target.value)}
                      className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white"
                    >
                      <option value="" className="bg-brand-900 text-white">
                        {t('selectReason')}
                      </option>
                      {TERMINATION_REASON_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code} className="bg-brand-900 text-white">
                          {te(`terminationReasons.${opt.code}` as 'terminationReasons.otro')}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">{t('reasonRequiredHint')}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white mb-1" htmlFor="termination_reason_detail">
                      {t('reasonDetail')}
                    </label>
                    <Textarea
                      id="termination_reason_detail"
                      name="termination_reason_detail"
                      disabled={loading}
                      value={v(formData?.termination_reason_detail)}
                      onChange={(e) => onFormChange('termination_reason_detail', e.target.value)}
                      maxLength={2000}
                      rows={3}
                      placeholder={t('reasonDetailPlaceholder')}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Información Bancaria */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">{t('bankInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="bank_name">
                  {t('bankName')}
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
                  {t('bankAccount')}
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
            <h3 className="text-lg font-medium text-white mb-4">{t('emergencyContact')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="emergency_contact_name">
                  {t('emergencyName')}
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
                  {t('emergencyPhone')}
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
            <h3 className="text-lg font-medium text-white mb-4">{t('address')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1" htmlFor="address">
                  {t('fullAddress')}
                </label>
                <Textarea
                  id="address"
                  name="address"
                  disabled={loading}
                  value={addressValue}
                  onChange={(e) => onFormChange('address', e.target.value)}
                  placeholder={t('addressPlaceholder')}
                  rows={3}
                  className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Foto de Perfil - Solo disponible cuando se edita un empleado existente */}
          {employeeId && employeeId !== 'new' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">{t('profilePhoto')}</h3>
              <p className="text-sm text-gray-400 mb-3">
                {isEditing 
                  ? t('profilePhotoReplace')
                  : t('profilePhotoLater')}
              </p>
              <EmployeeFileUpload
                employeeId={employeeId}
                fileType="profile_photo"
                onUploadComplete={(fileId, storagePath) => {
                  // Update form data with the storage path
                  onFormChange('profile_image_path', storagePath)
                  onProfileImageUploaded?.(fileId, storagePath)
                }}
                onUploadError={(error) => {
                  onProfileImageError?.(error)
                }}
                variant="full"
                label={t('uploadProfilePhoto')}
              />
            </div>
          )}

          {/* Información Adicional */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">{t('additionalInfo')}</h3>
            <div>
              <label className="block text-sm font-medium text-white mb-1" htmlFor="metadata">
                {t('metadata')}
              </label>
              <Textarea
                id="metadata"
                name="metadata"
                disabled={loading}
                value={metadataValue}
                onChange={(e) => onFormChange('metadata', e.target.value)}
                placeholder='{
  "skills": ["React", "Node.js", "TypeScript"],
  "certifications": ["AWS", "Google Cloud"],
  "languages": ["Spanish", "English"],
  "notes": "Información adicional del empleado"
}'
                rows={4}
                className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/10 text-white placeholder-gray-400 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                {t('metadataHelp')}
                <br />
                {t.rich('metadataTip', bold)}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1 bg-brand-800 hover:bg-brand-700 text-white">
              {loading
                ? isEditing
                  ? t('updating')
                  : t('adding')
                : isEditing
                ? t('update')
                : t('add')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1 border-white/20 text-white hover:bg-white/10">
              {tc('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default memo(AddEmployeeForm)
// Memoize to avoid unnecessary re-renders