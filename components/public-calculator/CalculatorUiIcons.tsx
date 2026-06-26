import type { ReactNode } from 'react'
import {
  UserIcon,
  BuildingOffice2Icon,
  ClockIcon,
  BoltIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

export const calcIconClass = {
  xs: 'w-3.5 h-3.5 shrink-0',
  sm: 'w-4 h-4 shrink-0',
  md: 'w-6 h-6 shrink-0',
  lg: 'w-7 h-7 shrink-0',
}

export function CalcEmployeeIcon({ className = calcIconClass.lg }: { className?: string }) {
  return <UserIcon className={className} aria-hidden />
}

export function CalcCompanyIcon({ className = calcIconClass.lg }: { className?: string }) {
  return <BuildingOffice2Icon className={className} aria-hidden />
}

export function CalcClockIcon({ className = calcIconClass.sm }: { className?: string }) {
  return <ClockIcon className={className} aria-hidden />
}

export function CalcBoltIcon({ className = calcIconClass.sm }: { className?: string }) {
  return <BoltIcon className={className} aria-hidden />
}

export function CalcCheckIcon({
  className = calcIconClass.sm,
  solid = false,
}: {
  className?: string
  solid?: boolean
}) {
  const Icon = solid ? CheckCircleSolidIcon : CheckCircleIcon
  return <Icon className={className} aria-hidden />
}

export function CalcShieldIcon({ className = calcIconClass.lg }: { className?: string }) {
  return <ShieldCheckIcon className={className} aria-hidden />
}

export function CalcWarningIcon({ className = calcIconClass.sm }: { className?: string }) {
  return <ExclamationTriangleIcon className={className} aria-hidden />
}

export function CalcRocketIcon({ className = calcIconClass.sm }: { className?: string }) {
  return <RocketLaunchIcon className={className} aria-hidden />
}

export function CalcDocumentIcon({ className = calcIconClass.md }: { className?: string }) {
  return <DocumentTextIcon className={className} aria-hidden />
}

export function CalcStepMarker({ done }: { done: boolean }) {
  if (done) {
    return <CheckCircleIcon className={`${calcIconClass.sm} text-green-400`} aria-hidden />
  }
  return <span className="w-4 h-4 shrink-0 rounded-full border-2 border-brand-400/40" aria-hidden />
}

export function CalcIconTextRow({
  icon,
  children,
  className = '',
}: {
  icon: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {icon}
      <span>{children}</span>
    </span>
  )
}

export function CalcTrustLine({
  children,
  className = 'text-xs text-brand-300/80',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={`inline-flex items-start gap-1.5 ${className}`}>
      <CheckCircleIcon className={`${calcIconClass.sm} text-green-400 mt-0.5`} aria-hidden />
      <span>{children}</span>
    </p>
  )
}

export function CalcSpeedComparison({
  manualLabel,
  sisuLabel,
  className = 'mb-5 text-xs sm:text-sm',
}: {
  manualLabel: string
  sisuLabel: string
  className?: string
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      <div className="glass rounded-xl p-3 border border-white/10">
        <p className="text-brand-300/70 mb-1">Cálculo manual (Excel)</p>
        <p className="text-brand-200 inline-flex items-center gap-1.5">
          <CalcClockIcon className="text-brand-300/80" />
          {manualLabel}
        </p>
      </div>
      <div className="glass rounded-xl p-3 border border-green-500/20 bg-green-500/5">
        <p className="text-green-300/80 mb-1">Motor legal SISU</p>
        <p className="text-green-200 font-medium inline-flex items-center gap-1.5">
          <CalcBoltIcon className="text-green-300" />
          {sisuLabel}
        </p>
      </div>
    </div>
  )
}

export function CalcPdfSentMessage({
  children,
  className = 'text-sm text-green-300 text-center sm:text-left',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={`inline-flex items-center gap-1.5 ${className}`}>
      <CalcCheckIcon className="text-green-400" solid />
      <span>{children}</span>
    </p>
  )
}

export function CalcCopiedButtonLabel({ copied }: { copied: boolean }) {
  if (!copied) return <>Copiar mensaje</>
  return (
    <CalcIconTextRow icon={<CalcCheckIcon className="text-green-400" />}>
      Copiado
    </CalcIconTextRow>
  )
}
