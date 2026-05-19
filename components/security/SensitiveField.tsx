import type { FieldDisplayMode } from '../lib/security/field-access'

type SensitiveFieldProps = {
  label: string
  value?: number | null
  masked?: boolean
  displayMode?: FieldDisplayMode
  formatValue?: (value: number) => string
  className?: string
  valueClassName?: string
}

const DEFAULT_MASK = 'L. *******'

export default function SensitiveField({
  label,
  value,
  masked = false,
  displayMode = 'masked',
  formatValue,
  className = '',
  valueClassName = 'text-green-400 font-medium',
}: SensitiveFieldProps) {
  if (masked && displayMode === 'hidden') {
    return null
  }

  const formatted =
    !masked && value != null && formatValue
      ? formatValue(value)
      : !masked && value != null
        ? String(value)
        : null

  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-400">{label}</label>
      {masked ? (
        displayMode === 'locked' ? (
          <div className={`${valueClassName} flex items-center gap-2 blur-sm select-none`} aria-hidden="true">
            <span>{DEFAULT_MASK}</span>
            <span title="Campo restringido" className="text-white/50 text-xs not-blur">🔒</span>
          </div>
        ) : (
          <div className={valueClassName}>{DEFAULT_MASK}</div>
        )
      ) : (
        <div className={valueClassName}>{formatted ?? '—'}</div>
      )}
    </div>
  )
}
