import React from 'react'

export interface EmployeeCellProps {
  name: string
  dni?: string | null
  subtitle?: string | null
  className?: string
  nameClassName?: string
  dniClassName?: string
  subtitleClassName?: string
}

/**
 * Nombre + DNI (+ línea opcional) para tablas de permisos y asistencia.
 */
export default function EmployeeCell({
  name,
  dni,
  subtitle,
  className = '',
  nameClassName = 'text-sm font-medium text-white',
  dniClassName = 'text-sm text-gray-300',
  subtitleClassName = 'text-xs text-gray-400',
}: EmployeeCellProps) {
  return (
    <div className={className}>
      <div className={nameClassName}>{name}</div>
      {dni ? <div className={dniClassName}>DNI: {dni}</div> : null}
      {subtitle ? <div className={subtitleClassName}>{subtitle}</div> : null}
    </div>
  )
}
