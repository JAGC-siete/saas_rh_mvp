import { type ReactNode } from 'react'

interface BorderBeamProps {
  children: ReactNode
  className?: string
}

export default function BorderBeam({ children, className = '' }: BorderBeamProps) {
  return (
    <div className={`border-beam rounded-2xl ${className}`}>
      {children}
    </div>
  )
}
